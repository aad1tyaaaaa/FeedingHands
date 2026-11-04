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

func TestPermit(t *testing.T) {
	donor := actor{role: "donor", userID: 1}
	stranger := actor{role: "donor", userID: 9}
	ngo := actor{role: "organization", userID: 2, orgID: 20}
	ngoNoProfile := actor{role: "organization", userID: 3}
	vol := actor{role: "volunteer", userID: 4, vol: 40}
	otherVol := actor{role: "volunteer", userID: 5, vol: 50}
	admin := actor{role: "admin", userID: 6}

	fresh := parties{donor: 1}
	claimed := parties{donor: 1, org: 20}
	inHand := parties{donor: 1, org: 20, vol: 40}

	cases := []struct {
		name string
		a    actor
		p    parties
		next string
		ok   bool
	}{
		{"ngo claims", ngo, fresh, "requested", true},
		{"ngo without profile can't claim", ngoNoProfile, fresh, "requested", false},
		{"donor can't claim", donor, fresh, "requested", false},
		{"volunteer picks up claimed food", vol, claimed, "picked_up", true},
		{"volunteer picks up unclaimed food", vol, fresh, "picked_up", true},
		{"ngo can't pick up", ngo, claimed, "picked_up", false},
		{"assigned volunteer delivers", vol, inHand, "delivered", true},
		{"other volunteer can't deliver", otherVol, inHand, "delivered", false},
		{"donor cancels own", donor, fresh, "cancelled", true},
		{"claiming ngo cancels", ngo, claimed, "cancelled", true},
		{"stranger can't cancel", stranger, fresh, "cancelled", false},
		{"volunteer can't cancel", vol, inHand, "cancelled", false},
		{"donor adds note to own", donor, fresh, "", true},
		{"stranger can't add note", stranger, fresh, "", false},
		{"admin does anything", admin, inHand, "cancelled", true},
	}
	for _, c := range cases {
		if got := permit(c.a, c.p, c.next) == ""; got != c.ok {
			t.Errorf("%s: permit = %v, want %v", c.name, got, c.ok)
		}
	}
}
