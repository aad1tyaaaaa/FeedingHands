// Package notify emails users about things that happened, in the background, after the work is committed.
// A failed or slow email never fails the request that triggered it.
package notify

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"feedinghands/backend-go/internal/mail"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maxRecipients caps one fan-out (the "new donation nearby" email) so a busy city can't stall the sender.
const maxRecipients = 50

type Notifier struct {
	DB       *pgxpool.Pool
	Mail     *mail.Sender // nil = log instead of sending
	RadiusKm float64      // how far "nearby" reaches for new-donation alerts
}

// New reads NOTIFY_RADIUS_KM (default 10).
func New(db *pgxpool.Pool, m *mail.Sender) *Notifier {
	radius, err := strconv.ParseFloat(os.Getenv("NOTIFY_RADIUS_KM"), 64)
	if err != nil || radius <= 0 {
		radius = 10
	}
	return &Notifier{DB: db, Mail: m, RadiusKm: radius}
}

// Every recipient query keeps only users who want email and aren't suspended.
const wants = ` u.email IS NOT NULL AND u.email_notifications AND u.suspended_at IS NULL`

// Users emails these users.
func (n *Notifier) Users(subject, body string, ids ...int64) {
	n.send(subject, body, `SELECT u.email FROM users u WHERE u.id = ANY($1) AND`+wants, ids)
}

// Receipt emails these users even if they turned notifications off: a payment receipt isn't a notification.
func (n *Notifier) Receipt(subject, body string, ids ...int64) {
	n.send(subject, body, `SELECT u.email FROM users u WHERE u.id = ANY($1) AND u.email IS NOT NULL`, ids)
}

// Orgs emails the owners of these organizations.
func (n *Notifier) Orgs(subject, body string, ids ...int64) {
	n.send(subject, body, `
		SELECT u.email FROM organizations o JOIN users u ON u.id = o.owner_id
		WHERE o.id = ANY($1) AND`+wants, ids)
}

// Nearby emails the owners of verified organizations within RadiusKm of (lat, lng), closest first.
func (n *Notifier) Nearby(subject, body string, lat, lng float64) {
	n.send(subject, body, `
		SELECT email FROM (
			SELECT u.email, 6371 * 2 * asin(sqrt(
				power(sin(radians(o.latitude - $1) / 2), 2) +
				cos(radians($1)) * cos(radians(o.latitude)) * power(sin(radians(o.longitude - $2) / 2), 2))) AS km
			FROM organizations o JOIN users u ON u.id = o.owner_id
			WHERE o.verification_status = 'verified' AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL AND`+wants+`
		) near WHERE km <= $3 ORDER BY km LIMIT `+strconv.Itoa(maxRecipients), lat, lng, n.RadiusKm)
}

// send looks up the recipients and mails them on a goroutine. Safe on a nil Notifier (tests).
func (n *Notifier) send(subject, body, sql string, args ...any) {
	if n == nil || n.DB == nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		rows, err := n.DB.Query(ctx, sql, args...)
		if err != nil {
			log.Printf("notify %q: %v", subject, err)
			return
		}
		emails, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			log.Printf("notify %q: %v", subject, err)
			return
		}
		for _, to := range emails {
			if ctx.Err() != nil {
				log.Printf("notify %q: timed out", subject)
				return
			}
			if n.Mail == nil {
				log.Printf("notify (SMTP not configured) %s: %s", to, subject)
				continue
			}
			if err := n.Mail.Send(to, subject, body); err != nil {
				log.Printf("notify %q to %s: %v", subject, to, err)
			}
		}
	}()
}
