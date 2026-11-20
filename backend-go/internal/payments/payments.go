// Package payments takes online money donations through Razorpay Checkout, with only the standard library:
// the server creates an order, the browser pays it, and either the checkout callback (/verify) or Razorpay's
// webhook marks it paid once its HMAC signature checks out.
package payments

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxRupees = 500000 // one donation; bigger gifts go through the team

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
	Notify *notify.Notifier // receipts; nil = none

	KeyID, KeySecret, WebhookSecret string
	BaseURL                         string // Razorpay API root; tests point it at an httptest server
	Client                          *http.Client
}

// New reads RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET. Without the key pair,
// payments are switched off (config says enabled:false and orders get 503).
func New(db *pgxpool.Pool, tokens *auth.Tokens, n *notify.Notifier) *Handler {
	return &Handler{
		DB: db, Tokens: tokens, Notify: n,
		KeyID:         os.Getenv("RAZORPAY_KEY_ID"),
		KeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
		WebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),
		BaseURL:       "https://api.razorpay.com/v1",
		Client:        &http.Client{Timeout: 15 * time.Second},
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	req := h.Tokens.Require
	mux.HandleFunc("GET /api/payments/config", h.config)
	mux.HandleFunc("POST /api/payments/order", req(h.order))
	mux.HandleFunc("POST /api/payments/verify", req(h.verify))
	mux.HandleFunc("POST /api/payments/webhook", h.webhook) // Razorpay calls this; the signature is the auth
	mux.HandleFunc("GET /api/payments/mine", req(h.mine))
}

func (h *Handler) enabled() bool { return h.KeyID != "" && h.KeySecret != "" }

// Payment is what a donor sees in their history. Amounts are whole rupees.
type Payment struct {
	ID        int64      `json:"id"`
	Amount    int64      `json:"amount"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	PaidAt    *time.Time `json:"paid_at"`
}

const cols = `id, amount_paise / 100, status, created_at, paid_at`

func scan(row pgx.Row) (Payment, error) {
	var p Payment
	err := row.Scan(&p.ID, &p.Amount, &p.Status, &p.CreatedAt, &p.PaidAt)
	return p, err
}

// toPaise converts a rupee amount to paise, or reports that it is out of bounds.
func toPaise(rupees int64) (int64, bool) {
	if rupees < 1 || rupees > maxRupees {
		return 0, false
	}
	return rupees * 100, true
}

// validSignature checks a Razorpay signature: hex(HMAC-SHA256(message, secret)), compared in constant time.
func validSignature(message, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	return hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(signature))
}

func (h *Handler) config(w http.ResponseWriter, r *http.Request) {
	if !h.enabled() {
		httpx.JSON(w, http.StatusOK, map[string]any{"enabled": false, "keyId": ""})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"enabled": true, "keyId": h.KeyID})
}

func (h *Handler) order(w http.ResponseWriter, r *http.Request) {
	if !h.enabled() {
		httpx.Error(w, http.StatusServiceUnavailable, "Online donations aren't set up yet")
		return
	}
	var in struct {
		Amount int64 `json:"amount"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	paise, ok := toPaise(in.Amount)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "Amount must be a whole number of rupees from 1 to 500000")
		return
	}
	u, _ := auth.FromContext(r.Context())
	// Razorpay receipts are at most 40 characters and only for our own bookkeeping.
	receipt := "fh_" + strconv.FormatInt(u.ID, 10) + "_" + strconv.FormatInt(time.Now().UnixMilli(), 10)
	orderID, err := h.createOrder(r.Context(), paise, receipt)
	if err != nil {
		log.Printf("razorpay create order: %v", err)
		httpx.Error(w, http.StatusBadGateway, "Could not reach the payment gateway, please try again")
		return
	}
	if _, err := h.DB.Exec(r.Context(), `
		INSERT INTO payments (user_id, amount_paise, razorpay_order_id) VALUES ($1, $2, $3)`, u.ID, paise, orderID); err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"orderId": orderID, "amount": paise, "currency": "INR", "keyId": h.KeyID})
}

