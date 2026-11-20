package payments

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
)

func sign(message, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	return hex.EncodeToString(mac.Sum(nil))
}

func TestValidSignature(t *testing.T) {
	good := sign("order_1|pay_1", "secret")
	cases := []struct {
		name, msg, sig, secret string
		want                   bool
	}{
		{"valid", "order_1|pay_1", good, "secret", true},
		{"tampered message", "order_1|pay_2", good, "secret", false},
		{"tampered signature", "order_1|pay_1", strings.Replace(good, good[:1], "x", 1), "secret", false},
		{"wrong secret", "order_1|pay_1", good, "other", false},
		{"empty signature", "order_1|pay_1", "", "secret", false},
	}
	for _, c := range cases {
		if got := validSignature(c.msg, c.sig, c.secret); got != c.want {
			t.Errorf("%s: validSignature = %v, want %v", c.name, got, c.want)
		}
	}
}

func TestToPaise(t *testing.T) {
	for rupees, want := range map[int64]int64{-5: 0, 0: 0, 1: 100, 500000: 50000000, 500001: 0} {
		got, ok := toPaise(rupees)
		if got != want || ok != (want != 0) {
			t.Errorf("toPaise(%d) = %d, %v", rupees, got, ok)
		}
	}
}

// TestFlow runs order -> verify -> webhook against Postgres and a fake Razorpay. Needs DATABASE_URL.
func TestFlow(t *testing.T) {
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
	email := fmt.Sprintf("pay-test-%d@example.com", time.Now().UnixNano())
	if err := pool.QueryRow(ctx, `
		INSERT INTO users (full_name, email, password_hash, role, is_verified) VALUES ('Pay Test', $1, 'x', 'donor', true)
		RETURNING id`, email).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	defer pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, uid)
	defer pool.Exec(ctx, `DELETE FROM payments WHERE user_id = $1`, uid)

	orderID := fmt.Sprintf("order_test_%d", time.Now().UnixNano())
	razorpay := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Amount int64 `json:"amount"`
		}
		if id, secret, _ := r.BasicAuth(); id != "key" || secret != "secret" || r.URL.Path != "/orders" {
			http.Error(w, "bad auth", http.StatusUnauthorized)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.Amount != 25000 {
			http.Error(w, "bad amount", http.StatusBadRequest)
			return
		}
		fmt.Fprintf(w, `{"id":%q,"amount":25000,"currency":"INR"}`, orderID)
	}))
	defer razorpay.Close()

	tokens := auth.NewTokens(strings.Repeat("k", 32))
	h := &Handler{DB: pool, Tokens: tokens, KeyID: "key", KeySecret: "secret", WebhookSecret: "hook",
		BaseURL: razorpay.URL, Client: razorpay.Client()}
	mux := http.NewServeMux()
	h.Register(mux)
	token, _ := tokens.Sign(uid, "donor")
	call := func(path, body string, header map[string]string) (int, string) {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		for k, v := range header {
			req.Header.Set(k, v)
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec.Code, rec.Body.String()
	}

	if code, body := call("/api/payments/order", `{"amount":0}`, nil); code != http.StatusBadRequest {
		t.Fatalf("amount 0: %d %s", code, body)
	}
	if code, body := call("/api/payments/order", `{"amount":250}`, nil); code != http.StatusOK || !strings.Contains(body, orderID) {
		t.Fatalf("order: %d %s", code, body)
	}

	verify := func(sig string) (int, string) {
		return call("/api/payments/verify", fmt.Sprintf(
			`{"razorpay_order_id":%q,"razorpay_payment_id":"pay_1_%s","razorpay_signature":%q}`, orderID, orderID, sig), nil)
	}
	if code, _ := verify(sign(orderID+"|pay_1_"+orderID, "wrong")); code != http.StatusBadRequest {
		t.Fatalf("tampered verify: %d", code)
	}
	for range 2 { // the second call must be a harmless repeat
		if code, body := verify(sign(orderID+"|pay_1_"+orderID, "secret")); code != http.StatusOK || !strings.Contains(body, `"status":"paid"`) {
			t.Fatalf("verify: %d %s", code, body)
		}
	}
	if first, err := h.markPaid(ctx, orderID, "pay_1_"+orderID); err != nil || first {
		t.Fatalf("markPaid again = %v, %v; want false (already paid)", first, err)
	}

	event := fmt.Sprintf(`{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1_%s","order_id":%q}}}}`, orderID, orderID)
	if code, _ := call("/api/payments/webhook", event, map[string]string{"X-Razorpay-Signature": sign(event+" ", "hook")}); code != http.StatusBadRequest {
		t.Fatalf("tampered webhook: %d", code)
	}
	if code, body := call("/api/payments/webhook", event, map[string]string{"X-Razorpay-Signature": sign(event, "hook")}); code != http.StatusOK {
		t.Fatalf("webhook: %d %s", code, body)
	}
	var paid int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM payments WHERE user_id = $1 AND status = 'paid'`, uid).Scan(&paid); err != nil || paid != 1 {
		t.Fatalf("paid rows = %d, %v", paid, err)
	}
}
