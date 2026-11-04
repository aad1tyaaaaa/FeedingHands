// Package volunteer handles volunteer profiles.
package volunteer

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Volunteer is the volunteer's own view of their profile.
type Volunteer struct {
	ID         int64     `json:"id"`
	UserID     *int64    `json:"user_id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Phone      string    `json:"phone"`
	Address    string    `json:"address"`
	Deliveries int       `json:"deliveries"`
	CreatedAt  time.Time `json:"created_at"`
}

const cols = `v.id, v.user_id, v.name, v.email, v.phone, v.address,
	(SELECT count(*) FROM donations d WHERE d.volunteer_id = v.id AND d.status = 'delivered'), v.created_at`

func scan(row pgx.Row) (Volunteer, error) {
	var v Volunteer
	err := row.Scan(&v.ID, &v.UserID, &v.Name, &v.Email, &v.Phone, &v.Address, &v.Deliveries, &v.CreatedAt)
	return v, err
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	vol := func(next http.HandlerFunc) http.HandlerFunc { return h.Tokens.RequireRole("volunteer", next) }
	mux.HandleFunc("GET /api/volunteers", h.list)
	mux.HandleFunc("GET /api/volunteers/me", vol(h.getMine))
	mux.HandleFunc("PUT /api/volunteers/me", vol(h.saveMine))
	mux.HandleFunc("POST /api/volunteers", vol(h.saveMine)) // the VolunteerForm; same as PUT /me
}

// list is the public "know your volunteers" wall: names and impact only, never contact details.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT `+cols+` FROM volunteers v ORDER BY v.created_at DESC`)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	type public struct {
		ID         int64     `json:"id"`
		Name       string    `json:"name"`
		Deliveries int       `json:"deliveries"`
		CreatedAt  time.Time `json:"created_at"`
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (public, error) {
		v, err := scan(row)
		return public{v.ID, v.Name, v.Deliveries, v.CreatedAt}, err
	})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"volunteers": out})
}

func (h *Handler) getMine(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.FromContext(r.Context())
	v, err := scan(h.DB.QueryRow(r.Context(), `SELECT `+cols+` FROM volunteers v WHERE v.user_id = $1`, u.ID))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "No volunteer profile yet")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"volunteer": v})
}

func (h *Handler) saveMine(w http.ResponseWriter, r *http.Request) {
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

	u, _ := auth.FromContext(r.Context())
	var id int64
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO volunteers (user_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = now()
		RETURNING id`, u.ID, in.Name, in.Email, in.Phone, in.Address).Scan(&id)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	v, err := scan(h.DB.QueryRow(r.Context(), `SELECT `+cols+` FROM volunteers v WHERE v.id = $1`, id))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Volunteer profile saved", "volunteer": v})
}
