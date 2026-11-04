// Package donation handles food donations and their tracking timeline.
package donation

// A donation only moves forward through these; skipping steps is allowed
// (a volunteer can pick up food no NGO claimed yet).
var rank = map[string]int{
	"available":  0,
	"requested":  1,
	"picked_up":  2,
	"in_transit": 3,
	"delivered":  4,
}

// Labels are what the tracking timeline shows when the client sends no status2 text.
var labels = map[string]string{
	"available":  "Donation posted",
	"requested":  "Claimed by NGO",
	"picked_up":  "Picked up",
	"in_transit": "On the way",
	"delivered":  "Delivered",
	"cancelled":  "Cancelled",
}

func validStatus(s string) bool {
	_, ok := labels[s]
	return ok
}

// canMove reports whether a donation in status from may change to status to.
func canMove(from, to string) bool {
	if from == "delivered" || from == "cancelled" {
		return false
	}
	if to == "cancelled" {
		return rank[from] <= rank["requested"] // food already picked up can't be cancelled
	}
	r, ok := rank[to]
	return ok && r > rank[from]
}

// actor is the caller, with the profile ids their role links them to (0 = none).
type actor struct {
	role               string
	userID, orgID, vol int64
}

// parties are who a donation currently belongs to (0 = nobody yet).
type parties struct {
	donor, org, vol int64
}

func (a actor) involved(p parties) bool {
	return (a.userID != 0 && a.userID == p.donor) || (a.orgID != 0 && a.orgID == p.org) || (a.vol != 0 && a.vol == p.vol)
}

// permit returns "" when a may move a donation owned by p to status next ("" = only a note or label),
// otherwise the reason it can't.
func permit(a actor, p parties, next string) string {
	if a.role == "admin" {
		return ""
	}
	switch next {
	case "":
		if !a.involved(p) {
			return "Only people involved in this donation can add notes"
		}
	case "requested":
		if a.role != "organization" {
			return "Only organizations can claim donations"
		}
		if a.orgID == 0 {
			return "Complete your organization profile before claiming donations"
		}
	case "picked_up", "in_transit", "delivered":
		if a.role != "volunteer" || a.vol == 0 {
			return "Only volunteers can update pickup and delivery"
		}
		if p.vol != 0 && p.vol != a.vol {
			return "Another volunteer is already handling this donation"
		}
	case "cancelled":
		if (a.userID == 0 || a.userID != p.donor) && (a.orgID == 0 || a.orgID != p.org) {
			return "Only the donor or the claiming organization can cancel"
		}
	}
	return ""
}
