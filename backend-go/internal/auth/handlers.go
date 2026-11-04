// Package auth handles signup with email OTP verification, signin, role choice and the JWT middleware.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"slices"
	"strings"
	"time"

	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/mail"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	otpTTL         = 10 * time.Minute
	otpMaxAttempts = 5
	otpResendGap   = time.Minute
)

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *Tokens
	Mail   *mail.Sender // nil: OTPs are logged instead of emailed (development only)
	// ExposeOTP also returns the OTP in API responses so local testing needs no inbox. Never in production.
	ExposeOTP bool
	Limit     *httpx.Limiter // guards the endpoints that check secrets
}

func (h *Handler) Register(mux *http.ServeMux) {
	lim := h.Limit.Wrap
	mux.HandleFunc("POST /api/auth/signup", lim(h.signup))
	mux.HandleFunc("POST /api/auth/verify-otp", lim(h.verifyOTP))
	mux.HandleFunc("POST /api/auth/resend-otp", lim(h.resendOTP))
	mux.HandleFunc("POST /api/auth/signin", lim(h.signin))
	mux.HandleFunc("GET /api/auth/me", h.Tokens.Require(h.me))
	mux.HandleFunc("PATCH /api/auth/role", h.Tokens.Require(h.chooseRole))
}

type user struct {
	ID         int64     `json:"id"`
	FullName   string    `json:"fullName"`
	Email      *string   `json:"email"`
	Phone      *string   `json:"phone"`
	Role       string    `json:"role"`
	IsVerified bool      `json:"isVerified"`
	Points     int       `json:"points"`
	CreatedAt  time.Time `json:"created_at"`
}

const userCols = `id, full_name, email, phone, role, is_verified, points, created_at`

func scanUser(row pgx.Row) (user, error) {
	var u user
	err := row.Scan(&u.ID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsVerified, &u.Points, &u.CreatedAt)
	return u, err
}

type credentials struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	Token    string `json:"token"` // the OTP
}

func (c *credentials) normalize() {
	c.FullName = strings.TrimSpace(c.FullName)
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
	c.Phone = strings.TrimSpace(c.Phone)
	c.Token = strings.TrimSpace(c.Token)
}

// SelfServiceRoles are the roles a user may pick for themselves; admin is granted in the database.
var SelfServiceRoles = []string{"donor", "volunteer", "organization", "biogas"}

// signup creates an unverified account with role "pending". The role is chosen after verification.
func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	switch {
	case in.FullName == "" || in.Email == "" || in.Password == "":
		httpx.Error(w, http.StatusBadRequest, "Full name, email and password are required")
		return
	case len(in.FullName) > 200 || len(in.Email) > 254 || len(in.Phone) > 30:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case !httpx.ValidEmail(in.Email):
		httpx.Error(w, http.StatusBadRequest, "Email address is not valid")
		return
	case len(in.Password) < 8:
		httpx.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	case len(in.Password) > 72: // bcrypt only reads the first 72 bytes
		httpx.Error(w, http.StatusBadRequest, "Password must be at most 72 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	otp, err := newOTP()
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	var id int64
	err = h.DB.QueryRow(r.Context(), `
		INSERT INTO users (full_name, email, phone, password_hash, role, otp_code, otp_expires_at, otp_sent_at)
		VALUES ($1, $2, NULLIF($3, ''), $4, 'pending', $5, $6, now())
		RETURNING id`,
		in.FullName, in.Email, in.Phone, string(hash), otp, time.Now().Add(otpTTL),
	).Scan(&id)
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "An account with this email or phone already exists. Sign in instead.")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	if err := h.sendOTP(in.Email, otp); err != nil {
		// The account exists; the user can ask for a new code.
		log.Printf("send OTP to user %d: %v", id, err)
		httpx.Error(w, http.StatusBadGateway, "Account created, but we couldn't send the code. Use \"Resend code\".")
		return
	}

	resp := map[string]any{"message": "We sent a 6-digit code to " + in.Email, "userId": id}
	if h.ExposeOTP {
		resp["otp"] = otp
	}
	httpx.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) sendOTP(email, otp string) error {
	if h.Mail == nil {
		log.Printf("OTP for %s: %s (SMTP not configured)", email, otp)
		return nil
	}
	return h.Mail.Send(email, "Your FeedingHands verification code",
		"Your FeedingHands verification code is "+otp+".\n\nIt expires in 10 minutes. If you didn't sign up, ignore this email.\n")
}

