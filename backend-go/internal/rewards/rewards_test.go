package rewards

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
)

func TestNewCode(t *testing.T) {
	a, _ := newCode("Seedling")
	b, _ := newCode("Seedling")
	if !regexp.MustCompile(`^FH-SEE-[A-Z2-9]{4}-[A-Z2-9]{4}$`).MatchString(a) || a == b {
		t.Fatalf("codes %q, %q", a, b)
	}
}

// TestIssueAndRedeem needs DATABASE_URL.
func TestIssueAndRedeem(t *testing.T) {
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

	var uid int64
	email := fmt.Sprintf("reward-test-%d@example.com", time.Now().UnixNano())
	if err := pool.QueryRow(ctx, `
		INSERT INTO users (full_name, email, password_hash, role, is_verified, points) VALUES ('Reward Test', $1, 'x', 'donor', true, 60)
		RETURNING id`, email).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, uid) // cascades to rewards

	tokens := auth.NewTokens(strings.Repeat("k", 32))
	mux := http.NewServeMux()
	(&Handler{DB: pool, Tokens: tokens}).Register(mux)
	call := func(method, path, body, role string) (int, string) {
		token, _ := tokens.Sign(uid, role) // the admin is the same user here; fine for a test
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec.Code, rec.Body.String()
	}

	type list struct {
		Points  int      `json:"points"`
		Rewards []Reward `json:"rewards"`
	}
	var got list
	for range 2 { // a second read must return the same codes
		code, body := call("GET", "/api/rewards", "", "donor")
		var now list
		if err := json.Unmarshal([]byte(body), &now); code != http.StatusOK || err != nil {
			t.Fatalf("GET: %d %s", code, body)
		}
		if got.Rewards != nil && *got.Rewards[0].Code != *now.Rewards[0].Code {
			t.Fatalf("code changed between reads")
		}
		got = now
	}
	if len(got.Rewards) != 3 || got.Rewards[0].Code == nil || got.Rewards[1].Code == nil || got.Rewards[2].Code != nil || got.Rewards[2].Unlocked {
		t.Fatalf("rewards at 60 points: %+v", got.Rewards)
	}

	code := *got.Rewards[1].Code
	if status, _ := call("POST", "/api/rewards/redeem", `{"code":"`+code+`"}`, "donor"); status != http.StatusForbidden {
		t.Fatalf("donor redeem: %d", status)
	}
	if status, body := call("POST", "/api/rewards/redeem", `{"code":"`+strings.ToLower(code)+`"}`, "admin"); status != http.StatusOK || !strings.Contains(body, "Sprout") {
		t.Fatalf("redeem: %d %s", status, body)
	}
	if status, _ := call("POST", "/api/rewards/redeem", `{"code":"`+code+`"}`, "admin"); status != http.StatusConflict {
		t.Fatalf("double redeem: %d", status)
	}
	if status, _ := call("POST", "/api/rewards/redeem", `{"code":"FH-NOPE-0000"}`, "admin"); status != http.StatusNotFound {
		t.Fatalf("unknown code: %d", status)
	}
}
