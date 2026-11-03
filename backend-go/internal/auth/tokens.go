package auth

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"feedinghands/backend-go/internal/httpx"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTTL = 7 * 24 * time.Hour

type claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// Tokens signs and verifies the JWTs handed out at signin.
type Tokens struct {
	secret []byte
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

func (t *Tokens) verify(r *http.Request) (User, bool) {
	raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || raw == "" {
		return User{}, false
	}
	var c claims
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	if err != nil {
		return User{}, false
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return User{}, false
	}
	return User{ID: id, Role: c.Role}, true
}

// Require rejects requests without a valid token.
func (t *Tokens) Require(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := t.verify(r)
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "Please sign in again")
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
func (t *Tokens) Optional(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if u, ok := t.verify(r); ok {
			r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, u))
		}
		next(w, r)
	}
}
