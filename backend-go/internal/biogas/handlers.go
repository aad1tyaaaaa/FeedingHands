// Package biogas handles food-waste donations for biogas plants.
package biogas

import (
	"net/http"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const dateLayout = "2006-01-02" // what <input type="date"> sends

type Donation struct {
	ID            int64     `json:"id"`
	FoodType      string    `json:"food_type"`
	Quantity      string    `json:"quantity"`
	Address       string    `json:"address"`
	Date          string    `json:"date"`
	ContactNumber string    `json:"contact_number"`
	CreatedAt     time.Time `json:"created_at"`
}

const cols = `id, food_type, quantity, address, to_char(pickup_date, 'YYYY-MM-DD'), contact_number, created_at`

func scan(row pgx.Row) (Donation, error) {
	var d Donation
	err := row.Scan(&d.ID, &d.FoodType, &d.Quantity, &d.Address, &d.Date, &d.ContactNumber, &d.CreatedAt)
	return d, err
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/biogas-donations", h.list)
	mux.HandleFunc("POST /api/biogas-donations", h.Tokens.Optional(h.create))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT `+cols+` FROM biogas_donations ORDER BY created_at DESC`)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	donations, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Donation, error) { return scan(row) })
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"donations": donations})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in Donation
	if !httpx.Decode(w, r, &in) {
		return
	}
	for _, f := range []*string{&in.FoodType, &in.Quantity, &in.Address, &in.Date, &in.ContactNumber} {
		*f = strings.TrimSpace(*f)
	}
	date, dateErr := time.Parse(dateLayout, in.Date)
	switch {
	case in.FoodType == "" || in.Quantity == "" || in.Address == "" || in.Date == "" || in.ContactNumber == "":
		httpx.Error(w, http.StatusBadRequest, "food_type, quantity, address, date and contact_number are required")
		return
	case len(in.FoodType) > 100 || len(in.Quantity) > 50 || len(in.Address) > 500 || len(in.ContactNumber) > 30:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case dateErr != nil:
		httpx.Error(w, http.StatusBadRequest, "date must look like 2026-11-03")
		return
	}

	d, err := scan(h.DB.QueryRow(r.Context(), `
		INSERT INTO biogas_donations (donor_id, food_type, quantity, address, pickup_date, contact_number)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+cols,
		auth.UserID(r.Context()), in.FoodType, in.Quantity, in.Address, date, in.ContactNumber))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Biogas donation created", "donation": d})
}
