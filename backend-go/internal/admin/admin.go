// Package admin serves the admin console (users, organization verification, reports) and lets people
// involved in a donation report a problem with it.
package admin

import (
	"cmp"
	"errors"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/mail"
	"feedinghands/backend-go/internal/organization"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
	Mail   *mail.Sender // nil: emails are logged instead (development only)
}

func (h *Handler) Register(mux *http.ServeMux) {
	admin := func(next http.HandlerFunc) http.HandlerFunc { return h.Tokens.RequireRole("admin", next) }

	mux.HandleFunc("GET /api/admin/overview", admin(h.overview))
	mux.HandleFunc("GET /api/admin/users", admin(h.listUsers))
	mux.HandleFunc("PATCH /api/admin/users/{id}", admin(h.updateUser))
	mux.HandleFunc("GET /api/admin/organizations", admin(h.listOrganizations))
	mux.HandleFunc("GET /api/admin/organizations/{id}/document", admin(h.document))
	mux.HandleFunc("PATCH /api/admin/organizations/{id}/verification", admin(h.verify))
	mux.HandleFunc("GET /api/admin/reports", admin(h.listReports))
	mux.HandleFunc("PATCH /api/admin/reports/{id}", admin(h.resolveReport))
	mux.HandleFunc("POST /api/reports", h.Tokens.Require(h.createReport))
}

// pathID reads {id}; on failure it has already answered 404.
func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
	}
	return id, err == nil
}

// notify emails someone without holding up or failing the request.
func (h *Handler) notify(to *string, subject, body string) {
	if to == nil || *to == "" {
		return
	}
	if h.Mail == nil {
		log.Printf("mail to %s (SMTP not configured): %s\n%s", *to, subject, body)
		return
	}
	go func() {
		if err := h.Mail.Send(*to, subject, body); err != nil {
			log.Printf("mail to %s: %v", *to, err)
		}
	}()
}

