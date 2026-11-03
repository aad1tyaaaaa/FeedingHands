package donation

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// Donation keeps the field names the frontend already reads (donation_tracking_id, status2, puniya_points).
type Donation struct {
	ID             int64     `json:"id"`
	TrackingID     string    `json:"donation_tracking_id"`
	Type           string    `json:"type"`
	FoodDetails    string    `json:"foodDetails"`
	Location       string    `json:"location"`
	Latitude       *float64  `json:"latitude"`
	Longitude      *float64  `json:"longitude"`
	Contact        string    `json:"contact"`
	Notes          string    `json:"notes"`
	Status         string    `json:"status"`
	StatusLabel    string    `json:"status2"`
	Points         int       `json:"puniya_points"`
	DonorID        *int64    `json:"donor_id"`
	DonorName      *string   `json:"donor_name"`
	OrganizationID *int64    `json:"organization_id"`
	NGOName        *string   `json:"ngo_name"`
	NGOAddress     *string   `json:"ngo_address"`
	NGOPhone       *string   `json:"ngo_phone"`
	VolunteerID    *int64    `json:"volunteer_id"`
	VolunteerName  *string   `json:"volunteer_name"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Events         []Event   `json:"events,omitempty"`
}

// Event is one step on the tracking timeline.
type Event struct {
	Status    string    `json:"status"`
	Label     string    `json:"label"`
	Note      string    `json:"note"`
	ActorName *string   `json:"actor_name"`
	CreatedAt time.Time `json:"created_at"`
}

const selectDonation = `
	SELECT d.id, d.tracking_id, d.type, d.food_details, d.location, d.latitude, d.longitude, d.contact, d.notes,
	       d.status, d.status_label, d.points, d.donor_id, u.full_name,
	       d.organization_id, o.name, o.address, o.phone, d.volunteer_id, v.name, d.created_at, d.updated_at
	FROM donations d
	LEFT JOIN users u ON u.id = d.donor_id
	LEFT JOIN organizations o ON o.id = d.organization_id
	LEFT JOIN volunteers v ON v.id = d.volunteer_id`

func scan(row pgx.Row) (Donation, error) {
	var d Donation
	err := row.Scan(&d.ID, &d.TrackingID, &d.Type, &d.FoodDetails, &d.Location, &d.Latitude, &d.Longitude,
		&d.Contact, &d.Notes, &d.Status, &d.StatusLabel, &d.Points, &d.DonorID, &d.DonorName,
		&d.OrganizationID, &d.NGOName, &d.NGOAddress, &d.NGOPhone, &d.VolunteerID, &d.VolunteerName,
		&d.CreatedAt, &d.UpdatedAt)
	return d, err
}

// querier is satisfied by both the pool and a transaction, so reads work inside or outside one.
type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func list(ctx context.Context, q querier) ([]Donation, error) {
	// ponytail: newest 500 only; add ?limit/&before= paging when donations outgrow that.
	rows, err := q.Query(ctx, selectDonation+` ORDER BY d.created_at DESC LIMIT 500`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Donation, error) { return scan(row) })
}

// withEvents loads one donation (matched by column = value) together with its timeline.
func withEvents(ctx context.Context, q querier, column string, value any) (Donation, error) {
	d, err := scan(q.QueryRow(ctx, selectDonation+` WHERE d.`+column+` = $1`, value))
	if err != nil {
		return d, err
	}
	rows, err := q.Query(ctx, `
		SELECT e.status, e.label, e.note, u.full_name, e.created_at
		FROM donation_events e LEFT JOIN users u ON u.id = e.actor_id
		WHERE e.donation_id = $1 ORDER BY e.created_at, e.id`, d.ID)
	if err != nil {
		return d, err
	}
	d.Events, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (Event, error) {
		var e Event
		err := row.Scan(&e.Status, &e.Label, &e.Note, &e.ActorName, &e.CreatedAt)
		return e, err
	})
	return d, err
}

func addEvent(ctx context.Context, tx pgx.Tx, donationID int64, status, label, note string, actor *int64) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO donation_events (donation_id, status, label, note, actor_id) VALUES ($1, $2, $3, $4, $5)`,
		donationID, status, label, note, actor)
	return err
}
