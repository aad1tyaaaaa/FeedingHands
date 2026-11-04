import "./Tracking.css";

// The lifecycle the API enforces: available → requested → picked_up → in_transit → delivered.
export const STEPS = [
  { status: "available", label: "Donation posted" },
  { status: "requested", label: "Claimed by NGO" },
  { status: "picked_up", label: "Picked up" },
  { status: "in_transit", label: "On the way" },
  { status: "delivered", label: "Delivered" },
];

export const STATUS_TEXT = {
  available: "Available",
  requested: "Claimed",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// foodDetails is stored as text; the donate form sends a JSON list of {name, quantity}.
export function foodSummary(foodDetails) {
  try {
    const items = JSON.parse(foodDetails || "[]");
    if (Array.isArray(items) && items.length) {
      return items.map((item) => `${item.name}${item.quantity ? ` (${item.quantity})` : ""}`).join(", ");
    }
  } catch {
    // plain text
  }
  return foodDetails || "Details not listed";
}

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : "");

// A progress tracker plus the event log for one donation (or a public tracking record).
export default function DonationTimeline({ donation }) {
  const cancelled = donation.status === "cancelled";
  const reached = STEPS.findIndex((s) => s.status === donation.status);
  const when = Object.fromEntries((donation.events || []).map((e) => [e.status, e.created_at]));

  return (
    <div className="donation-timeline">
      <div className="tracker" aria-label="Donation progress">
        {STEPS.map((step, index) => {
          const done = !cancelled && index <= reached;
          return (
            <div key={step.status} className="tracker-step">
              <div className={`step-circle ${done ? "completed" : ""} ${!cancelled && index === reached ? "current" : ""}`}>
                {index + 1}
              </div>
              <div className="step-label">
                {step.label}
                {when[step.status] && <small className="step-time">{new Date(when[step.status]).toLocaleDateString()}</small>}
              </div>
              {index < STEPS.length - 1 && <div className={`step-line ${done && index < reached ? "completed" : ""}`} />}
            </div>
          );
        })}
      </div>
      {cancelled && <p className="timeline-cancelled" role="status">This donation was cancelled.</p>}

      {donation.events?.length > 0 && (
        <ol className="timeline-events">
          {donation.events.map((e, i) => (
            <li key={i}>
              <strong>{e.label || STATUS_TEXT[e.status]}</strong>
              {e.actor_name && <span> · {e.actor_name}</span>}
              {e.note && <span> · “{e.note}”</span>}
              <time dateTime={e.created_at}>{formatDate(e.created_at)}</time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
