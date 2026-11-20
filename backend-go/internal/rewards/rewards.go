// Package rewards issues gift codes when a donor's Puniya points reach a tier, and lets partners redeem them once.
// Unlocking a tier does not spend points (points are also the leaderboard score).
package rewards

import (
	"crypto/rand"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/httpx"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// tiers match GiftCard.js TIERS.
var tiers = []struct {
	points int
	name   string
}{{10, "Seedling"}, {50, "Sprout"}, {100, "Harvest"}}

func tierName(points int) string {
	for _, t := range tiers {
		if t.points == points {
			return t.name
		}
	}
	return ""
}

type Reward struct {
	Tier       int        `json:"tier"`
	Name       string     `json:"name"`
	Code       *string    `json:"code"`
	Unlocked   bool       `json:"unlocked"`
	RedeemedAt *time.Time `json:"redeemed_at"`
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens *auth.Tokens
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/rewards", h.Tokens.Require(h.list))
	// Admin only for now: partners call the team, who redeem the code for them.
	mux.HandleFunc("POST /api/rewards/redeem", h.Tokens.RequireRole("admin", h.redeem))
}

// list returns every tier, issuing codes for newly unlocked ones on the way.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.UserID(ctx)
	var points int
	err := h.DB.QueryRow(ctx, `SELECT points FROM users WHERE id = $1`, uid).Scan(&points)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusUnauthorized, "Please sign in again")
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}

	// Offer a fresh code for every unlocked tier; ON CONFLICT keeps the code a tier already has.
	var unlocked []int
	var codes []string
	for _, t := range tiers {
		if points >= t.points {
			code, err := newCode(t.name)
			if err != nil {
				httpx.Internal(w, r, err)
				return
			}
			unlocked, codes = append(unlocked, t.points), append(codes, code)
		}
	}
	if len(unlocked) > 0 {
		if _, err := h.DB.Exec(ctx, `
			INSERT INTO rewards (user_id, tier, code)
			SELECT $1, t, c FROM unnest($2::int[], $3::text[]) AS x(t, c)
			ON CONFLICT DO NOTHING`, uid, unlocked, codes); err != nil {
			httpx.Internal(w, r, err)
			return
		}
	}

	rows, err := h.DB.Query(ctx, `SELECT tier, code, redeemed_at FROM rewards WHERE user_id = $1`, uid)
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	issued, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Reward, error) {
		var rw Reward
		return rw, row.Scan(&rw.Tier, &rw.Code, &rw.RedeemedAt)
	})
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	out := make([]Reward, len(tiers))
	for i, t := range tiers {
		out[i] = Reward{Tier: t.points, Name: t.name, Unlocked: points >= t.points}
		for _, rw := range issued {
			if rw.Tier == t.points {
				out[i].Code, out[i].RedeemedAt = rw.Code, rw.RedeemedAt
			}
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"points": points, "rewards": out})
}

func (h *Handler) redeem(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Code string `json:"code"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	if code == "" {
		httpx.Error(w, http.StatusBadRequest, "Send the reward code")
		return
	}
	// One conditional UPDATE is atomic: of two redeems racing, exactly one gets the row back.
	rw := Reward{Unlocked: true}
	err := h.DB.QueryRow(r.Context(), `
		UPDATE rewards SET redeemed_at = now(), redeemed_by = $2
		WHERE code = $1 AND redeemed_at IS NULL
		RETURNING tier, code, redeemed_at`, code, auth.UserID(r.Context())).Scan(&rw.Tier, &rw.Code, &rw.RedeemedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if err := h.DB.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM rewards WHERE code = $1)`, code).Scan(&exists); err != nil {
			httpx.Internal(w, r, err)
			return
		}
		if exists {
			httpx.Error(w, http.StatusConflict, "This code has already been redeemed")
		} else {
			httpx.Error(w, http.StatusNotFound, "No reward with that code")
		}
		return
	}
	if err != nil {
		httpx.Internal(w, r, err)
		return
	}
	rw.Name = tierName(rw.Tier)
	httpx.JSON(w, http.StatusOK, map[string]any{"reward": rw})
}

// newCode looks like FH-SEE-ABCD-2345: easy to read out, random enough not to be guessed (32^8).
func newCode(tier string) (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O or 1/I lookalikes
	b := make([]byte, 8)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		b[i] = alphabet[n.Int64()]
	}
	return "FH-" + strings.ToUpper(tier[:3]) + "-" + string(b[:4]) + "-" + string(b[4:]), nil
}