func (h *Handler) resendOTP(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Email == "" {
		httpx.Error(w, http.StatusBadRequest, "Email is required")
		return
	}
	otp, err := newOTP()
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	// Only unverified accounts outside the resend gap get a new code. The answer is the same either way,
	// so this endpoint can't be used to find out which emails are registered.
	tag, err := h.DB.Exec(r.Context(), `
		UPDATE users SET otp_code = $2, otp_expires_at = $3, otp_attempts = 0, otp_sent_at = now()
		WHERE email = $1 AND NOT is_verified AND (otp_sent_at IS NULL OR otp_sent_at < $4)`,
		in.Email, otp, time.Now().Add(otpTTL), time.Now().Add(-otpResendGap))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	resp := map[string]any{"message": "If that account is waiting for verification, a new code is on its way."}
	if tag.RowsAffected() == 1 {
		if err := h.sendOTP(in.Email, otp); err != nil {
			log.Printf("resend OTP: %v", err)
			httpx.Error(w, http.StatusBadGateway, "We couldn't send the code, please try again shortly")
			return
		}
		if h.ExposeOTP {
			resp["otp"] = otp
		}
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Token == "" || in.Email == "" {
		httpx.Error(w, http.StatusBadRequest, "Email and code are required")
		return
	}

	var (
		u        user
		attempts int
		wrong    bool
	)
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		var (
			id        int64
			otp       *string
			expiresAt *time.Time
		)
		if err := tx.QueryRow(r.Context(), `
			SELECT id, otp_code, otp_expires_at, otp_attempts FROM users WHERE email = $1 FOR UPDATE`,
			in.Email).Scan(&id, &otp, &expiresAt, &attempts); err != nil {
			return err
		}
		if attempts >= otpMaxAttempts {
			return nil // reported below; the code is burnt until a resend
		}
		if otp == nil || expiresAt == nil || time.Now().After(*expiresAt) ||
			subtle.ConstantTimeCompare([]byte(*otp), []byte(in.Token)) != 1 {
			// Return nil so the transaction commits the bumped counter; an error would roll it back.
			wrong = true
			_, err := tx.Exec(r.Context(), `UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1`, id)
			return err
		}
		var err error
		u, err = scanUser(tx.QueryRow(r.Context(), `
			UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, updated_at = now()
			WHERE id = $1 RETURNING `+userCols, id))
		return err
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows), err == nil && wrong:
		httpx.Error(w, http.StatusBadRequest, "Invalid or expired code")
	case err != nil:
		httpx.Internal(w, r, err)
	case attempts >= otpMaxAttempts:
		httpx.Error(w, http.StatusTooManyRequests, "Too many wrong codes. Request a new code.")
	default:
		h.respondWithToken(w, r, "Email verified", u)
	}
}

func (h *Handler) signin(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Password == "" || (in.Email == "" && in.Phone == "") {
		httpx.Error(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	var hash string
	var u user
	err := h.DB.QueryRow(r.Context(), `
		SELECT password_hash, `+userCols+` FROM users
		WHERE ($1 <> '' AND email = $1) OR ($2 <> '' AND phone = $2)
		LIMIT 1`, in.Email, in.Phone,
	).Scan(&hash, &u.ID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsVerified, &u.Points, &u.CreatedAt)
	// Same answer for unknown user and wrong password, so signin can't be used to probe which accounts exist.
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil) {
		httpx.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	if !u.IsVerified {
		httpx.JSON(w, http.StatusForbidden, map[string]any{"message": "Please verify your email first", "code": "unverified"})
		return
	}
	h.respondWithToken(w, r, "Signin successful", u)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	caller, _ := FromContext(r.Context())
	u, err := scanUser(h.DB.QueryRow(r.Context(), `SELECT `+userCols+` FROM users WHERE id = $1`, caller.ID))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusUnauthorized, "Please sign in again")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

// chooseRole sets the role once, right after signup. Changing it later would let a donor
// become an organization and see other people's pickups, so that needs an admin.
func (h *Handler) chooseRole(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Role string `json:"role"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !slices.Contains(SelfServiceRoles, in.Role) {
		httpx.Error(w, http.StatusBadRequest, "Role must be donor, volunteer, organization or biogas")
		return
	}
	caller, _ := FromContext(r.Context())
	var u user
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		var err error
		u, err = scanUser(tx.QueryRow(r.Context(), `
			UPDATE users SET role = $2, updated_at = now()
			WHERE id = $1 AND role = 'pending' AND is_verified RETURNING `+userCols, caller.ID, in.Role))
		if err != nil {
			return err
		}
		return createProfile(r.Context(), tx, u)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusConflict, "Your role is already set")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	// The role lives in the token, so hand out a fresh one.
	h.respondWithToken(w, r, "Role saved", u)
}

// createProfile gives a new volunteer the profile row pickups are linked to.
// Organizations fill in their own profile (name, address) on the Register page.
func createProfile(ctx context.Context, tx pgx.Tx, u user) error {
	if u.Role != "volunteer" {
		return nil
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO volunteers (user_id, name, email, phone) VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, ''))
		ON CONFLICT (user_id) DO NOTHING`, u.ID, u.FullName, u.Email, u.Phone)
	return err
}

func (h *Handler) respondWithToken(w http.ResponseWriter, r *http.Request, msg string, u user) {
	token, err := h.Tokens.Sign(u.ID, u.Role)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": msg, "access_token": token, "user": u})
}

func newOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}