func (h *Handler) overview(w http.ResponseWriter, r *http.Request) {
	var out struct {
		UsersByRole          map[string]int `json:"usersByRole"`
		PendingOrganizations int            `json:"pendingOrganizations"`
		OpenReports          int            `json:"openReports"`
		DonationsByStatus    map[string]int `json:"donationsByStatus"`
	}
	err := h.DB.QueryRow(r.Context(), `
		SELECT
			(SELECT COALESCE(json_object_agg(role, n), '{}') FROM (SELECT role, count(*) n FROM users GROUP BY role) x),
			(SELECT count(*) FROM organizations WHERE verification_status = 'pending'),
			(SELECT count(*) FROM reports WHERE status = 'open'),
			(SELECT COALESCE(json_object_agg(status, n), '{}') FROM (SELECT status, count(*) n FROM donations GROUP BY status) y)`,
	).Scan(&out.UsersByRole, &out.PendingOrganizations, &out.OpenReports, &out.DonationsByStatus)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// ---- users ----

type user struct {
	ID         int64     `json:"id"`
	FullName   string    `json:"fullName"`
	Email      *string   `json:"email"`
	Phone      *string   `json:"phone"`
	Role       string    `json:"role"`
	IsVerified bool      `json:"isVerified"`
	Points     int       `json:"points"`
	Suspended  bool      `json:"suspended"`
	CreatedAt  time.Time `json:"created_at"`
}

const userCols = `id, full_name, email, phone, role, is_verified, points, suspended_at IS NOT NULL, created_at`

// roles an admin may assign.
var roles = append([]string{"admin"}, auth.SelfServiceRoles...)

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	before, err := strconv.ParseInt(cmp.Or(q.Get("before"), "0"), 10, 64)
	limit, err2 := strconv.Atoi(cmp.Or(q.Get("limit"), "50"))
	if err != nil || err2 != nil || limit < 1 || limit > 200 {
		httpx.Error(w, http.StatusBadRequest, "before must be a user id and limit 1 to 200")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT `+userCols+` FROM users
		WHERE ($1::text = '' OR full_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%' OR phone ILIKE '%' || $1 || '%')
			AND ($2::text = '' OR role = $2)
			AND ($3::bigint = 0 OR id < $3)
		ORDER BY id DESC LIMIT $4`,
		strings.TrimSpace(q.Get("q")), q.Get("role"), before, limit)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	users, err := pgx.CollectRows(rows, pgx.RowToStructByPos[user])
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	var next *int64
	if len(users) == limit {
		next = &users[len(users)-1].ID
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"users": users, "next": next})
}

// updateUser suspends/reactivates an account or changes its role. Both apply to existing tokens at once,
// because auth.Tokens reads them from the database on every request.
func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Suspended *bool   `json:"suspended"`
		Role      *string `json:"role"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	caller, _ := auth.FromContext(r.Context())
	switch {
	case in.Role != nil && !slices.Contains(roles, *in.Role):
		httpx.Error(w, http.StatusBadRequest, "Role must be one of "+strings.Join(roles, ", "))
		return
	case id == caller.ID && ((in.Suspended != nil && *in.Suspended) || (in.Role != nil && *in.Role != "admin")):
		httpx.Error(w, http.StatusBadRequest, "You can't suspend or demote yourself")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		UPDATE users SET
			suspended_at = CASE WHEN $2::bool IS NULL THEN suspended_at WHEN $2 THEN COALESCE(suspended_at, now()) END,
			role = COALESCE($3, role), updated_at = now()
		WHERE id = $1 RETURNING `+userCols, id, in.Suspended, in.Role)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	u, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByPos[user])
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

// ---- organizations ----

type org struct {
	organization.Organization
	OwnerEmail *string `json:"ownerEmail"`
}

const ownerEmail = `(SELECT u.email FROM users u WHERE u.id = organizations.owner_id)`

func scanOrg(row pgx.Row) (org, error) {
	var o org
	var err error
	o.Organization, err = organization.Scan(row, &o.OwnerEmail)
	return o, err
}

var verificationStatuses = []string{"pending", "verified", "rejected"}

func (h *Handler) listOrganizations(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && !slices.Contains(verificationStatuses, status) {
		httpx.Error(w, http.StatusBadRequest, "status must be pending, verified or rejected")
		return
	}
	// ponytail: no paging; add ?before= like /admin/users if the queue grows past a few hundred.
	rows, err := h.DB.Query(r.Context(), `
		SELECT `+organization.Cols+`, `+ownerEmail+` FROM organizations
		WHERE $1 = '' OR verification_status = $1 ORDER BY updated_at DESC LIMIT 500`, status)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	orgs, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (org, error) { return scanOrg(row) })
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organizations": orgs})
}

var docExt = map[string]string{"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}

// document downloads the registration certificate. It is always an attachment, never rendered inline.
func (h *Handler) document(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var data []byte
	var contentType string
	err := h.DB.QueryRow(r.Context(), `
		SELECT document, document_type FROM organizations WHERE id = $1 AND document IS NOT NULL`, id,
	).Scan(&data, &contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "This organization hasn't uploaded a document")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="organization-%d-document%s"`, id, docExt[contentType]))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(data)
}

// verify approves or rejects an organization and emails its owner.
func (h *Handler) verify(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Note = strings.TrimSpace(in.Note)
	switch {
	case in.Status != "verified" && in.Status != "rejected":
		httpx.Error(w, http.StatusBadRequest, "status must be verified or rejected")
		return
	case len(in.Note) > 1000:
		httpx.Error(w, http.StatusBadRequest, "Note must be at most 1000 characters")
		return
	}
	caller, _ := auth.FromContext(r.Context())
	o, err := scanOrg(h.DB.QueryRow(r.Context(), `
		UPDATE organizations SET verification_status = $2, review_note = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
		WHERE id = $1 RETURNING `+organization.Cols+`, `+ownerEmail, id, in.Status, in.Note, caller.ID))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Organization not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	if in.Status == "verified" {
		h.notify(o.OwnerEmail, "Your organization is verified on FeedingHands",
			o.Name+" is now verified on FeedingHands. You can claim donations from your dashboard.\n")
	} else {
		h.notify(o.OwnerEmail, "Your FeedingHands verification needs changes",
			"We couldn't verify "+o.Name+" yet.\n\nReviewer's note: "+cmp.Or(in.Note, "(none)")+
				"\n\nUpdate your profile or upload a clearer registration document and it goes back into review.\n")
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": o})
}

// ---- reports ----

type report struct {
	ID           int64      `json:"id"`
	DonationID   *int64     `json:"donationId"`
	TrackingID   *string    `json:"trackingId"`
	ReporterName *string    `json:"reporterName"`
	Reason       string     `json:"reason"`
	Status       string     `json:"status"`
	Resolution   string     `json:"resolution"`
	CreatedAt    time.Time  `json:"created_at"`
	ResolvedAt   *time.Time `json:"resolved_at"`
}

const reportSelect = `
	SELECT r.id, r.donation_id, d.tracking_id, u.full_name, r.reason, r.status, r.resolution, r.created_at, r.resolved_at
	FROM reports r LEFT JOIN donations d ON d.id = r.donation_id LEFT JOIN users u ON u.id = r.reporter_id`

func (h *Handler) reportByID(r *http.Request, id int64) (report, error) {
	rows, err := h.DB.Query(r.Context(), reportSelect+` WHERE r.id = $1`, id)
	if err != nil {
		return report{}, err
	}
	return pgx.CollectExactlyOneRow(rows, pgx.RowToStructByPos[report])
}

func (h *Handler) listReports(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && !slices.Contains([]string{"open", "resolved", "dismissed"}, status) {
		httpx.Error(w, http.StatusBadRequest, "status must be open, resolved or dismissed")
		return
	}
	// ponytail: newest 500, no paging; add ?before= if the backlog ever gets that long.
	rows, err := h.DB.Query(r.Context(), reportSelect+` WHERE $1 = '' OR r.status = $1 ORDER BY r.created_at DESC LIMIT 500`, status)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	reports, err := pgx.CollectRows(rows, pgx.RowToStructByPos[report])
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"reports": reports})
}

