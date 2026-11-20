package admin

// End-to-end tests of accounts, verification and reports over HTTP against a real Postgres.
// They need DATABASE_URL (CI sets it) and skip without it.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/organization"

	"github.com/jackc/pgx/v5/pgxpool"
)

type env struct {
	t    *testing.T
	srv  *httptest.Server
	pool *pgxpool.Pool
}

func setup(t *testing.T) *env {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.Migrate(url); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Connect(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	tokens := auth.NewTokens(strings.Repeat("test-secret-", 4))
	tokens.DB = pool
	mux := http.NewServeMux()
	(&auth.Handler{DB: pool, Tokens: tokens, ExposeOTP: true, Limit: httpx.NewLimiter(1e6, time.Minute, false)}).Register(mux)
	(&organization.Handler{DB: pool, Tokens: tokens}).Register(mux)
	(&Handler{DB: pool, Tokens: tokens}).Register(mux)
	srv := httptest.NewServer(mux)
	t.Cleanup(func() {
		srv.Close()
		// Remove what the test created; the org first, or it would outlive its owner in the public directory.
		ctx := context.Background()
		_, _ = pool.Exec(ctx, `DELETE FROM organizations WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'admintest-%@example.com')`)
		_, _ = pool.Exec(ctx, `DELETE FROM donations WHERE tracking_id LIKE 'FH-TEST-%'`)
		_, _ = pool.Exec(ctx, `DELETE FROM users WHERE email LIKE 'admintest-%@example.com'`)
		pool.Close()
	})
	return &env{t: t, srv: srv, pool: pool}
}

// call sends a JSON request and checks the status; it returns the decoded body.
func (e *env) call(method, path, token string, body any, want int) map[string]any {
	e.t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, e.srv.URL+path, rd)
	req.Header.Set("Content-Type", "application/json")
	return e.do(req, token, want)
}

