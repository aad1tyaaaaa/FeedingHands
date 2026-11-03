import { useEffect, useState } from "react";
import {
  Apple,
  ArrowRight,
  Carrot,
  Cherry,
  CircleCheck,
  Croissant,
  Building2,
  HandHeart,
  HeartHandshake,
  Leaf,
  PackageCheck,
  Sandwich,
  ScanSearch,
  Soup,
  Truck,
  Utensils,
  Wheat,
} from "lucide-react";
import "./PersonaTheme.css";
import "./LoadingScreen.css";

// Who takes part, orbiting the logo.
const ORBIT = [
  { icon: HandHeart, label: "Donors" },
  { icon: Soup, label: "Meals" },
  { icon: HeartHandshake, label: "Volunteers" },
  { icon: Truck, label: "Pickups" },
  { icon: Building2, label: "NGOs" },
  { icon: Leaf, label: "Zero waste" },
];

// What happens to every donation; lights up in order, then the app opens.
const JOURNEY = [
  { icon: HandHeart, label: "Donate" },
  { icon: Truck, label: "Pick up" },
  { icon: PackageCheck, label: "Deliver" },
  { icon: Utensils, label: "Feed" },
];

const STEP_MS = 850;

// Side scenery: one card per stage of a donation, two per side.
const SIDE_CARDS = [
  { side: "left", icon: HandHeart, title: "Surplus meals ready", meta: "Veg thali · 40 portions", tag: "Donor" },
  { side: "left", icon: ScanSearch, title: "Freshness check", meta: "Looks fresh, safe to share", tag: "AI scan", fresh: true },
  { side: "right", icon: Truck, title: "Volunteer on the way", meta: "Pickup in 12 min", tag: "Volunteer", live: true },
  { side: "right", icon: CircleCheck, title: "Delivered to shelter", meta: "Shared with families nearby", tag: "NGO" },
];

const FOOD_BITS = [Apple, Carrot, Croissant, Sandwich, Wheat, Cherry];

function LoadingScreen({ onLoaded }) {
  const [step, setStep] = useState(0);

  // The journey loops as decoration; only "Get started" leaves this page.
  useEffect(() => {
    const finished = step >= JOURNEY.length;
    const timer = setTimeout(() => setStep(finished ? 0 : step + 1), finished ? 2200 : STEP_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="landing fh-theme">
      <div className="landing-glow" aria-hidden="true" />

      {/* decorative: previews of the donation flow and drifting food, wide screens only */}
      <div className="landing-scenery" aria-hidden="true">
        {FOOD_BITS.map((Icon, i) => (
          <span key={i} className={`landing-bit landing-bit--${i}`}>
            <Icon size={22} strokeWidth={2} />
          </span>
        ))}
        {SIDE_CARDS.map(({ side, icon: Icon, title, meta, tag, live, fresh }, i) => (
          <div key={title} className={`landing-card landing-card--${side} landing-card--${i}`}>
            <span className="landing-card-icon"><Icon size={20} strokeWidth={2.1} /></span>
            <span className="landing-card-copy">
              <strong>{title}</strong>
              <span>{live && <i className="landing-live" />}{meta}</span>
              {fresh && <span className="landing-fresh"><span /></span>}
            </span>
            <span className="landing-card-tag">{tag}</span>
          </div>
        ))}
      </div>

      <div className="landing-top">
        <img className="landing-wordmark" src="/logo/logo-with-text.png" alt="FeedingHands" />
      </div>

      <main className="landing-main">
        <div className="landing-orbit" aria-hidden="true">
          <div className="landing-ring" />
          <div className="landing-ring landing-ring--inner" />
          <ul className="landing-orbit-track">
            {ORBIT.map(({ icon: Icon, label }, i) => (
              <li key={label} className="landing-planet" style={{ "--n": i, "--count": ORBIT.length }}>
                <span className="landing-planet-tile" title={label}>
                  <Icon size={26} strokeWidth={2} />
                </span>
              </li>
            ))}
          </ul>
          <div className="landing-core">
            <img src="/logo/logo.png" alt="" />
          </div>
        </div>

        <div className="landing-copy">
          <h1 className="landing-title">
            Nourishing <span>together</span>
          </h1>
          <p className="landing-sub">
            Surplus food from donors, carried by volunteers, shared through NGOs, one donation at a time.
          </p>
        </div>

        <ol className="landing-journey" aria-label="How FeedingHands works">
          {JOURNEY.map(({ icon: Icon, label }, i) => (
            <li key={label} className={`landing-step${i < step ? " is-done" : ""}${i === step ? " is-current" : ""}`}>
              <span className="landing-step-icon">
                <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="landing-step-label">{label}</span>
            </li>
          ))}
        </ol>

        <button className="landing-cta" type="button" onClick={() => onLoaded?.()}>
          Get started <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </main>
    </div>
  );
}

export default LoadingScreen;
