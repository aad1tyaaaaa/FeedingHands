// Package volunteer handles volunteer sign-ups.
package volunteer

import (
	"net/http"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Volunteer struct {
	ID        int64     `json:"id"`
	UserID    *int64    `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Address   string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
}

const cols = `id, user_id, name, email, phone, address, created_at`

func scan(row pgx.Row) (Volunteer, error) {
	var v Volunteer
	err := row.Scan(&v.ID, &v.UserID, &v.Name, &v.Email, &v.Phone, &v.Address, &v.CreatedAt)
	return v, err
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/volunteers", h.list)
	mux.HandleFunc("POST /api/volunteers", h.Tokens.Optional(h.create))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT `+cols+` FROM volunteers ORDER BY created_at DESC`)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	volunteers, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Volunteer, error) { return scan(row) })
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"volunteers": volunteers})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Name, in.Phone, in.Address = strings.TrimSpace(in.Name), strings.TrimSpace(in.Phone), strings.TrimSpace(in.Address)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	switch {
	case in.Name == "":
		httpx.Error(w, http.StatusBadRequest, "Name is required")
		return
	case len(in.Name) > 200 || len(in.Email) > 254 || len(in.Phone) > 30 || len(in.Address) > 500:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case in.Email != "" && !httpx.ValidEmail(in.Email):
		httpx.Error(w, http.StatusBadRequest, "Email address is not valid")
		return
	}

	// A signed-in volunteer account is linked, so pickups they make show their name on the timeline.
	var userID *int64
	if u, ok := auth.FromContext(r.Context()); ok && u.Role == "volunteer" {
		userID = &u.ID
	}
	v, err := scan(h.DB.QueryRow(r.Context(), `
		INSERT INTO volunteers (user_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5)
		RETURNING `+cols, userID, in.Name, in.Email, in.Phone, in.Address))
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "Your account is already registered as a volunteer")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Volunteer registered", "volunteer": v})
}
