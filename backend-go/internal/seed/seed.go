// Package seed loads the demo personas: three verified accounts per role, with their profiles and a few
// donations at different stages. It is idempotent and main only runs it when SEED_DEMO_DATA=true,
// which production must never set: everyone knows these passwords.
package seed

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// Password is shared by every demo persona.
const Password = "Demo@1234"

type persona struct {
	name, email, phone, role string
}

var personas = []persona{
	{"Aarav Sharma", "donor1@feedinghands.dev", "+919800000001", "donor"},
	{"Diya Patel", "donor2@feedinghands.dev", "+919800000002", "donor"},
	{"Kabir Mehta", "donor3@feedinghands.dev", "+919800000003", "donor"},
	{"Rohan Iyer", "volunteer1@feedinghands.dev", "+919800000011", "volunteer"},
	{"Sneha Kulkarni", "volunteer2@feedinghands.dev", "+919800000012", "volunteer"},
	{"Arjun Nair", "volunteer3@feedinghands.dev", "+919800000013", "volunteer"},
	{"Meera Joshi", "ngo1@feedinghands.dev", "+919800000021", "organization"},
	{"Vikram Desai", "ngo2@feedinghands.dev", "+919800000022", "organization"},
	{"Ananya Rao", "ngo3@feedinghands.dev", "+919800000023", "organization"},
	{"Farhan Shaikh", "biogas1@feedinghands.dev", "+919800000031", "biogas"},
	{"Priya Menon", "biogas2@feedinghands.dev", "+919800000032", "biogas"},
	{"Siddharth Rane", "biogas3@feedinghands.dev", "+919800000033", "biogas"},
}

type org struct {
	ownerEmail, name, description, address, phone string
	lat, lng                                      float64
}

var orgs = []org{
	{"ngo1@feedinghands.dev", "Annapurna Food Bank", "Community kitchen serving 400 meals a day.",
		"Ghatkopar East, Mumbai 400077", "+912225000001", 19.0790, 72.9080},
	{"ngo2@feedinghands.dev", "Roti Ghar Trust", "Night shelter meals and school lunches.",
		"Kurla West, Mumbai 400070", "+912225000002", 19.0726, 72.8826},
	{"ngo3@feedinghands.dev", "Seva Sahyog Foundation", "Ration kits for families in need.",
		"Andheri East, Mumbai 400069", "+912225000003", 19.1136, 72.8697},
}

type donation struct {
	tracking, donorEmail, kind, food, location, contact string
	lat, lng                                            float64
	// steps after "available", each taken by the given email
	steps []step
}

type step struct{ status, byEmail string }

var donations = []donation{
	{"FH-DEMO0001", "donor1@feedinghands.dev", "Vegetarian", `[{"name":"Veg pulao","quantity":"40"},{"name":"Dal","quantity":"40"}]`,
		"Vidyavihar West, Mumbai 400086", "+919800000001", 19.0790, 72.8970, nil},
	{"FH-DEMO0002", "donor2@feedinghands.dev", "Packaged Food", `[{"name":"Biscuit packs","quantity":"120"}]`,
		"Chembur, Mumbai 400071", "+919800000002", 19.0522, 72.9005,
		[]step{{"requested", "ngo1@feedinghands.dev"}}},
	{"FH-DEMO0003", "donor3@feedinghands.dev", "Non-Vegetarian", `[{"name":"Chicken biryani","quantity":"60"}]`,
		"Powai, Mumbai 400076", "+919800000003", 19.1176, 72.9060,
		[]step{{"requested", "ngo2@feedinghands.dev"}, {"picked_up", "volunteer1@feedinghands.dev"}}},
	{"FH-DEMO0004", "donor1@feedinghands.dev", "Vegetarian", `[{"name":"Chapati","quantity":"150"},{"name":"Sabzi","quantity":"50"}]`,
		"Ghatkopar West, Mumbai 400086", "+919800000001", 19.0860, 72.9080,
		[]step{{"requested", "ngo1@feedinghands.dev"}, {"picked_up", "volunteer2@feedinghands.dev"},
			{"in_transit", "volunteer2@feedinghands.dev"}, {"delivered", "volunteer2@feedinghands.dev"}}},
}

var labels = map[string]string{
	"available": "Donation posted", "requested": "Claimed by NGO", "picked_up": "Picked up",
	"in_transit": "On the way", "delivered": "Delivered",
}

// Demo inserts whatever is missing and leaves existing rows alone.
func Demo(ctx context.Context, pool *pgxpool.Pool) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		for _, p := range personas {
			if _, err := tx.Exec(ctx, `
				INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
				VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT DO NOTHING`,
				p.name, p.email, p.phone, string(hash), p.role); err != nil {
				return fmt.Errorf("persona %s: %w", p.email, err)
			}
			if p.role == "volunteer" {
				if _, err := tx.Exec(ctx, `
					INSERT INTO volunteers (user_id, name, email, phone, address)
					SELECT id, full_name, email, phone, 'Mumbai' FROM users WHERE email = $1
					ON CONFLICT (user_id) DO NOTHING`, p.email); err != nil {
					return err
				}
			}
		}
		for _, o := range orgs {
			if _, err := tx.Exec(ctx, `
				INSERT INTO organizations (owner_id, name, description, address, contact, email, phone, latitude, longitude)
				SELECT id, $2, $3, $4, full_name, email, $5, $6, $7 FROM users WHERE email = $1
				ON CONFLICT (owner_id) DO NOTHING`,
				o.ownerEmail, o.name, o.description, o.address, o.phone, o.lat, o.lng); err != nil {
				return fmt.Errorf("organization %s: %w", o.name, err)
			}
		}
		for _, d := range donations {
			if err := seedDonation(ctx, tx, d); err != nil {
				return fmt.Errorf("donation %s: %w", d.tracking, err)
			}
		}
		return nil
	})
}

func seedDonation(ctx context.Context, tx pgx.Tx, d donation) error {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO donations (tracking_id, donor_id, type, food_details, location, latitude, longitude, contact, status_label, points)
		SELECT $1, id, $3, $4, $5, $6, $7, $8, 'Donation posted', 10 FROM users WHERE email = $2
		ON CONFLICT (tracking_id) DO NOTHING RETURNING id`,
		d.tracking, d.donorEmail, d.kind, d.food, d.location, d.lat, d.lng, d.contact).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already seeded
	}
	if err != nil {
		return err
	}
	event := func(status, email string) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO donation_events (donation_id, status, label, actor_id)
			SELECT $1, $2, $3, id FROM users WHERE email = $4`, id, status, labels[status], email)
		return err
	}
	if err := event("available", d.donorEmail); err != nil {
		return err
	}
	for _, s := range d.steps {
		_, err := tx.Exec(ctx, `
			UPDATE donations SET status = $2, status_label = $3, updated_at = now(),
				organization_id = COALESCE((SELECT o.id FROM organizations o JOIN users u ON u.id = o.owner_id WHERE u.email = $4), organization_id),
				volunteer_id = COALESCE((SELECT v.id FROM volunteers v JOIN users u ON u.id = v.user_id WHERE u.email = $4), volunteer_id)
			WHERE id = $1`, id, s.status, labels[s.status], s.byEmail)
		if err != nil {
			return err
		}
		if err := event(s.status, s.byEmail); err != nil {
			return err
		}
		if s.status == "delivered" {
			if _, err := tx.Exec(ctx, `UPDATE users SET points = points + 10 WHERE email = $1`, d.donorEmail); err != nil {
				return err
			}
		}
	}
	log.Printf("seeded demo donation %s", d.tracking)
	return nil
}
