package donation

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Every delivered donation earns the donor the same points; the client doesn't get to choose.
const pointsPerDonation = 10

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
	Notify *notify.Notifier // nil = no emails
}

func (h *Handler) Register(mux *http.ServeMux) {
	req := h.Tokens.Require
	mux.HandleFunc("POST /api/donations", h.Tokens.RequireRole("donor", h.create))
	mux.HandleFunc("GET /api/donations", req(h.list))
	mux.HandleFunc("GET /api/donations/{id}", req(h.get))
	mux.HandleFunc("GET /api/donations/tracking/{trackingId}", h.tracking)
	mux.HandleFunc("PATCH /api/donations/{id}/status", req(h.updateStatus))
	mux.HandleFunc("POST /api/donations/{id}/photos", req(h.uploadPhoto))
	mux.HandleFunc("GET /api/donations/{id}/photos/{photoId}", req(h.servePhoto))
}

type createInput struct {
	Type        string          `json:"type"`
	FoodDetails json.RawMessage `json:"foodDetails"` // a string, or a JSON array of {name, quantity}
	Description string          `json:"description"`
	Location    string          `json:"location"`
	Latitude    *float64        `json:"latitude"`
	Longitude   *float64        `json:"longitude"`
	Contact     string          `json:"contact"`
	Notes       string          `json:"notes"`
	// Optional result of the in-browser freshness check.
	Freshness           string   `json:"freshness"`
	FreshnessConfidence *float64 `json:"freshnessConfidence"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in createInput
	if !httpx.Decode(w, r, &in) {
		return
	}
	for _, f := range []*string{&in.Type, &in.Description, &in.Location, &in.Contact, &in.Notes, &in.Freshness} {
		*f = strings.TrimSpace(*f)
	}
	food := foodText(in.FoodDetails, in.Description)
	switch {
	case food == "" || food == "[]":
		httpx.Error(w, http.StatusBadRequest, "Add at least one food item")
		return
	case in.Location == "":
		httpx.Error(w, http.StatusBadRequest, "Pickup location is required")
		return
	case in.Contact == "":
		httpx.Error(w, http.StatusBadRequest, "A contact number is required so volunteers can reach you")
		return
	case len(in.Type) > 50 || len(in.Location) > 500 || len(in.Contact) > 100 || len(in.Notes) > 2000 || len(food) > 10000 ||
		len(in.Freshness) > 50:
		httpx.Error(w, http.StatusBadRequest, "One of the fields is too long")
		return
	case in.Latitude != nil && (*in.Latitude < -90 || *in.Latitude > 90),
		in.Longitude != nil && (*in.Longitude < -180 || *in.Longitude > 180):
		httpx.Error(w, http.StatusBadRequest, "Location coordinates are out of range")
		return
	case in.FreshnessConfidence != nil && (*in.FreshnessConfidence < 0 || *in.FreshnessConfidence > 1):
		httpx.Error(w, http.StatusBadRequest, "freshnessConfidence must be between 0 and 1")
		return
	}
	if in.Type == "" {
		in.Type = "food"
	}
	trackingID, err := newTrackingID()
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	donor := auth.UserID(r.Context())
	var d Donation
	err = pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		var id int64
		err := tx.QueryRow(r.Context(), `
			INSERT INTO donations (tracking_id, donor_id, type, food_details, location, latitude, longitude, contact, notes,
			                       status_label, points, freshness, freshness_confidence)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF($12, ''), $13)
			RETURNING id`,
			trackingID, donor, in.Type, food, in.Location, in.Latitude, in.Longitude, in.Contact, in.Notes,
			labels["available"], pointsPerDonation, in.Freshness, in.FreshnessConfidence,
		).Scan(&id)
		if err != nil {
			return err
		}
		if err := addEvent(r.Context(), tx, id, "available", labels["available"], "", donor); err != nil {
			return err
		}
		d, err = withEvents(r.Context(), tx, "id", id)
		return err
	})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	if d.Latitude != nil && d.Longitude != nil {
		h.Notify.Nearby("New food donation near you: "+d.TrackingID,
			fmt.Sprintf("A donor just posted %s at %s (tracking ID %s).\n\nSign in to FeedingHands to claim it.\n",
				d.Type, d.Location, d.TrackingID),
			*d.Latitude, *d.Longitude)
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Donation created successfully", "donation": d})
}

// foodText stores foodDetails as text whether the client sent a JSON string or a JSON array/object.
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

// caller loads the signed-in user's role, linked organization/volunteer profile ids and whether
// their organization is verified.
func (h *Handler) caller(ctx context.Context, q querier) (actor, error) {
	u, _ := auth.FromContext(ctx)
	a := actor{role: u.Role, userID: u.ID}
	err := q.QueryRow(ctx, `
		SELECT COALESCE((SELECT id FROM organizations WHERE owner_id = $1), 0),
		       COALESCE((SELECT verification_status = 'verified' FROM organizations WHERE owner_id = $1), false),
		       COALESCE((SELECT id FROM volunteers WHERE user_id = $1), 0)`, u.ID).Scan(&a.orgID, &a.orgVerified, &a.vol)
	return a, err
}

// list filters: ?status=a,b  ?assigned=me (the caller's NGO or volunteer work); paging: ?before=<id>&limit=<n>.
// Donors and biogas partners only ever see their own donations; NGOs and volunteers see the open pool too.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	a, err := h.caller(r.Context(), h.DB)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	var (
		where []string
		args  []any
	)
	arg := func(v any) string { args = append(args, v); return "$" + strconv.Itoa(len(args)) }

	q := r.URL.Query()
	before, limit, ok := page(q)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "before and limit must be positive numbers")
		return
	}
	if before > 0 {
		where = append(where, "d.id < "+arg(before))
	}
	switch {
	case a.role == "admin":
	case a.role == "organization" && q.Get("assigned") == "me":
		where = append(where, "d.organization_id = "+arg(a.orgID))
	case a.role == "volunteer" && q.Get("assigned") == "me":
		where = append(where, "d.volunteer_id = "+arg(a.vol))
	case a.role == "organization" || a.role == "volunteer":
	default:
		where = append(where, "d.donor_id = "+arg(a.userID))
	}
	if s := q.Get("status"); s != "" {
		statuses := strings.Split(s, ",")
		for _, st := range statuses {
			if !validStatus(st) {
				httpx.Error(w, http.StatusBadRequest, "Unknown status "+strconv.Quote(st))
				return
			}
		}
		where = append(where, "d.status = ANY("+arg(statuses)+")")
	}

	donations, err := list(r.Context(), h.DB, where, args, limit)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	var next *int64 // a full page means there may be more
	if len(donations) == limit {
		next = &donations[len(donations)-1].ID
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"donations": donations, "next": next})
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
	if u, _ := auth.FromContext(r.Context()); !canSee(u, d.DonorID) {
		httpx.Error(w, http.StatusNotFound, "Donation not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"donation": d})
}

// canSee: NGOs, volunteers and admins see every donation; donors only their own
// (callers answer 404 either way, so it doesn't reveal that others exist).
func canSee(u auth.User, donor *int64) bool {
	return u.Role == "organization" || u.Role == "volunteer" || u.Role == "admin" || (donor != nil && *donor == u.ID)
}

// trackingView is the public tracking page: progress only, no contact details.
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
	d, err := withEvents(r.Context(), h.DB, "tracking_id", strings.TrimSpace(r.PathValue("trackingId")))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "No donation with that tracking ID")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	for i := range d.Events {
		d.Events[i].ActorName = nil // names of private individuals stay off the public page
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"tracking": trackingView{
		TrackingID: d.TrackingID, Type: d.Type, Status: d.Status, StatusLabel: d.StatusLabel,
		NGOName: d.NGOName, VolunteerName: d.VolunteerName, CreatedAt: d.CreatedAt, UpdatedAt: d.UpdatedAt,
		Events: d.Events,
	}})
}

var errBadMove = errors.New("bad status change")

type deniedError string

func (e deniedError) Error() string { return string(e) }

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

	var (
		d             Donation
		current, move string
	)
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		a, err := h.caller(r.Context(), tx)
		if err != nil {
			return err
		}
		// FOR UPDATE: two volunteers tapping "picked up" at once can't both win.
		var p parties
		var donor, org, vol *int64
		if err := tx.QueryRow(r.Context(), `
			SELECT status, donor_id, organization_id, volunteer_id FROM donations WHERE id = $1 FOR UPDATE`, id,
		).Scan(&current, &donor, &org, &vol); err != nil {
			return err
		}
		p.donor, p.org, p.vol = deref(donor), deref(org), deref(vol)

		next := current
		if in.Status != "" && in.Status != current {
			if !canMove(current, in.Status) {
				return errBadMove
			}
			next, move = in.Status, in.Status
		}
		if msg := permit(a, p, move); msg != "" {
			return deniedError(msg)
		}
		label := in.StatusLabel
		if label == "" && move != "" {
			label = labels[next]
		}

		// Claiming links the caller's organization; picking up links the caller's volunteer profile.
		_, err = tx.Exec(r.Context(), `
			UPDATE donations SET
				status = $2,
				status_label = COALESCE(NULLIF($3, ''), status_label),
				organization_id = CASE WHEN $2 = 'requested' AND $4 <> 0 THEN $4 ELSE organization_id END,
				volunteer_id = CASE WHEN $2 IN ('picked_up', 'in_transit', 'delivered') AND $5 <> 0 THEN $5 ELSE volunteer_id END,
				updated_at = now()
			WHERE id = $1`, id, next, label, a.orgID, a.vol)
		if err != nil {
			return err
		}
		if move == "delivered" && p.donor != 0 {
			if _, err := tx.Exec(r.Context(), `
				UPDATE users SET points = points + (SELECT points FROM donations WHERE id = $2) WHERE id = $1`,
				p.donor, id); err != nil {
				return err
			}
		}
		if err := addEvent(r.Context(), tx, id, next, label, in.Note, &a.userID); err != nil {
			return err
		}
		d, err = withEvents(r.Context(), tx, "id", id)
		return err
	})
	var denied deniedError
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "Donation not found")
	case errors.As(err, &denied):
		httpx.Error(w, http.StatusForbidden, string(denied))
	case errors.Is(err, errBadMove):
		httpx.Error(w, http.StatusConflict, fmt.Sprintf("A %s donation can't be marked %s",
			strings.ReplaceAll(current, "_", " "), strings.ReplaceAll(in.Status, "_", " ")))
	case err != nil:
		httpx.Internal(w, r, err)
	default:
		h.notifyMove(move, d)
		httpx.JSON(w, http.StatusOK, map[string]any{"message": "Donation status updated", "donation": d})
	}
}

// notifyMove emails the donor when their donation is claimed, picked up or delivered,
// and the claiming NGO when it is picked up or delivered.
func (h *Handler) notifyMove(move string, d Donation) {
	if move != "requested" && move != "picked_up" && move != "delivered" {
		return
	}
	subject := "Donation " + d.TrackingID + ": " + labels[move]
	if d.DonorID != nil {
		h.Notify.Users(subject, fmt.Sprintf("Your donation %s is now: %s.\n\nThank you for feeding hands.\n",
			d.TrackingID, labels[move]), *d.DonorID)
	}
	if move != "requested" && d.OrganizationID != nil {
		h.Notify.Orgs(subject, fmt.Sprintf("The donation %s you claimed is now: %s.\n", d.TrackingID, labels[move]),
			*d.OrganizationID)
	}
}

// page reads ?before=<id>&limit=<n> (limit defaults to 50, at most 200); ok is false for non-numbers.
func page(q url.Values) (before int64, limit int, ok bool) {
	limit = 50
	if s := q.Get("limit"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 {
			return 0, 0, false
		}
		limit = min(n, 200)
	}
	if s := q.Get("before"); s != "" {
		b, err := strconv.ParseInt(s, 10, 64)
		if err != nil || b < 1 {
			return 0, 0, false
		}
		before = b
	}
	return before, limit, true
}

func deref(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Donation not found")
		return 0, false
	}
	return id, true
}

// newTrackingID is short enough to read over the phone and random enough not to be guessed (32^8).
func newTrackingID() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O or 1/I lookalikes
	b := make([]byte, 8)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		b[i] = alphabet[n.Int64()]
	}
	return "FH-" + string(b), nil
}