// createOrder calls POST /orders and returns Razorpay's order id.
func (h *Handler) createOrder(ctx context.Context, paise int64, receipt string) (string, error) {
	body, err := json.Marshal(map[string]any{"amount": paise, "currency": "INR", "receipt": receipt})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.BaseURL+"/orders", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(h.KeyID, h.KeySecret)
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.Client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("%s: %s", resp.Status, msg)
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out); err != nil {
		return "", err
	}
	if out.ID == "" {
		return "", errors.New("response has no order id")
	}
	return out.ID, nil
}

// verify is the checkout callback: the browser forwards what Razorpay handed it.
func (h *Handler) verify(w http.ResponseWriter, r *http.Request) {
	if !h.enabled() {
		httpx.Error(w, http.StatusServiceUnavailable, "Online donations aren't set up yet")
		return
	}
	var in struct {
		OrderID   string `json:"razorpay_order_id"`
		PaymentID string `json:"razorpay_payment_id"`
		Signature string `json:"razorpay_signature"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.OrderID == "" || in.PaymentID == "" || !validSignature(in.OrderID+"|"+in.PaymentID, in.Signature, h.KeySecret) {
		httpx.Error(w, http.StatusBadRequest, "Payment could not be verified")
		return
	}
	if _, err := h.markPaid(r.Context(), in.OrderID, in.PaymentID); err != nil {
		httpx.Internal(w, r, err)
		return
	}
	p, err := scan(h.DB.QueryRow(r.Context(), `SELECT `+cols+` FROM payments WHERE razorpay_order_id = $1 AND user_id = $2`,
		in.OrderID, auth.UserID(r.Context())))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Payment not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payment": p})
}

// webhook handles Razorpay's server-to-server events; payment.captured marks the order paid.
func (h *Handler) webhook(w http.ResponseWriter, r *http.Request) {
	if h.WebhookSecret == "" {
		httpx.Error(w, http.StatusServiceUnavailable, "Webhook is not configured")
		return
	}
	// The signature covers the exact bytes, so read them raw before decoding.
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "Request body is too large")
		return
	}
	if !validSignature(string(body), r.Header.Get("X-Razorpay-Signature"), h.WebhookSecret) {
		httpx.Error(w, http.StatusBadRequest, "Invalid signature")
		return
	}
	var ev struct {
		Event   string `json:"event"`
		Payload struct {
			Payment struct {
				Entity struct {
					ID      string `json:"id"`
					OrderID string `json:"order_id"`
				} `json:"entity"`
			} `json:"payment"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(body, &ev); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Request body must be valid JSON")
		return
	}
	if e := ev.Payload.Payment.Entity; ev.Event == "payment.captured" && e.OrderID != "" && e.ID != "" {
		if _, err := h.markPaid(r.Context(), e.OrderID, e.ID); err != nil {
			httpx.Internal(w, r, err) // non-2xx makes Razorpay retry later
			return
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// markPaid records a captured payment. Only the first call for an order changes anything and sends the receipt,
// so the checkout callback and the webhook may both arrive, in either order, any number of times.
// It reports whether this call was the one that marked it paid (false also for unknown orders).
func (h *Handler) markPaid(ctx context.Context, orderID, paymentID string) (bool, error) {
	var (
		userID *int64
		paise  int64
	)
	err := h.DB.QueryRow(ctx, `
		UPDATE payments SET status = 'paid', razorpay_payment_id = $2, paid_at = now()
		WHERE razorpay_order_id = $1 AND status <> 'paid'
		RETURNING user_id, amount_paise`, orderID, paymentID).Scan(&userID, &paise)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if userID != nil {
		h.Notify.Receipt("Your FeedingHands donation receipt", fmt.Sprintf(
			"Thank you! We received your donation of Rs. %d.\n\nPayment ID: %s\nOrder ID: %s\nDate: %s\n\n- FeedingHands\n",
			paise/100, paymentID, orderID, time.Now().Format("2 Jan 2006")), *userID)
	}
	return true, nil
}

func (h *Handler) mine(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT `+cols+` FROM payments WHERE user_id = $1 ORDER BY id DESC LIMIT 200`,
		auth.UserID(r.Context()))
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	payments, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Payment, error) { return scan(row) })
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payments": payments})
}
