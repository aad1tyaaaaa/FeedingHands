package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestRevoked(t *testing.T) {
	change := time.Date(2026, 1, 1, 12, 0, 0, 700_000_000, time.UTC) // 12:00:00.7
	cases := []struct {
		name    string
		changed *time.Time
		iat     *jwt.NumericDate
		want    bool
	}{
		{"never changed", nil, jwt.NewNumericDate(change.Add(-time.Hour)), false},
		{"issued a second before", &change, jwt.NewNumericDate(change.Add(-time.Second)), true},
		{"issued in the same second", &change, jwt.NewNumericDate(change), false}, // the token the change hands out
		{"issued after", &change, jwt.NewNumericDate(change.Add(time.Minute)), false},
		{"no iat", &change, nil, true},
	}
	for _, c := range cases {
		if got := revoked(c.changed, c.iat); got != c.want {
			t.Errorf("%s: revoked = %v, want %v", c.name, got, c.want)
		}
	}
}
