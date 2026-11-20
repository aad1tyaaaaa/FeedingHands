package donation

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"slices"
	"strconv"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
)

const (
	maxPhotoBytes = 2 << 20 // 2 MB
	maxPhotos     = 3       // per donation
)

// SVG is left out on purpose: it can carry scripts.
var photoTypes = []string{"image/png", "image/jpeg", "image/webp"}

var errTooManyPhotos = errors.New("too many photos")

// photoRetention is how long photos are kept after a donation is delivered or cancelled. They only matter
// while the food is moving, and they are most of the database's size (the free Neon plan has 1 GB).
const photoRetention = 30 * 24 * time.Hour

// PrunePhotos deletes photos of donations that finished more than photoRetention ago.
func (h *Handler) PrunePhotos(ctx context.Context) (int64, error) {
	tag, err := h.DB.Exec(ctx, `
		DELETE FROM donation_photos p USING donations d
		WHERE d.id = p.donation_id AND d.status IN ('delivered', 'cancelled') AND d.updated_at < $1`,
		time.Now().Add(-photoRetention))
	return tag.RowsAffected(), err
}

// uploadPhoto takes a multipart form with the image in the "photo" field. Only the donation's donor may add photos.
func (h *Handler) uploadPhoto(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxPhotoBytes+64<<10) // room for the multipart framing
	file, _, err := r.FormFile("photo")
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "Photo must be 2 MB or smaller")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, `Send the image as a multipart form field named "photo"`)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxPhotoBytes+1))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Could not read the uploaded file")
		return
	}
	if len(data) > maxPhotoBytes {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "Photo must be 2 MB or smaller")
		return
	}
	// Judge the type by the bytes, not the filename or the client's Content-Type.
	contentType := http.DetectContentType(data)
	if !slices.Contains(photoTypes, contentType) {
		httpx.Error(w, http.StatusUnsupportedMediaType, "Photo must be a PNG, JPEG or WebP image")
		return
	}

	u, _ := auth.FromContext(r.Context())
	var photoID int64
	err = pgx.BeginFunc(r.Context(), h.DB, func(tx pgx.Tx) error {
		// FOR UPDATE: two uploads at once can't both squeeze in as the third photo.
		var donor *int64
		if err := tx.QueryRow(r.Context(), `SELECT donor_id FROM donations WHERE id = $1 FOR UPDATE`, id).Scan(&donor); err != nil {
			return err
		}
		if donor == nil || *donor != u.ID {
			if !canSee(u, donor) {
				return pgx.ErrNoRows
			}
			return deniedError("Only the donor can add photos to a donation")
		}
		var n int
		if err := tx.QueryRow(r.Context(), `SELECT count(*) FROM donation_photos WHERE donation_id = $1`, id).Scan(&n); err != nil {
			return err
		}
		if n >= maxPhotos {
			return errTooManyPhotos
		}
		return tx.QueryRow(r.Context(), `
			INSERT INTO donation_photos (donation_id, data, content_type) VALUES ($1, $2, $3) RETURNING id`,
			id, data, contentType).Scan(&photoID)
	})
	var denied deniedError
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "Donation not found")
	case errors.As(err, &denied):
		httpx.Error(w, http.StatusForbidden, string(denied))
	case errors.Is(err, errTooManyPhotos):
		httpx.Error(w, http.StatusConflict, "A donation can have at most 3 photos")
	case err != nil:
		httpx.Internal(w, r, err)
	default:
		httpx.JSON(w, http.StatusCreated, map[string]any{"photo": map[string]int64{"id": photoID}})
	}
}

// servePhoto sends one photo to anyone allowed to see the donation.
func (h *Handler) servePhoto(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	photoID, err := strconv.ParseInt(r.PathValue("photoId"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Photo not found")
		return
	}
	var (
		data        []byte
		contentType string
		created     time.Time
		donor       *int64
	)
	err = h.DB.QueryRow(r.Context(), `
		SELECT p.data, p.content_type, p.created_at, d.donor_id
		FROM donation_photos p JOIN donations d ON d.id = p.donation_id
		WHERE p.id = $1 AND p.donation_id = $2`, photoID, id).Scan(&data, &contentType, &created, &donor)
	if u, _ := auth.FromContext(r.Context()); errors.Is(err, pgx.ErrNoRows) || (err == nil && !canSee(u, donor)) {
		httpx.Error(w, http.StatusNotFound, "Photo not found")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// Photos never change once uploaded, but they are not public: browsers may keep them, shared caches may not.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	http.ServeContent(w, r, "", created, bytes.NewReader(data))
}
