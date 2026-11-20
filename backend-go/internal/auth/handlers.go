// Package auth handles signup with email OTP verification, signin, password reset, account settings,
// role choice and the JWT middleware.
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
	mux.HandleFunc("POST /api/auth/forgot-password", lim(h.forgotPassword))
	mux.HandleFunc("POST /api/auth/reset-password", lim(h.resetPassword))
	mux.HandleFunc("GET /api/auth/me", h.Tokens.Require(h.me))
	mux.HandleFunc("PATCH /api/auth/me", lim(h.Tokens.Require(h.updateMe)))
	mux.HandleFunc("DELETE /api/auth/me", lim(h.Tokens.Require(h.deleteMe)))
	mux.HandleFunc("PATCH /api/auth/password", lim(h.Tokens.Require(h.changePassword)))
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
	EmailNotes bool      `json:"emailNotifications"`
	CreatedAt  time.Time `json:"created_at"`
}

const userCols = `id, full_name, email, phone, role, is_verified, points, email_notifications, created_at`

// scanUser reads userCols; extra destinations are for columns selected before them.
func scanUser(row pgx.Row, extra ...any) (user, error) {
	var u user
	dest := append(extra, &u.ID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsVerified, &u.Points, &u.EmailNotes, &u.CreatedAt)
	err := row.Scan(dest...)
	return u, err
}

// passwordProblem returns why p can't be a password, or "".
func passwordProblem(p string) string {
	switch {
	case len(p) < 8:
		return "Password must be at least 8 characters"
	case len(p) > 72: // bcrypt only reads the first 72 bytes
		return "Password must be at most 72 characters"
	}
	return ""
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
	case passwordProblem(in.Password) != "":
		httpx.Error(w, http.StatusBadRequest, passwordProblem(in.Password))
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
	return h.send(email, "Your FeedingHands verification code",
		"Your FeedingHands verification code is "+otp+".\n\nIt expires in 10 minutes. If you didn't sign up, ignore this email.\n")
}

func (h *Handler) send(email, subject, body string) error {
	if h.Mail == nil {
		log.Printf("mail to %s (SMTP not configured): %s\n%s", email, subject, body)
		return nil
	}
	return h.Mail.Send(email, subject, body)
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

	var u user
	var res otpResult
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		// NOT is_verified: a password-reset code must not double as a sign-in code.
		id, check, err := checkOTP(r.Context(), tx, in.Email, in.Token, "NOT is_verified")
		res = check
		if err != nil || check != otpOK {
			return err
		}
		u, err = scanUser(tx.QueryRow(r.Context(), `
			UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, otp_sent_at = NULL,
				updated_at = now()
			WHERE id = $1 RETURNING `+userCols, id)) // otp_sent_at = NULL: a reset code may follow right away
		return err
	})
	if otpFailed(w, r, res, err) {
		return
	}
	h.respondWithToken(w, r, "Email verified", u)
}

type otpResult int

const (
	otpOK otpResult = iota
	otpWrong
	otpBurnt
)

// checkOTP checks code for the account with this email that also matches cond (SQL on users), locking the row.
// A wrong code bumps the counter and returns a nil error, so the caller's transaction commits it.
func checkOTP(ctx context.Context, tx pgx.Tx, email, code, cond string) (int64, otpResult, error) {
	var (
		id        int64
		otp       *string
		expiresAt *time.Time
		attempts  int
	)
	err := tx.QueryRow(ctx, `
		SELECT id, otp_code, otp_expires_at, otp_attempts FROM users WHERE email = $1 AND `+cond+` FOR UPDATE`,
		email).Scan(&id, &otp, &expiresAt, &attempts)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return 0, otpWrong, nil
	case err != nil:
		return 0, 0, err
	case attempts >= otpMaxAttempts:
		return id, otpBurnt, nil // burnt until a new code is sent
	case otp == nil || expiresAt == nil || time.Now().After(*expiresAt) ||
		subtle.ConstantTimeCompare([]byte(*otp), []byte(code)) != 1:
		_, err := tx.Exec(ctx, `UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1`, id)
		return id, otpWrong, err
	}
	return id, otpOK, nil
}

// otpFailed answers a failed checkOTP and reports whether it did.
func otpFailed(w http.ResponseWriter, r *http.Request, res otpResult, err error) bool {
	switch {
	case err != nil:
		httpx.Internal(w, r, err)
	case res == otpWrong:
		httpx.Error(w, http.StatusBadRequest, "Invalid or expired code")
	case res == otpBurnt:
		httpx.Error(w, http.StatusTooManyRequests, "Too many wrong codes. Request a new code.")
	default:
		return false
	}
	return true
}

