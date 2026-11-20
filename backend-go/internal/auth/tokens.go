package auth

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"feedinghands/backend-go/internal/httpx"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const tokenTTL = 7 * 24 * time.Hour

type claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// Tokens signs and verifies the JWTs handed out at signin.
type Tokens struct {
	secret []byte
	// DB, when set, is read on every authenticated request so a suspension, password change, role change or
	// deleted account takes effect at once instead of when the token expires. main always sets it.
	DB *pgxpool.Pool
}

func NewTokens(secret string) *Tokens {
	return &Tokens{secret: []byte(secret)}
}

func (t *Tokens) Sign(userID int64, role string) (string, error) {
	now := time.Now()
	c := claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(t.secret)
}

// User is who made the request, taken from a verified token.
type User struct {
	ID   int64
	Role string
}

type ctxKey struct{}

// FromContext returns the signed-in user, if the request carried a valid token.
func FromContext(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(ctxKey{}).(User)
	return u, ok
}

// UserID is the signed-in user's id, or nil for anonymous requests; handy for nullable columns.
func UserID(ctx context.Context) *int64 {
	if u, ok := FromContext(ctx); ok {
		return &u.ID
	}
	return nil
}

var (
	errBadToken  = errors.New("missing, invalid or revoked token")
	errSuspended = errors.New("account suspended")
)

// revoked reports whether a token issued at iat predates the last password change.
// iat has whole-second precision, so the change time is truncated too: a token signed in the same
// second as the change (the one the change itself hands out) stays valid.
func revoked(changedAt *time.Time, iat *jwt.NumericDate) bool {
	return changedAt != nil && (iat == nil || changedAt.Truncate(time.Second).After(iat.Time))
}

// verify returns the caller, errBadToken, errSuspended, or a database error.
func (t *Tokens) verify(r *http.Request) (User, error) {
	raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || raw == "" {
		return User{}, errBadToken
	}
	var c claims
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	if err != nil {
		return User{}, errBadToken
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return User{}, errBadToken
	}
	u := User{ID: id, Role: c.Role}
	if t.DB == nil {
		return u, nil
	}
	// The role is read fresh too, so an admin's role change applies without signing in again.
	var suspended bool
	var changedAt *time.Time
	err = t.DB.QueryRow(r.Context(), `SELECT role, suspended_at IS NOT NULL, password_changed_at FROM users WHERE id = $1`, id).
		Scan(&u.Role, &suspended, &changedAt)
	switch {
	case errors.Is(err, pgx.ErrNoRows), err == nil && revoked(changedAt, c.IssuedAt):
		return User{}, errBadToken
	case err != nil:
		return User{}, err
	case suspended:
		return User{}, errSuspended
	}
	return u, nil
}

// reject answers a request whose token didn't pass verify.
func reject(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errSuspended):
		Suspended(w)
	case errors.Is(err, errBadToken):
		httpx.Error(w, http.StatusUnauthorized, "Please sign in again")
	default:
		httpx.Internal(w, r, err)
	}
}

// Suspended sends the 403 the frontend recognises by its code.
func Suspended(w http.ResponseWriter) {
	httpx.JSON(w, http.StatusForbidden, map[string]any{
		"message": "Your account is suspended. Contact the FeedingHands team.", "code": "suspended"})
}

// Require rejects requests without a valid token.
func (t *Tokens) Require(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, err := t.verify(r)
		if err != nil {
			reject(w, r, err)
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, u)))
	}
}

// RequireRole is Require plus a role check (admins always pass).
func (t *Tokens) RequireRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return t.Require(func(w http.ResponseWriter, r *http.Request) {
		if u, _ := FromContext(r.Context()); u.Role != role && u.Role != "admin" {
			httpx.Error(w, http.StatusForbidden, "Only "+role+" accounts can do this")
			return
		}
		next(w, r)
	})
}

// Optional attaches the user when a valid token is present and lets anonymous requests through.
// A bad or revoked token counts as anonymous; a suspended account is still refused.
func (t *Tokens) Optional(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, err := t.verify(r)
		switch {
		case err == nil:
			r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, u))
		case !errors.Is(err, errBadToken):
			reject(w, r, err)
			return
		}
		next(w, r)
	}
}
