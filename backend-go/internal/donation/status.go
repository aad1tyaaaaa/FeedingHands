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