// forgotPassword emails a reset code to a verified, active account. The answer is the same whether or not
// the account exists, so it can't be used to find out which emails are registered.
func (h *Handler) forgotPassword(w http.ResponseWriter, r *http.Request) {
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
	// A verified account has no signup code pending, so the OTP columns are free for the reset code.
	tag, err := h.DB.Exec(r.Context(), `
		UPDATE users SET otp_code = $2, otp_expires_at = $3, otp_attempts = 0, otp_sent_at = now()
		WHERE email = $1 AND is_verified AND suspended_at IS NULL AND (otp_sent_at IS NULL OR otp_sent_at < $4)`,
		in.Email, otp, time.Now().Add(otpTTL), time.Now().Add(-otpResendGap))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	resp := map[string]any{"message": "If an account uses that email, we sent it a code to reset the password."}
	if tag.RowsAffected() == 1 {
		// A send failure is only logged: reporting it would reveal that the account exists.
		if err := h.send(in.Email, "Reset your FeedingHands password",
			"Your FeedingHands password reset code is "+otp+".\n\nIt expires in 10 minutes. "+
				"If you didn't ask to reset your password, ignore this email.\n"); err != nil {
			log.Printf("send reset code: %v", err)
		}
		if h.ExposeOTP {
			resp["otp"] = otp
		}
	}
	httpx.JSON(w, http.StatusOK, resp)
}

// resetPassword sets a new password with the emailed code, which signs out every existing session.
func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	switch {
	case in.Email == "" || in.Token == "":
		httpx.Error(w, http.StatusBadRequest, "Email and code are required")
		return
	case passwordProblem(in.Password) != "":
		httpx.Error(w, http.StatusBadRequest, passwordProblem(in.Password))
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	var u user
	var res otpResult
	err = pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		// is_verified: a signup code must not reset a password.
		id, check, err := checkOTP(r.Context(), tx, in.Email, in.Token, "is_verified AND suspended_at IS NULL")
		res = check
		if err != nil || check != otpOK {
			return err
		}
		u, err = scanUser(tx.QueryRow(r.Context(), `
			UPDATE users SET password_hash = $2, password_changed_at = now(),
				otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, updated_at = now()
			WHERE id = $1 RETURNING `+userCols, id, string(hash)))
		return err
	})
	if otpFailed(w, r, res, err) {
		return
	}
	h.respondWithToken(w, r, "Password reset", u)
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
	var suspended bool
	u, err := scanUser(h.DB.QueryRow(r.Context(), `
		SELECT password_hash, suspended_at IS NOT NULL, `+userCols+` FROM users
		WHERE ($1 <> '' AND email = $1) OR ($2 <> '' AND phone = $2)
		LIMIT 1`, in.Email, in.Phone), &hash, &suspended)
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
	if suspended {
		Suspended(w)
		return
	}
	h.respondWithToken(w, r, "Signin successful", u)
}

// updateMe changes the caller's own name, phone or email preference; absent fields stay as they are.
func (h *Handler) updateMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		FullName           *string `json:"fullName"`
		Phone              *string `json:"phone"`
		EmailNotifications *bool   `json:"emailNotifications"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	for _, f := range []*string{in.FullName, in.Phone} {
		if f != nil {
			*f = strings.TrimSpace(*f)
		}
	}
	switch {
	case in.FullName != nil && *in.FullName == "":
		httpx.Error(w, http.StatusBadRequest, "Full name can't be empty")
		return
	case in.FullName != nil && len(*in.FullName) > 200, in.Phone != nil && len(*in.Phone) > 30:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	}
	caller, _ := FromContext(r.Context())
	// phone: absent keeps it, "" clears it.
	u, err := scanUser(h.DB.QueryRow(r.Context(), `
		UPDATE users SET full_name = COALESCE($2, full_name),
			phone = CASE WHEN $3::text IS NULL THEN phone ELSE NULLIF($3, '') END,
			email_notifications = COALESCE($4, email_notifications), updated_at = now()
		WHERE id = $1 RETURNING `+userCols, caller.ID, in.FullName, in.Phone, in.EmailNotifications))
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "Another account already uses this phone number")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

// checkPassword reports whether password is the user's; when it isn't, it has already answered.
func (h *Handler) checkPassword(w http.ResponseWriter, r *http.Request, userID int64, password string) bool {
	var hash string
	if err := h.DB.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&hash); err != nil {
		httpx.Internal(w, r, err)
		return false
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		// 400, not 401: the frontend signs out on 401.
		httpx.Error(w, http.StatusBadRequest, "Current password is incorrect")
		return false
	}
	return true
}

// changePassword sets a new password, which signs out every other session.
func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if msg := passwordProblem(in.NewPassword); msg != "" {
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}
	caller, _ := FromContext(r.Context())
	if !h.checkPassword(w, r, caller.ID, in.CurrentPassword) {
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	u, err := scanUser(h.DB.QueryRow(r.Context(), `
		UPDATE users SET password_hash = $2, password_changed_at = now(), updated_at = now()
		WHERE id = $1 RETURNING `+userCols, caller.ID, string(hash)))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	h.respondWithToken(w, r, "Password changed", u)
}

// deleteMe removes the account. Donations, pickups and profiles stay (their user columns become NULL),
// so other people's histories and the stats don't change.
func (h *Handler) deleteMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Password string `json:"password"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	caller, _ := FromContext(r.Context())
	if !h.checkPassword(w, r, caller.ID, in.Password) {
		return
	}
	if _, err := h.DB.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, caller.ID); err != nil {
		httpx.Internal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
