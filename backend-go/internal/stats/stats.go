// Package stats serves platform-wide aggregates for dashboards and forecasts. No personal data except
// the first names of top donors, which the Food Heroes page celebrates.
package stats

import (
	"context"
	"net/http"

	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	DB *pgxpool.Pool
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/stats", h.get)
}

type week struct {
	Week      string `json:"week"` // Monday, YYYY-MM-DD
	Donations int    `json:"donations"`
	Delivered int    `json:"delivered"`
}

type count struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type hero struct {
	Name   string `json:"name"`
	Points int    `json:"points"`
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var t struct {
		Donations       int `json:"donations"`
		Delivered       int `json:"delivered"`
		Active          int `json:"active"`
		Cancelled       int `json:"cancelled"`
		Donors          int `json:"donors"`
		Volunteers      int `json:"volunteers"`
		Organizations   int `json:"organizations"`
		BiogasPickups   int `json:"biogas_pickups"`
		BiogasCollected int `json:"biogas_collected"`
	}
	err := h.DB.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM donations),
			(SELECT count(*) FROM donations WHERE status = 'delivered'),
			(SELECT count(*) FROM donations WHERE status NOT IN ('delivered', 'cancelled')),
			(SELECT count(*) FROM donations WHERE status = 'cancelled'),
			(SELECT count(*) FROM users WHERE role = 'donor'),
			(SELECT count(*) FROM volunteers),
			(SELECT count(*) FROM organizations),
			(SELECT count(*) FROM biogas_donations),
			(SELECT count(*) FROM biogas_donations WHERE status = 'collected')`,
	).Scan(&t.Donations, &t.Delivered, &t.Active, &t.Cancelled, &t.Donors, &t.Volunteers, &t.Organizations,
		&t.BiogasPickups, &t.BiogasCollected)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	// The last 12 weeks, zero-filled so charts and forecasts get an unbroken series.
	weeks, err := collect(ctx, h.DB, `
		SELECT to_char(g.week, 'YYYY-MM-DD'),
		       count(d.id),
		       count(d.id) FILTER (WHERE d.status = 'delivered')
		FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') AS g(week)
		LEFT JOIN donations d ON date_trunc('week', d.created_at) = g.week
		GROUP BY g.week ORDER BY g.week`,
		func(row pgx.CollectableRow) (week, error) {
			var x week
			return x, row.Scan(&x.Week, &x.Donations, &x.Delivered)
		})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	byType, err := collect(ctx, h.DB, `
		SELECT type, count(*) FROM donations GROUP BY type ORDER BY count(*) DESC LIMIT 10`,
		func(row pgx.CollectableRow) (count, error) {
			var x count
			return x, row.Scan(&x.Label, &x.Count)
		})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	heroes, err := collect(ctx, h.DB, `
		SELECT split_part(full_name, ' ', 1), points FROM users
		WHERE role = 'donor' AND points > 0 ORDER BY points DESC, id LIMIT 10`,
		func(row pgx.CollectableRow) (hero, error) {
			var x hero
			return x, row.Scan(&x.Name, &x.Points)
		})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"totals": t, "weekly": weeks, "by_type": byType, "top_donors": heroes})
}

func collect[T any](ctx context.Context, db *pgxpool.Pool, sql string, fn pgx.RowToFunc[T]) ([]T, error) {
	rows, err := db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, fn)
}
