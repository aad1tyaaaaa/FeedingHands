package organization

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxLogoBytes     = 2 << 20 // 2 MB
	maxDocumentBytes = 5 << 20 // 5 MB
)

// SVG is left out on purpose: it can carry scripts.
var (
	logoTypes     = []string{"image/png", "image/jpeg", "image/webp"}
	documentTypes = []string{"application/pdf", "image/png", "image/jpeg"}
)

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	org := func(next http.HandlerFunc) http.HandlerFunc { return h.Tokens.RequireRole("organization", next) }

	mux.HandleFunc("GET /api/organizations", h.list)
	mux.HandleFunc("POST /api/organizations", org(h.saveMine)) // the Register form; same as PUT /me
	mux.HandleFunc("GET /api/organizations/me", org(h.getMine))
	mux.HandleFunc("PUT /api/organizations/me", org(h.saveMine))
	mux.HandleFunc("PUT /api/organizations/me/logo", org(h.uploadLogo))
	mux.HandleFunc("DELETE /api/organizations/me/logo", org(h.deleteLogo))
	mux.HandleFunc("PUT /api/organizations/me/document", org(h.uploadDocument))
	mux.HandleFunc("GET /api/organizations/{id}/logo", h.serveLogo)
}

func (h *Handler) store() store { return store{db: h.DB} }

// Input is the editable part of a profile.
type Input struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Address     string   `json:"address"`
	Contact     string   `json:"contact"`
	Email       string   `json:"email"`
	Phone       string   `json:"phone"`
	LegacyPhone string   `json:"contactNumber"` // the Register form's name for phone (JSON keys match case-insensitively)
	Website     string   `json:"website"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	// NGO Darpan ID or trust/society registration number, checked by an admin.
	RegistrationNo string `json:"registrationNo"`
}

// validate trims the input in place and returns a message for the first problem, or "".
func (in *Input) validate() string {
	for _, f := range []*string{&in.Name, &in.Description, &in.Address, &in.Contact, &in.Email, &in.Phone, &in.LegacyPhone, &in.Website, &in.RegistrationNo} {
		*f = strings.TrimSpace(*f)
	}
	if in.Phone == "" {
		in.Phone = in.LegacyPhone
	}
	in.Email = strings.ToLower(in.Email)
	if in.Website != "" && !strings.Contains(in.Website, "://") {
		in.Website = "https://" + in.Website
	}

	switch {
	case in.Name == "":
		return "Organization name is required"
	case len(in.Name) > 200:
		return "Organization name must be at most 200 characters"
	case len(in.Description) > 2000:
		return "Description must be at most 2000 characters"
	case len(in.Address) > 500 || len(in.Contact) > 200 || len(in.Phone) > 30 || len(in.Website) > 300 || len(in.Email) > 254 ||
		len(in.RegistrationNo) > 100:
		return "One of the fields is too long"
	case in.Email != "" && !httpx.ValidEmail(in.Email):
		return "Email address is not valid"
	case in.Website != "" && !validWebsite(in.Website):
		return "Website must be a valid http(s) address"
	case in.Latitude != nil && (*in.Latitude < -90 || *in.Latitude > 90),
		in.Longitude != nil && (*in.Longitude < -180 || *in.Longitude > 180):
		return "Location coordinates are out of range"
	}
	return ""
}

func validWebsite(s string) bool {
	u, err := url.Parse(s)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	orgs, err := h.store().list(r.Context())
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organizations": orgs})
}

func (h *Handler) getMine(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.FromContext(r.Context())
	o, err := h.store().byOwner(r.Context(), u.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "No organization profile yet")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"organization": o})
}

func (h *Handler) saveMine(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Decode(w, r, &in) {
		return
	}
	if msg := in.validate(); msg != "" {
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}
	u, _ := auth.FromContext(r.Context())
	o, err := h.store().upsert(r.Context(), u.ID, in)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Profile saved", "organization": o})
}

// readUpload reads the multipart field into memory and checks its size and type.
// On failure it has already answered (what names the file in messages, e.g. "Logo").
func readUpload(w http.ResponseWriter, r *http.Request, field, what string, maxBytes int, types []string, typeMsg string) ([]byte, string, bool) {
	tooBigMsg := fmt.Sprintf("%s must be %d MB or smaller", what, maxBytes>>20)
	r.Body = http.MaxBytesReader(w, r.Body, int64(maxBytes)+64<<10) // room for the multipart framing
	file, _, err := r.FormFile(field)
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		httpx.Error(w, http.StatusRequestEntityTooLarge, tooBigMsg)
		return nil, "", false
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, `Send the file as a multipart form field named "`+field+`"`)
		return nil, "", false
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, int64(maxBytes)+1))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Could not read the uploaded file")
		return nil, "", false
	}
	if len(data) > maxBytes {
		httpx.Error(w, http.StatusRequestEntityTooLarge, tooBigMsg)
		return nil, "", false
	}
	// Judge the type by the bytes, not the filename or the client's Content-Type.
	contentType := http.DetectContentType(data)
	if !slices.Contains(types, contentType) {
		httpx.Error(w, http.StatusUnsupportedMediaType, typeMsg)
		return nil, "", false
	}
	return data, contentType, true
}

// uploadLogo takes a multipart form with the image in the "logo" field.
func (h *Handler) uploadLogo(w http.ResponseWriter, r *http.Request) {
	data, contentType, ok := readUpload(w, r, "logo", "Logo", maxLogoBytes, logoTypes, "Logo must be a PNG, JPEG or WebP image")
	if ok {
		h.writeLogo(w, r, data, &contentType)
	}
}

// uploadDocument takes the registration certificate admins check before verifying the organization.
func (h *Handler) uploadDocument(w http.ResponseWriter, r *http.Request) {
	data, contentType, ok := readUpload(w, r, "document", "Document", maxDocumentBytes, documentTypes,
		"Document must be a PDF, PNG or JPEG file")
	if !ok {
		return
	}
	u, _ := auth.FromContext(r.Context())
	o, err := h.store().setDocument(r.Context(), u.ID, data, contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Save your organization details before uploading a document")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Document uploaded", "organization": o})
}

func (h *Handler) deleteLogo(w http.ResponseWriter, r *http.Request) {
	h.writeLogo(w, r, nil, nil)
}

func (h *Handler) writeLogo(w http.ResponseWriter, r *http.Request, data []byte, contentType *string) {
	u, _ := auth.FromContext(r.Context())
	o, err := h.store().setLogo(r.Context(), u.ID, data, contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "Save your organization details before adding a logo")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Logo updated", "organization": o})
}

func (h *Handler) serveLogo(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	data, contentType, updated, err := h.store().logo(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.URL.Query().Has("v") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	// ServeContent answers If-Modified-Since and Range requests for us.
	http.ServeContent(w, r, "", updated, bytes.NewReader(data))
}
