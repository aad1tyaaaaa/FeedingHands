package donation

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Every donation earns the donor the same points; the client doesn't get to choose.
const pointsPerDonation = 10

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	opt := h.Tokens.Optional
	mux.HandleFunc("POST /api/donations", opt(h.create))
	mux.HandleFunc("POST /api/donate", opt(h.create)) // old path, still used by one form
	mux.HandleFunc("GET /api/donations", h.list)
	mux.HandleFunc("GET /api/donations/{id}", h.get)
	mux.HandleFunc("GET /api/donations/tracking/{trackingId}", h.tracking)
	// ponytail: status changes accept anonymous callers because the persona login has no token yet.
	// Switch to h.Tokens.Require once every dashboard signs in for real.
	mux.HandleFunc("PATCH /api/donations/{id}/status", opt(h.updateStatus))
}

type createInput struct {
	Type        string          `json:"type"`
	FoodDetails json.RawMessage `json:"foodDetails"` // a string, or an object the old form sent as-is
	Description string          `json:"description"`
	Location    string          `json:"location"`
	Latitude    *float64        `json:"latitude"`
	Longitude   *float64        `json:"longitude"`
	Contact     string          `json:"contact"`
	Notes       string          `json:"notes"`
	TrackingID  string          `json:"donation_tracking_id"`
	StatusLabel string          `json:"status2"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in createInput
	if !httpx.Decode(w, r, &in) {
		return
	}
	for _, f := range []*string{&in.Type, &in.Description, &in.Location, &in.Contact, &in.Notes, &in.TrackingID, &in.StatusLabel} {
		*f = strings.TrimSpace(*f)
	}
	food := foodText(in.FoodDetails, in.Description)
	switch {
	case len(in.Type) > 50 || len(in.Location) > 500 || len(in.Contact) > 100 || len(in.Notes) > 2000 ||
		len(food) > 10000 || len(in.TrackingID) > 64 || len(in.StatusLabel) > 100:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case in.Latitude != nil && (*in.Latitude < -90 || *in.Latitude > 90),
		in.Longitude != nil && (*in.Longitude < -180 || *in.Longitude > 180):
		httpx.Error(w, http.StatusBadRequest, "Location coordinates are out of range")
		return
	}
	if in.Type == "" {
		in.Type = "food"
	}
	if in.StatusLabel == "" {
		in.StatusLabel = labels["available"]
	}
	if in.TrackingID == "" {
		id, err := newTrackingID()
		if err != nil {
			httpx.Internal(w, r, err)
			return
		}
		in.TrackingID = id
	}

	donor := auth.UserID(r.Context())
	var d Donation
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		var id int64
		err := tx.QueryRow(r.Context(), `
			INSERT INTO donations (tracking_id, donor_id, type, food_details, location, latitude, longitude, contact, notes, status_label, points)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id`,
			in.TrackingID, donor, in.Type, food, in.Location, in.Latitude, in.Longitude, in.Contact, in.Notes,
			in.StatusLabel, pointsPerDonation,
		).Scan(&id)
		if err != nil {
			return err
		}
		if err := addEvent(r.Context(), tx, id, "available", in.StatusLabel, "", donor); err != nil {
			return err
		}
		if donor != nil {
			if _, err := tx.Exec(r.Context(), `UPDATE users SET points = points + $2 WHERE id = $1`, *donor, pointsPerDonation); err != nil {
				return err
			}
		}
		d, err = withEvents(r.Context(), tx, "id", id)
		return err
	})
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "A donation with this tracking ID already exists")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Donation created successfully", "donation": d})
}

// foodText stores foodDetails as text whether the client sent a JSON string or a JSON object.
func foodText(raw json.RawMessage, fallback string) string {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return strings.TrimSpace(s)
	}
	if t := strings.TrimSpace(string(raw)); t != "" && t != "null" {
		return t
	}
	return fallback
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	donations, err := list(r.Context(), h.DB)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"donations": donations})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	d, err := withEvents(r.Context(), h.DB, "id", id)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Donation not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"donation": d})
}

// trackingView is the public tracking page: progress only, no donor contact details.
type trackingView struct {
	TrackingID    string    `json:"donation_tracking_id"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	StatusLabel   string    `json:"status2"`
	NGOName       *string   `json:"ngo_name"`
	VolunteerName *string   `json:"volunteer_name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	Events        []Event   `json:"events"`
}

func (h *Handler) tracking(w http.ResponseWriter, r *http.Request) {
	d, err := withEvents(r.Context(), h.DB, "tracking_id", r.PathValue("trackingId"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Tracking record not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"tracking": trackingView{
		TrackingID: d.TrackingID, Type: d.Type, Status: d.Status, StatusLabel: d.StatusLabel,
		NGOName: d.NGOName, VolunteerName: d.VolunteerName, CreatedAt: d.CreatedAt, UpdatedAt: d.UpdatedAt,
		Events: d.Events,
	}})
}

var errBadMove = errors.New("bad status change")

func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Status      string `json:"status"`
		StatusLabel string `json:"status2"`
		Note        string `json:"note"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Status, in.StatusLabel, in.Note = strings.TrimSpace(in.Status), strings.TrimSpace(in.StatusLabel), strings.TrimSpace(in.Note)
	switch {
	case in.Status == "" && in.StatusLabel == "" && in.Note == "":
		httpx.Error(w, http.StatusBadRequest, "Send a status, status2 or note")
		return
	case in.Status != "" && !validStatus(in.Status):
		httpx.Error(w, http.StatusBadRequest, "Unknown status "+strconv.Quote(in.Status))
		return
	case len(in.StatusLabel) > 100 || len(in.Note) > 500:
		httpx.Error(w, http.StatusBadRequest, "status2 or note is too long")
		return
	}

	actor := auth.UserID(r.Context())
	var (
		d       Donation
		current string
	)
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		// FOR UPDATE: two volunteers tapping "picked up" at once can't both win.
		if err := tx.QueryRow(r.Context(), `SELECT status FROM donations WHERE id = $1 FOR UPDATE`, id).Scan(&current); err != nil {
			return err
		}
		next := current
		if in.Status != "" && in.Status != current {
			if !canMove(current, in.Status) {
				return errBadMove
			}
			next = in.Status
		}
		label := in.StatusLabel
		if label == "" && next != current {
			label = labels[next]
		}

		// Claiming links the caller's organization; picking up links the caller's volunteer profile.
		_, err := tx.Exec(r.Context(), `
			UPDATE donations SET
				status = $2,
				status_label = COALESCE(NULLIF($3, ''), status_label),
				organization_id = CASE WHEN $2 = 'requested'
					THEN COALESCE((SELECT id FROM organizations WHERE owner_id = $4), organization_id)
					ELSE organization_id END,
				volunteer_id = CASE WHEN $2 IN ('picked_up', 'in_transit')
					THEN COALESCE((SELECT id FROM volunteers WHERE user_id = $4), volunteer_id)
					ELSE volunteer_id END,
				updated_at = now()
			WHERE id = $1`, id, next, label, actor)
		if err != nil {
			return err
		}
		if err := addEvent(r.Context(), tx, id, next, label, in.Note, actor); err != nil {
			return err
		}
		d, err = withEvents(r.Context(), tx, "id", id)
		return err
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "Donation not found")
	case errors.Is(err, errBadMove):
		httpx.Error(w, http.StatusConflict, fmt.Sprintf("A %s donation can't be marked %s", strings.ReplaceAll(current, "_", " "), strings.ReplaceAll(in.Status, "_", " ")))
	case err != nil:
		httpx.Internal(w, r, err)
	default:
		httpx.JSON(w, http.StatusOK, map[string]any{"message": "Donation status updated", "donation": d})
	}
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Donation not found")
		return 0, false
	}
	return id, true
}

func newTrackingID() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("FH-%d-%d", time.Now().UnixMilli(), n.Int64()+1000), nil
}
