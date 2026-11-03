package donation

import "testing"

func TestCanMove(t *testing.T) {
	cases := []struct {
		from, to string
		want     bool
	}{
		{"available", "requested", true},
		{"available", "picked_up", true}, // skipping the claim is fine
		{"requested", "delivered", true},
		{"picked_up", "in_transit", true},
		{"available", "cancelled", true},
		{"requested", "cancelled", true},
		{"picked_up", "available", false}, // no going back
		{"picked_up", "cancelled", false},
		{"delivered", "cancelled", false},
		{"cancelled", "available", false},
		{"requested", "requested", false},
		{"available", "teleported", false},
	}
	for _, c := range cases {
		if got := canMove(c.from, c.to); got != c.want {
			t.Errorf("canMove(%q, %q) = %v, want %v", c.from, c.to, got, c.want)
		}
	}
}