func (e *env) upload(path, token, field string, data []byte, want int) map[string]any {
	e.t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile(field, "file")
	fw.Write(data)
	mw.Close()
	req, _ := http.NewRequest(http.MethodPut, e.srv.URL+path, &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return e.do(req, token, want)
}

func (e *env) do(req *http.Request, token string, want int) map[string]any {
	e.t.Helper()
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	if res.StatusCode != want {
		e.t.Fatalf("%s %s = %d %v, want %d", req.Method, req.URL.Path, res.StatusCode, out, want)
	}
	return out
}

var seq atomic.Int64

// newUser signs up, verifies and picks role ("admin" is granted in SQL). It returns email, user id and token.
func (e *env) newUser(role string) (string, int64, string) {
	e.t.Helper()
	email := fmt.Sprintf("admintest-%d-%d@example.com", time.Now().UnixNano(), seq.Add(1))
	signup := e.call("POST", "/api/auth/signup", "", map[string]string{"fullName": "Test " + role, "email": email, "password": "Password#1"}, 201)
	v := e.call("POST", "/api/auth/verify-otp", "", map[string]string{"email": email, "token": signup["otp"].(string)}, 200)
	id := int64(v["user"].(map[string]any)["id"].(float64))
	token := v["access_token"].(string)
	if role == "admin" {
		if _, err := e.pool.Exec(context.Background(), `UPDATE users SET role = 'admin' WHERE id = $1`, id); err != nil {
			e.t.Fatal(err)
		}
	} else {
		token = e.call("PATCH", "/api/auth/role", token, map[string]string{"role": role}, 200)["access_token"].(string)
	}
	return email, id, token
}

// waitNextSecond makes the next password change land in a later second than every token issued so far
// (JWT iat has whole-second precision).
func waitNextSecond() {
	time.Sleep(time.Until(time.Now().Truncate(time.Second).Add(time.Second + 10*time.Millisecond)))
}

func TestPasswordReset(t *testing.T) {
	e := setup(t)
	email, _, oldToken := e.newUser("donor")

	if out := e.call("POST", "/api/auth/forgot-password", "", map[string]string{"email": "nobody-" + email}, 200); out["otp"] != nil {
		t.Fatal("unknown email got a code")
	}
	code := e.call("POST", "/api/auth/forgot-password", "", map[string]string{"email": email}, 200)["otp"].(string)
	// The reset code is not a sign-in code.
	e.call("POST", "/api/auth/verify-otp", "", map[string]string{"email": email, "token": code}, 400)
	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	e.call("POST", "/api/auth/reset-password", "", map[string]string{"email": email, "token": wrong, "password": "NewPassword#2"}, 400)

	waitNextSecond()
	out := e.call("POST", "/api/auth/reset-password", "", map[string]string{"email": email, "token": code, "password": "NewPassword#2"}, 200)
	e.call("GET", "/api/auth/me", out["access_token"].(string), nil, 200)
	e.call("GET", "/api/auth/me", oldToken, nil, 401)
	e.call("POST", "/api/auth/reset-password", "", map[string]string{"email": email, "token": code, "password": "Again#12345"}, 400) // used up
	e.call("POST", "/api/auth/signin", "", map[string]string{"email": email, "password": "Password#1"}, 401)
	e.call("POST", "/api/auth/signin", "", map[string]string{"email": email, "password": "NewPassword#2"}, 200)
}

func TestUnverifiedGetsNoResetCode(t *testing.T) {
	e := setup(t)
	email := fmt.Sprintf("admintest-%d@example.com", time.Now().UnixNano())
	e.call("POST", "/api/auth/signup", "", map[string]string{"fullName": "Unverified", "email": email, "password": "Password#1"}, 201)
	if _, err := e.pool.Exec(context.Background(), `UPDATE users SET otp_sent_at = now() - interval '2 minutes' WHERE email = $1`, email); err != nil {
		t.Fatal(err)
	}
	if out := e.call("POST", "/api/auth/forgot-password", "", map[string]string{"email": email}, 200); out["otp"] != nil {
		t.Fatal("unverified account got a reset code")
	}
}

func TestChangePasswordRevokesOldToken(t *testing.T) {
	e := setup(t)
	_, _, oldToken := e.newUser("donor")
	e.call("PATCH", "/api/auth/password", oldToken, map[string]string{"currentPassword": "wrong-one", "newPassword": "NewPassword#2"}, 400)
	waitNextSecond()
	out := e.call("PATCH", "/api/auth/password", oldToken, map[string]string{"currentPassword": "Password#1", "newPassword": "NewPassword#2"}, 200)
	e.call("GET", "/api/auth/me", oldToken, nil, 401)
	newToken := out["access_token"].(string)
	me := e.call("PATCH", "/api/auth/me", newToken, map[string]any{"fullName": "Renamed", "emailNotifications": false}, 200)["user"].(map[string]any)
	if me["fullName"] != "Renamed" || me["emailNotifications"] != false {
		t.Fatalf("profile not updated: %v", me)
	}
	e.call("DELETE", "/api/auth/me", newToken, map[string]string{"password": "Password#1"}, 400)
	e.call("DELETE", "/api/auth/me", newToken, map[string]string{"password": "NewPassword#2"}, 204)
	e.call("GET", "/api/auth/me", newToken, nil, 401)
}

func TestSuspensionAndAdminOnly(t *testing.T) {
	e := setup(t)
	email, donorID, donor := e.newUser("donor")
	_, adminID, admin := e.newUser("admin")

	e.call("GET", "/api/admin/overview", donor, nil, 403)
	e.call("GET", "/api/admin/overview", "", nil, 401)
	ov := e.call("GET", "/api/admin/overview", admin, nil, 200)
	if ov["usersByRole"].(map[string]any)["admin"] == nil {
		t.Fatalf("overview: %v", ov)
	}
	e.call("PATCH", fmt.Sprintf("/api/admin/users/%d", adminID), admin, map[string]any{"suspended": true}, 400)
	e.call("PATCH", fmt.Sprintf("/api/admin/users/%d", adminID), admin, map[string]any{"role": "donor"}, 400)

	u := e.call("PATCH", fmt.Sprintf("/api/admin/users/%d", donorID), admin, map[string]any{"suspended": true}, 200)["user"].(map[string]any)
	if u["suspended"] != true {
		t.Fatalf("not suspended: %v", u)
	}
	if out := e.call("GET", "/api/auth/me", donor, nil, 403); out["code"] != "suspended" {
		t.Fatalf("authed call: %v", out)
	}
	if out := e.call("POST", "/api/auth/signin", "", map[string]string{"email": email, "password": "Password#1"}, 403); out["code"] != "suspended" {
		t.Fatalf("signin: %v", out)
	}
	if out := e.call("POST", "/api/auth/forgot-password", "", map[string]string{"email": email}, 200); out["otp"] != nil {
		t.Fatal("suspended account got a reset code")
	}
	e.call("PATCH", fmt.Sprintf("/api/admin/users/%d", donorID), admin, map[string]any{"suspended": false}, 200)
	e.call("GET", "/api/auth/me", donor, nil, 200)

	list := e.call("GET", "/api/admin/users?q="+email, admin, nil, 200)["users"].([]any)
	if len(list) != 1 {
		t.Fatalf("search found %d users", len(list))
	}
}

func TestOrganizationVerification(t *testing.T) {
	e := setup(t)
	_, _, ngo := e.newUser("organization")
	_, _, admin := e.newUser("admin")

	o := e.call("PUT", "/api/organizations/me", ngo, map[string]any{"name": "Test Kitchen", "registrationNo": "MH/2024/0001"}, 200)["organization"].(map[string]any)
	if o["verificationStatus"] != "pending" || o["registrationNo"] != "MH/2024/0001" {
		t.Fatalf("new profile: %v", o)
	}
	id := int64(o["id"].(float64))
	inDirectory := func() bool {
		for _, x := range e.call("GET", "/api/organizations", "", nil, 200)["organizations"].([]any) {
			if int64(x.(map[string]any)["id"].(float64)) == id {
				return true
			}
		}
		return false
	}
	if inDirectory() {
		t.Fatal("pending organization is in the public directory")
	}
	e.call("PATCH", fmt.Sprintf("/api/admin/organizations/%d/verification", id), ngo, map[string]string{"status": "verified"}, 403)

	path := fmt.Sprintf("/api/admin/organizations/%d/verification", id)
	o = e.call("PATCH", path, admin, map[string]string{"status": "rejected", "note": "Upload your certificate"}, 200)["organization"].(map[string]any)
	if o["verificationStatus"] != "rejected" || o["reviewNote"] != "Upload your certificate" || o["ownerEmail"] == nil {
		t.Fatalf("rejected: %v", o)
	}
	e.upload("/api/organizations/me/document", ngo, "document", []byte("just text"), 415)
	pdf := []byte("%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n")
	o = e.upload("/api/organizations/me/document", ngo, "document", pdf, 200)["organization"].(map[string]any)
	if o["verificationStatus"] != "pending" || o["hasDocument"] != true {
		t.Fatalf("after upload: %v", o)
	}

	// Saving a rejected profile also sends it back to review.
	e.call("PATCH", path, admin, map[string]string{"status": "rejected", "note": "Blurry"}, 200)
	o = e.call("PUT", "/api/organizations/me", ngo, map[string]any{"name": "Test Kitchen", "registrationNo": "MH/2024/0001"}, 200)["organization"].(map[string]any)
	if o["verificationStatus"] != "pending" {
		t.Fatalf("after save: %v", o)
	}

	pending := e.call("GET", "/api/admin/organizations?status=pending", admin, nil, 200)["organizations"].([]any)
	if len(pending) == 0 {
		t.Fatal("pending queue is empty")
	}
	req, _ := http.NewRequest("GET", e.srv.URL+fmt.Sprintf("/api/admin/organizations/%d/document", id), nil)
	req.Header.Set("Authorization", "Bearer "+admin)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || !bytes.Equal(got, pdf) || !strings.HasPrefix(res.Header.Get("Content-Disposition"), "attachment") ||
		res.Header.Get("Content-Type") != "application/pdf" {
		t.Fatalf("document download: %d %v", res.StatusCode, res.Header)
	}

	e.call("PATCH", path, admin, map[string]string{"status": "verified"}, 200)
	if !inDirectory() {
		t.Fatal("verified organization is missing from the public directory")
	}
}

func TestReports(t *testing.T) {
	e := setup(t)
	_, donorID, donor := e.newUser("donor")
	_, _, stranger := e.newUser("donor")
	_, _, admin := e.newUser("admin")

	var donationID int64
	tracking := fmt.Sprintf("FH-TEST-%d", time.Now().UnixNano())
	if err := e.pool.QueryRow(context.Background(), `
		INSERT INTO donations (tracking_id, donor_id) VALUES ($1, $2) RETURNING id`, tracking, donorID).Scan(&donationID); err != nil {
		t.Fatal(err)
	}
	body := map[string]any{"donationId": donationID, "reason": "Food was spoiled"}
	e.call("POST", "/api/reports", stranger, body, 404)
	rep := e.call("POST", "/api/reports", donor, body, 201)["report"].(map[string]any)
	if rep["status"] != "open" || rep["trackingId"] != tracking || rep["reporterName"] != "Test donor" {
		t.Fatalf("report: %v", rep)
	}
	path := fmt.Sprintf("/api/admin/reports/%d", int64(rep["id"].(float64)))
	e.call("PATCH", path, donor, map[string]any{"status": "resolved"}, 403)
	rep = e.call("PATCH", path, admin, map[string]any{"status": "resolved", "resolution": "Pulled the listing", "cancelDonation": true}, 200)["report"].(map[string]any)
	if rep["status"] != "resolved" || rep["resolved_at"] == nil {
		t.Fatalf("resolved: %v", rep)
	}
	e.call("PATCH", path, admin, map[string]any{"status": "dismissed"}, 409)

	var status, label string
	if err := e.pool.QueryRow(context.Background(), `
		SELECT d.status, e.label FROM donations d JOIN donation_events e ON e.donation_id = d.id WHERE d.id = $1`, donationID,
	).Scan(&status, &label); err != nil {
		t.Fatal(err)
	}
	if status != "cancelled" || label != "Cancelled by admin" {
		t.Fatalf("donation: %s / %s", status, label)
	}

	// A delivered donation can't be cancelled; the report stays open.
	if _, err := e.pool.Exec(context.Background(), `UPDATE donations SET status = 'delivered' WHERE id = $1`, donationID); err != nil {
		t.Fatal(err)
	}
	rep = e.call("POST", "/api/reports", admin, body, 201)["report"].(map[string]any)
	path = fmt.Sprintf("/api/admin/reports/%d", int64(rep["id"].(float64)))
	e.call("PATCH", path, admin, map[string]any{"status": "resolved", "cancelDonation": true}, 409)
	open := e.call("GET", "/api/admin/reports?status=open", admin, nil, 200)["reports"].([]any)
	found := false
	for _, r := range open {
		found = found || r.(map[string]any)["id"] == rep["id"]
	}
	if !found {
		t.Fatal("report should still be open after the failed cancel")
	}
}
