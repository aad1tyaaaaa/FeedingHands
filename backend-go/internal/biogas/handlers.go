// Package biogas handles food-waste pickups for biogas plants.
package biogas

import (
	"errors"
	"net/http"
	"strconv"
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
	Status        string    `json:"status"`
	DonorName     *string   `json:"donor_name"`
	CollectorName *string   `json:"collector_name"`
	CreatedAt     time.Time `json:"created_at"`
}

const cols = `b.id, b.food_type, b.quantity, b.address, to_char(b.pickup_date, 'YYYY-MM-DD'), b.contact_number,
	b.status, du.full_name, cu.full_name, b.created_at`

const from = ` FROM biogas_donations b
	LEFT JOIN users du ON du.id = b.donor_id
	LEFT JOIN users cu ON cu.id = b.collector_id`

func scan(row pgx.Row) (Donation, error) {
	var d Donation
	err := row.Scan(&d.ID, &d.FoodType, &d.Quantity, &d.Address, &d.Date, &d.ContactNumber,
		&d.Status, &d.DonorName, &d.CollectorName, &d.CreatedAt)
	return d, err
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	req := h.Tokens.Require
	mux.HandleFunc("GET /api/biogas-donations", req(h.list))
	mux.HandleFunc("POST /api/biogas-donations", req(h.create))
	mux.HandleFunc("PATCH /api/biogas-donations/{id}/status", req(h.updateStatus))
}

// list: biogas partners and admins see every pickup; everyone else sees the ones they scheduled.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.FromContext(r.Context())
	sql, args := `SELECT `+cols+from+` ORDER BY b.created_at DESC LIMIT 500`, []any{}
	if u.Role != "biogas" && u.Role != "admin" {
		sql, args = `SELECT `+cols+from+` WHERE b.donor_id = $1 ORDER BY b.created_at DESC LIMIT 500`, []any{u.ID}
	}
	rows, err := h.DB.Query(r.Context(), sql, args...)
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
		httpx.Error(w, http.StatusBadRequest, "Food type, quantity, address, date and contact number are required")
		return
	case len(in.FoodType) > 100 || len(in.Quantity) > 50 || len(in.Address) > 500 || len(in.ContactNumber) > 30:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case dateErr != nil:
		httpx.Error(w, http.StatusBadRequest, "Date must look like 2026-11-03")
		return
	case date.Before(time.Now().Truncate(24*time.Hour).AddDate(0, 0, -1)):
		httpx.Error(w, http.StatusBadRequest, "Pickup date can't be in the past")
		return
	}

	var id int64
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO biogas_donations (donor_id, food_type, quantity, address, pickup_date, contact_number)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		auth.UserID(r.Context()), in.FoodType, in.Quantity, in.Address, date, in.ContactNumber).Scan(&id)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	d, err := scan(h.DB.QueryRow(r.Context(), `SELECT `+cols+from+` WHERE b.id = $1`, id))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Biogas pickup scheduled", "donation": d})
}

// updateStatus: a biogas partner marks a scheduled pickup collected; the partner or the donor can cancel it.
func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Pickup not found")
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	u, _ := auth.FromContext(r.Context())
	partner := u.Role == "biogas" || u.Role == "admin"
	switch {
	case in.Status != "collected" && in.Status != "cancelled":
		httpx.Error(w, http.StatusBadRequest, "Status must be collected or cancelled")
		return
	case in.Status == "collected" && !partner:
		httpx.Error(w, http.StatusForbidden, "Only biogas partners can mark a pickup collected")
		return
	}

	var newID int64
	err = h.DB.QueryRow(r.Context(), `
		UPDATE biogas_donations SET status = $2, updated_at = now(),
			collector_id = CASE WHEN $2 = 'collected' THEN $3 ELSE collector_id END
		WHERE id = $1 AND status = 'scheduled' AND ($4 OR donor_id = $3)
		RETURNING id`, id, in.Status, u.ID, partner).Scan(&newID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusConflict, "This pickup isn't scheduled any more, or isn't yours")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	d, err := scan(h.DB.QueryRow(r.Context(), `SELECT `+cols+from+` WHERE b.id = $1`, newID))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Pickup updated", "donation": d})
}
