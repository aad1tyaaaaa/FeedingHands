import { useEffect, useRef, useState } from "react";
import Illustration from "./Illustration";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Counts from the last shown value to the new one with an expo ease-out.
function useCountUp(value, delay) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const current = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = value;
      setShown(value);
      return undefined;
    }
    const from = current.current;
    const start = performance.now() + delay;
    let frame;
    const tick = (now) => {
      const t = Math.min(Math.max((now - start) / 1200, 0), 1);
      const next = t === 1 ? value : from + (value - from) * (1 - Math.pow(2, -10 * t));
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay]);

  return Math.round(shown);
}

function Burst() {
  return (
    <svg className="workspace-metric-burst" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 2l9 21 21-10-7 22 23 6-20 12 15 18-23-1 2 23-20-12-12 20-6-23-22 8 9-22-21-9 21-10-9-22 22 8 6-23z" />
    </svg>
  );
}

// Two-layer characters that cling to the card: kpi-<pose>-body sits behind the card, kpi-<pose>-hands
// (same canvas) in front, gripping the top edge. `edge` is the share of the art's height that falls below
// the card line, measured when the asset sheet was cut, so the knuckles land exactly on the border.
export const POSES = {
  peeking: { edge: 0.182 },
  "chin-wave": { edge: 0.168 },
  "pull-up": { edge: 0.171 },
  volunteer: { edge: 0.169 },
  ngo: { edge: 0.157 },
  chef: { edge: 0.155 },
};

/**
 * KPI tile. `share` (0–1) draws a meter of this value against `shareOf`;
 * pass `share={null}` when the total is zero so the meter says so instead of lying.
 * `pose` (a POSES key) adds a character clinging to the card's top edge.
 */
function WorkspaceMetric({ label, value, hint, icon: Icon, index = 0, hero = false, share, shareOf, pose }) {
  const shown = useCountUp(value, 260 + index * 120);
  const hasMeter = share !== undefined;

  const track = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", ((event.clientX - box.left) / box.width).toFixed(3));
    event.currentTarget.style.setProperty("--my", ((event.clientY - box.top) / box.height).toFixed(3));
  };
  const reset = (event) => {
    event.currentTarget.style.setProperty("--mx", "0.5");
    event.currentTarget.style.setProperty("--my", "0.5");
  };

  const card = (
    <div
      className={`workspace-metric${hero ? " is-hero" : ""}`}
      style={{ "--i": index }}
      onPointerMove={track}
      onPointerLeave={reset}
    >
      {hero && (
        <>
          <span className="workspace-metric-ghost" aria-hidden="true">{value}</span>
          <Burst />
        </>
      )}

      <div className="workspace-metric-top">
        <span className="workspace-metric-label">{label}</span>
        {Icon && (
          <span className="workspace-metric-icon" aria-hidden="true">
            <Icon size={20} strokeWidth={2.1} />
          </span>
        )}
      </div>

      <strong className="workspace-metric-value">
        <span aria-hidden="true">{shown}</span>
        <span className="workspace-sr-only">{value}</span>
      </strong>

      {hasMeter && (
        <div className="workspace-metric-meter">
          <span className="workspace-metric-track">
            <span className="workspace-metric-fill" style={{ "--share": share ?? 0 }} />
          </span>
          <span className="workspace-metric-share">
            {share === null ? "Nothing to compare yet" : `${Math.round(share * 100)}% of ${shareOf}`}
          </span>
        </div>
      )}

      {hint && <small className="workspace-metric-hint">{hint}</small>}
    </div>
  );

  if (!POSES[pose]) return card;
  // The card clips its overflow (ghost numeral, sheen), so the character lives on a wrapper around it:
  // body behind the card, card, then hands on top.
  return (
    <div className={`workspace-metric-slot${hero ? " is-hero" : ""}`} style={{ "--i": index, "--edge": POSES[pose].edge }}>
      <Illustration name={`kpi-${pose}-body`} className="workspace-metric-art" />
      {card}
      <Illustration name={`kpi-${pose}-hands`} className="workspace-metric-art is-hands" />
    </div>
  );
}

export default WorkspaceMetric;