var (
	errReportClosed  = errors.New("report already closed")
	errNotCancelable = errors.New("donation can't be cancelled")
)

// resolveReport closes an open report, optionally cancelling the donation it is about.
func (h *Handler) resolveReport(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Status         string `json:"status"`
		Resolution     string `json:"resolution"`
		CancelDonation bool   `json:"cancelDonation"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Resolution = strings.TrimSpace(in.Resolution)
	switch {
	case in.Status != "resolved" && in.Status != "dismissed":
		httpx.Error(w, http.StatusBadRequest, "status must be resolved or dismissed")
		return
	case in.CancelDonation && in.Status != "resolved":
		httpx.Error(w, http.StatusBadRequest, "Only a resolved report can cancel the donation")
		return
	case len(in.Resolution) > 2000:
		httpx.Error(w, http.StatusBadRequest, "Resolution must be at most 2000 characters")
		return
	}
	caller, _ := auth.FromContext(r.Context())
	err := pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		var donationID *int64
		var status string
		if err := tx.QueryRow(r.Context(), `SELECT donation_id, status FROM reports WHERE id = $1 FOR UPDATE`, id).
			Scan(&donationID, &status); err != nil {
			return err
		}
		if status != "open" {
			return errReportClosed
		}
		if _, err := tx.Exec(r.Context(), `
			UPDATE reports SET status = $2, resolution = $3, resolved_by = $4, resolved_at = now() WHERE id = $1`,
			id, in.Status, in.Resolution, caller.ID); err != nil {
			return err
		}
		if !in.CancelDonation {
			return nil
		}
		if donationID == nil {
			return errNotCancelable
		}
		// Same effect as a cancel through the status endpoint: new status plus a timeline row.
		tag, err := tx.Exec(r.Context(), `
			WITH c AS (
				UPDATE donations SET status = 'cancelled', status_label = 'Cancelled by admin', updated_at = now()
				WHERE id = $1 AND status NOT IN ('delivered', 'cancelled') RETURNING id)
			INSERT INTO donation_events (donation_id, status, label, note, actor_id)
			SELECT id, 'cancelled', 'Cancelled by admin', $2, $3 FROM c`, *donationID, in.Resolution, caller.ID)
		if err == nil && tag.RowsAffected() == 0 {
			err = errNotCancelable
		}
		return err
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "Report not found")
		return
	case errors.Is(err, errReportClosed):
		httpx.Error(w, http.StatusConflict, "This report is already closed")
		return
	case errors.Is(err, errNotCancelable):
		httpx.Error(w, http.StatusConflict, "The donation is already delivered or cancelled")
		return
	case err != nil:
		httpx.Internal(w, r, err)
		return
	}
	rep, err := h.reportByID(r, id)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"report": rep})
}

// createReport lets the donor, the claiming organization or the volunteer of a donation (or an admin) flag a problem.
func (h *Handler) createReport(w http.ResponseWriter, r *http.Request) {
	var in struct {
		DonationID int64  `json:"donationId"`
		Reason     string `json:"reason"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Reason = strings.TrimSpace(in.Reason)
	switch {
	case in.Reason == "":
		httpx.Error(w, http.StatusBadRequest, "Tell us what went wrong")
		return
	case len(in.Reason) > 2000:
		httpx.Error(w, http.StatusBadRequest, "Reason must be at most 2000 characters")
		return
	}
	caller, _ := auth.FromContext(r.Context())
	var id int64
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO reports (donation_id, reporter_id, reason)
		SELECT d.id, $2, $4 FROM donations d
		LEFT JOIN organizations o ON o.id = d.organization_id
		LEFT JOIN volunteers v ON v.id = d.volunteer_id
		WHERE d.id = $1 AND ($3 OR d.donor_id = $2 OR o.owner_id = $2 OR v.user_id = $2)
		RETURNING id`, in.DonationID, caller.ID, caller.Role == "admin", in.Reason).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		// Same answer for "no such donation" and "not yours", so ids can't be probed.
		httpx.Error(w, http.StatusNotFound, "Donation not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	rep, err := h.reportByID(r, id)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"report": rep})
}
