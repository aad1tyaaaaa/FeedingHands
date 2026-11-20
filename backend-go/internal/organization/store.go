// Package organization serves organization profiles, their logos and verification documents.
package organization

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Organization struct {
	ID                 int64     `json:"id"`
	OwnerID            *int64    `json:"owner_id"`
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	Address            string    `json:"address"`
	Contact            string    `json:"contact"`
	Email              string    `json:"email"`
	Phone              string    `json:"phone"`
	Website            string    `json:"website"`
	Latitude           *float64  `json:"latitude"`
	Longitude          *float64  `json:"longitude"`
	LogoURL            *string   `json:"logo_url"` // path on this API; nil when no logo was uploaded
	VerificationStatus string    `json:"verificationStatus"`
	RegistrationNo     string    `json:"registrationNo"`
	ReviewNote         string    `json:"reviewNote"`
	HasDocument        bool      `json:"hasDocument"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// Cols are the columns Scan reads. Never select the logo or document bytes here: lists would ship every file.
// Unqualified, so a query joining another table selects them from a subquery or qualifies its own columns.
const Cols = `id, owner_id, name, description, address, contact, email, phone, website,
	latitude, longitude, logo IS NOT NULL, verification_status, registration_no, review_note, document IS NOT NULL,
	created_at, updated_at`

// Scan reads Cols; extra destinations are for columns selected after them.
func Scan(row pgx.Row, extra ...any) (Organization, error) {
	var o Organization
	var hasLogo bool
	dest := append([]any{&o.ID, &o.OwnerID, &o.Name, &o.Description, &o.Address, &o.Contact, &o.Email, &o.Phone,
		&o.Website, &o.Latitude, &o.Longitude, &hasLogo, &o.VerificationStatus, &o.RegistrationNo, &o.ReviewNote,
		&o.HasDocument, &o.CreatedAt, &o.UpdatedAt}, extra...)
	err := row.Scan(dest...)
	if hasLogo {
		// ?v= changes on every update, so the image can be cached forever and still refresh after an upload.
		u := fmt.Sprintf("/api/organizations/%d/logo?v=%d", o.ID, o.UpdatedAt.Unix())
		o.LogoURL = &u
	}
	return o, err
}

type store struct {
	db *pgxpool.Pool
}

// list is the public directory: verified organizations only.
func (s store) list(ctx context.Context) ([]Organization, error) {
	rows, err := s.db.Query(ctx, `SELECT `+Cols+` FROM organizations WHERE verification_status = 'verified' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Organization, error) { return Scan(row) })
}

func (s store) byOwner(ctx context.Context, ownerID int64) (Organization, error) {
	return Scan(s.db.QueryRow(ctx, `SELECT `+Cols+` FROM organizations WHERE owner_id = $1`, ownerID))
}

// resubmit sends a rejected profile back to the admins' queue whenever the owner changes it.
const resubmit = `verification_status = CASE WHEN organizations.verification_status = 'rejected'
	THEN 'pending' ELSE organizations.verification_status END`

// upsert creates the owner's profile on first save and updates it afterwards.
func (s store) upsert(ctx context.Context, ownerID int64, in Input) (Organization, error) {
	return Scan(s.db.QueryRow(ctx, `
		INSERT INTO organizations (owner_id, name, description, address, contact, email, phone, website, latitude, longitude, registration_no)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (owner_id) DO UPDATE SET
			name = EXCLUDED.name, description = EXCLUDED.description, address = EXCLUDED.address,
			contact = EXCLUDED.contact, email = EXCLUDED.email, phone = EXCLUDED.phone, website = EXCLUDED.website,
			latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, registration_no = EXCLUDED.registration_no,
			`+resubmit+`, updated_at = now()
		RETURNING `+Cols,
		ownerID, in.Name, in.Description, in.Address, in.Contact, in.Email, in.Phone, in.Website, in.Latitude, in.Longitude,
		in.RegistrationNo))
}

// setLogo stores (or with nil data, removes) the owner's logo. pgx.ErrNoRows means no profile exists yet.
func (s store) setLogo(ctx context.Context, ownerID int64, data []byte, contentType *string) (Organization, error) {
	return Scan(s.db.QueryRow(ctx, `
		UPDATE organizations SET logo = $2, logo_type = $3, updated_at = now()
		WHERE owner_id = $1 RETURNING `+Cols, ownerID, data, contentType))
}

// setDocument stores the owner's registration certificate. pgx.ErrNoRows means no profile exists yet.
func (s store) setDocument(ctx context.Context, ownerID int64, data []byte, contentType string) (Organization, error) {
	return Scan(s.db.QueryRow(ctx, `
		UPDATE organizations SET document = $2, document_type = $3, `+resubmit+`, updated_at = now()
		WHERE owner_id = $1 RETURNING `+Cols, ownerID, data, contentType))
}

func (s store) logo(ctx context.Context, id int64) (data []byte, contentType string, updated time.Time, err error) {
	err = s.db.QueryRow(ctx, `
		SELECT logo, logo_type, updated_at FROM organizations WHERE id = $1 AND logo IS NOT NULL`, id,
	).Scan(&data, &contentType, &updated)
	return data, contentType, updated, err
}
