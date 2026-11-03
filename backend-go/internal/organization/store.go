// Package organization serves organization profiles and their logos.
package organization

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Organization struct {
	ID          int64     `json:"id"`
	OwnerID     *int64    `json:"owner_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Address     string    `json:"address"`
	Contact     string    `json:"contact"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	Website     string    `json:"website"`
	Latitude    *float64  `json:"latitude"`
	Longitude   *float64  `json:"longitude"`
	LogoURL     *string   `json:"logo_url"` // path on this API; nil when no logo was uploaded
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Never select the logo bytes here: lists would ship every image.
const cols = `id, owner_id, name, description, address, contact, email, phone, website,
	latitude, longitude, logo IS NOT NULL, created_at, updated_at`

func scan(row pgx.Row) (Organization, error) {
	var o Organization
	var hasLogo bool
	err := row.Scan(&o.ID, &o.OwnerID, &o.Name, &o.Description, &o.Address, &o.Contact, &o.Email, &o.Phone,
		&o.Website, &o.Latitude, &o.Longitude, &hasLogo, &o.CreatedAt, &o.UpdatedAt)
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

func (s store) list(ctx context.Context) ([]Organization, error) {
	rows, err := s.db.Query(ctx, `SELECT `+cols+` FROM organizations ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Organization, error) { return scan(row) })
}

func (s store) byOwner(ctx context.Context, ownerID int64) (Organization, error) {
	return scan(s.db.QueryRow(ctx, `SELECT `+cols+` FROM organizations WHERE owner_id = $1`, ownerID))
}

func (s store) create(ctx context.Context, ownerID *int64, in Input) (Organization, error) {
	return scan(s.db.QueryRow(ctx, `
		INSERT INTO organizations (owner_id, name, description, address, contact, email, phone, website, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+cols,
		ownerID, in.Name, in.Description, in.Address, in.Contact, in.Email, in.Phone, in.Website, in.Latitude, in.Longitude))
}

// upsert creates the owner's profile on first save and updates it afterwards.
func (s store) upsert(ctx context.Context, ownerID int64, in Input) (Organization, error) {
	return scan(s.db.QueryRow(ctx, `
		INSERT INTO organizations (owner_id, name, description, address, contact, email, phone, website, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (owner_id) DO UPDATE SET
			name = EXCLUDED.name, description = EXCLUDED.description, address = EXCLUDED.address,
			contact = EXCLUDED.contact, email = EXCLUDED.email, phone = EXCLUDED.phone, website = EXCLUDED.website,
			latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = now()
		RETURNING `+cols,
		ownerID, in.Name, in.Description, in.Address, in.Contact, in.Email, in.Phone, in.Website, in.Latitude, in.Longitude))
}

// setLogo stores (or with nil data, removes) the owner's logo. pgx.ErrNoRows means no profile exists yet.
func (s store) setLogo(ctx context.Context, ownerID int64, data []byte, contentType *string) (Organization, error) {
	return scan(s.db.QueryRow(ctx, `
		UPDATE organizations SET logo = $2, logo_type = $3, updated_at = now()
		WHERE owner_id = $1 RETURNING `+cols, ownerID, data, contentType))
}

func (s store) logo(ctx context.Context, id int64) (data []byte, contentType string, updated time.Time, err error) {
	err = s.db.QueryRow(ctx, `
		SELECT logo, logo_type, updated_at FROM organizations WHERE id = $1 AND logo IS NOT NULL`, id,
	).Scan(&data, &contentType, &updated)
	return data, contentType, updated, err
}
