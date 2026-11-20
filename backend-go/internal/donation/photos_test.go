package donation

import (
	"context"
	"os"
	"testing"

	"feedinghands/backend-go/internal/db"
)

// Old photos of finished donations go; photos of recent or still-moving donations stay.
func TestPrunePhotos(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	if err := db.Migrate(url); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	add := func(tracking, status, age string) int64 {
		var id int64
		if err := pool.QueryRow(ctx, `
			INSERT INTO donations (tracking_id, status, updated_at) VALUES ($1, $2, now() - $3::interval)
			ON CONFLICT (tracking_id) DO UPDATE SET status = $2, updated_at = now() - $3::interval
			RETURNING id`, tracking, status, age).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `INSERT INTO donation_photos (donation_id, data, content_type) VALUES ($1, '\x00', 'image/png')`, id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	old := add("FH-TEST-PRUNE-OLD", "delivered", "40 days")
	recent := add("FH-TEST-PRUNE-NEW", "delivered", "2 days")
	moving := add("FH-TEST-PRUNE-MOV", "picked_up", "40 days")
	t.Cleanup(func() {
		pool.Exec(ctx, `DELETE FROM donations WHERE id = ANY($1)`, []int64{old, recent, moving})
	})

	if _, err := (&Handler{DB: pool}).PrunePhotos(ctx); err != nil {
		t.Fatal(err)
	}
	count := func(id int64) (n int) {
		pool.QueryRow(ctx, `SELECT count(*) FROM donation_photos WHERE donation_id = $1`, id).Scan(&n)
		return n
	}
	if count(old) != 0 {
		t.Error("photo of a donation delivered 40 days ago was kept")
	}
	if count(recent) == 0 || count(moving) == 0 {
		t.Error("photo of a recent or unfinished donation was deleted")
	}
}
