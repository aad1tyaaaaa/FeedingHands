package organization

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxLogoBytes = 2 << 20 // 2 MB

// SVG is left out on purpose: it can carry scripts.
var logoTypes = []string{"image/png", "image/jpeg", "image/webp"}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	org := func(next http.HandlerFunc) http.HandlerFunc { return h.Tokens.RequireRole("organization", next) }

	mux.HandleFunc("GET /api/organizations", h.list)
	mux.HandleFunc("POST /api/organizations", h.Tokens.Optional(h.create))
	mux.HandleFunc("GET /api/organizations/me", org(h.getMine))
	mux.HandleFunc("PUT /api/organizations/me", org(h.saveMine))
	mux.HandleFunc("PUT /api/organizations/me/logo", org(h.uploadLogo))
	mux.HandleFunc("DELETE /api/organizations/me/logo", org(h.deleteLogo))
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
}

// validate trims the input in place and returns a message for the first problem, or "".
func (in *Input) validate() string {
	for _, f := range []*string{&in.Name, &in.Description, &in.Address, &in.Contact, &in.Email, &in.Phone, &in.LegacyPhone, &in.Website} {
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
	case len(in.Address) > 500 || len(in.Contact) > 200 || len(in.Phone) > 30 || len(in.Website) > 300 || len(in.Email) > 254:
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

// create is the public Register form. A signed-in organization account becomes the owner.
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Decode(w, r, &in) {
		return
	}
	if msg := in.validate(); msg != "" {
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}
	var owner *int64
	if u, ok := auth.FromContext(r.Context()); ok && u.Role == "organization" {
		owner = &u.ID
	}
	o, err := h.store().create(r.Context(), owner, in)
	if db.IsUniqueViolation(err) {
		httpx.Error(w, http.StatusConflict, "Your account already has an organization profile")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"message": "Organization registered", "organization": o})
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

// uploadLogo takes a multipart form with the image in the "logo" field.
func (h *Handler) uploadLogo(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxLogoBytes+64<<10) // room for the multipart framing
	file, _, err := r.FormFile("logo")
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "Logo must be 2 MB or smaller")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, `Send the image as a multipart form field named "logo"`)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxLogoBytes+1))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Could not read the uploaded file")
		return
	}
	if len(data) > maxLogoBytes {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "Logo must be 2 MB or smaller")
		return
	}
	// Judge the type by the bytes, not the filename or the client's Content-Type.
	contentType := http.DetectContentType(data)
	if !slices.Contains(logoTypes, contentType) {
		httpx.Error(w, http.StatusUnsupportedMediaType, "Logo must be a PNG, JPEG or WebP image")
		return
	}

	h.writeLogo(w, r, data, &contentType)
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
