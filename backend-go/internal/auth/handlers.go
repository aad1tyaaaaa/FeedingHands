// Package auth handles signup with OTP verification, signin, and the JWT middleware.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"slices"
	"strings"
	"time"

	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const otpTTL = 10 * time.Minute

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *Tokens
	// ExposeOTP returns the OTP in the signup response, since no SMS/email sender exists yet. Never in production.
	ExposeOTP bool
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/signup", h.signup)
	mux.HandleFunc("POST /api/auth/verify-otp", h.verifyOTP)
	mux.HandleFunc("POST /api/auth/signin", h.signin)
	mux.HandleFunc("GET /api/auth/me", h.Tokens.Require(h.me))
	mux.HandleFunc("PATCH /api/auth/role", h.Tokens.Require(h.updateRole))
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
	Role     string `json:"role"`
	Token    string `json:"token"` // the OTP, named as the frontend sends it
}

func (c *credentials) normalize() {
	c.FullName = strings.TrimSpace(c.FullName)
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
	c.Phone = strings.TrimSpace(c.Phone)
	c.Token = strings.TrimSpace(c.Token)
}

// selfServiceRoles are the roles a user may pick for themselves; admin is granted in the database.
var selfServiceRoles = []string{"donor", "volunteer", "organization", "biogas"}

func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	switch {
	case in.FullName == "" || in.Password == "" || (in.Email == "" && in.Phone == ""):
		httpx.Error(w, http.StatusBadRequest, "fullName, password and phone/email are required")
		return
	case len(in.Password) < 8:
		httpx.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	case len(in.Password) > 72: // bcrypt only reads the first 72 bytes
		httpx.Error(w, http.StatusBadRequest, "Password must be at most 72 characters")
		return
	case in.Role != "" && !slices.Contains(selfServiceRoles, in.Role):
		httpx.Error(w, http.StatusBadRequest, "Role must be donor, volunteer, organization or biogas")
		return
	}
	if in.Role == "" {
		in.Role = "pending"
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
		INSERT INTO users (full_name, email, phone, password_hash, role, otp_code, otp_expires_at)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6, $7)
		RETURNING id`,
		in.FullName, in.Email, in.Phone, string(hash), in.Role, otp, time.Now().Add(otpTTL),
	).Scan(&id)
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "User already exists")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	resp := map[string]any{"message": "Signup successful. Verify OTP to activate account.", "userId": id}
	if h.ExposeOTP {
		resp["otp"] = otp
	}
	httpx.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Token == "" || (in.Email == "" && in.Phone == "") {
		httpx.Error(w, http.StatusBadRequest, "token and phone/email are required")
		return
	}

	var (
		id        int64
		otp       *string
		expiresAt *time.Time
	)
	err := h.DB.QueryRow(r.Context(), `
		SELECT id, otp_code, otp_expires_at FROM users
		WHERE ($1 <> '' AND phone = $1) OR ($2 <> '' AND email = $2)
		LIMIT 1`, in.Phone, in.Email).Scan(&id, &otp, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	// ponytail: no attempt limit on OTP guesses; add a counter + resend endpoint before real SMS goes live.
	if otp == nil || expiresAt == nil || time.Now().After(*expiresAt) ||
		subtle.ConstantTimeCompare([]byte(*otp), []byte(in.Token)) != 1 {
		httpx.Error(w, http.StatusBadRequest, "Invalid or expired OTP")
		return
	}

	u, err := scanUser(h.DB.QueryRow(r.Context(), `
		UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL, updated_at = now()
		WHERE id = $1 RETURNING `+userCols, id))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	h.respondWithToken(w, r, "OTP verified", u)
}

func (h *Handler) signin(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Password == "" || (in.Email == "" && in.Phone == "") {
		httpx.Error(w, http.StatusBadRequest, "phone/email and password are required")
		return
	}

	var hash string
	row := h.DB.QueryRow(r.Context(), `
		SELECT password_hash, `+userCols+` FROM users
		WHERE ($1 <> '' AND phone = $1) OR ($2 <> '' AND email = $2)
		LIMIT 1`, in.Phone, in.Email)
	var u user
	err := row.Scan(&hash, &u.ID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.IsVerified, &u.Points, &u.CreatedAt)
	// Same answer for unknown user and wrong password, so signin can't be used to probe which accounts exist.
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil) {
		httpx.Error(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	if !u.IsVerified {
		httpx.Error(w, http.StatusForbidden, "Please verify OTP first")
		return
	}
	h.respondWithToken(w, r, "Signin successful", u)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	caller, _ := FromContext(r.Context())
	u, err := scanUser(h.DB.QueryRow(r.Context(), `SELECT `+userCols+` FROM users WHERE id = $1`, caller.ID))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

func (h *Handler) updateRole(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Role string `json:"role"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !slices.Contains(selfServiceRoles, in.Role) {
		httpx.Error(w, http.StatusBadRequest, "Role must be donor, volunteer, organization or biogas")
		return
	}
	caller, _ := FromContext(r.Context())
	u, err := scanUser(h.DB.QueryRow(r.Context(),
		`UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING `+userCols, caller.ID, in.Role))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	// The role lives in the token, so hand out a fresh one.
	h.respondWithToken(w, r, "Role updated successfully", u)
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
