import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./PersonaLogin.css";

const PERSONAS = [
  {
    role: "donor",
    label: "Food Donor",
    destination: "/dashboard",
    image: "/personas/donor.png",
    imageAlt: "Food donor preparing meals for the community",
    description: "Donate food and track your community impact.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 11h18a9 9 0 0 1-18 0Z" />
        <path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" />
      </svg>
    ),
    vibe: "the giver",
    word: "GIVE",
  },
  {
    role: "volunteer",
    label: "Volunteer",
    destination: "/VolunteerDashboard",
    image: "/personas/volunteer.png",
    imageAlt: "Volunteer delivering a box of donated food",
    description: "Coordinate collections, deliveries, and outreach.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        <path d="M9 11h6M12 8v6" />
      </svg>
    ),
    vibe: "the doer",
    word: "MOVE",
  },
  {
    role: "organization",
    label: "Organization",
    destination: "/NgoDashboard",
    image: "/personas/ngo.png",
    imageAlt: "Organization coordinator managing food supplies",
    description: "Manage food distribution for your organization.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2" />
      </svg>
    ),
    vibe: "the connector",
    word: "SCALE",
  },
];

const STEP_DEG = 28;
const TICKER =
  "no food left behind ✦ feed the block ✦ leftovers ≠ waste ✦ show up for your city ✦ ";

function PersonaLogin() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const lastStep = useRef(0);
  const touchY = useRef(null);

  const go = (index) => {
    setActive(Math.max(0, Math.min(PERSONAS.length - 1, index)));
  };

  // One step per gesture: trackpads fire dozens of wheel events per swipe.
  const step = (direction) => {
    const now = Date.now();
    if (now - lastStep.current < 600) return;
    lastStep.current = now;
    go(active + direction);
  };

  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) > 10) step(Math.sign(event.deltaY));
  };

  const handleTouchEnd = (event) => {
    const delta = touchY.current - event.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) step(Math.sign(delta));
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") step(1);
    if (event.key === "ArrowUp") step(-1);
  };

  const handleSelectPersona = (persona) => {
    localStorage.setItem(
      "fh_user",
      JSON.stringify({
        id: `demo-${persona.role}`,
        fullName: persona.label,
        role: persona.role,
        demo: true,
      }),
    );
    navigate(persona.destination);
  };

  const persona = PERSONAS[active];

  return (
    <main
      className={`persona-login fh-theme theme-${persona.role}`}
      onWheel={handleWheel}
    >
      <div className="fh-blob" aria-hidden="true" />
      <div className="persona-bigword" aria-hidden="true" key={persona.word}>
        {persona.word}
      </div>

      <div className="persona-stage">
        <nav
          className="persona-wheel"
          aria-label="Personas"
          onKeyDown={handleKeyDown}
          onTouchStart={(event) => {
            touchY.current = event.touches[0].clientY;
          }}
          onTouchEnd={handleTouchEnd}
        >
          <div className="persona-ring" />
          {PERSONAS.map((p, i) => (
            <button
              type="button"
              key={p.role}
              className={`persona-wheel-item${i === active ? " is-active" : ""}`}
              style={{ "--angle": `${(i - active) * STEP_DEG}deg` }}
              onClick={() => go(i)}
              aria-label={p.label}
              aria-current={i === active}
            >
              <span className="persona-dot" />
              <span className="persona-num">
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </nav>

        <div className="persona-panel">
          <h1 className="persona-title">Choose your role</h1>
          <article
            className={`persona-card ${persona.role}`}
            key={persona.role}
          >
            <div className="persona-card-copy">
              <div className="persona-card-head">
                <span className="persona-icon" aria-hidden="true">
                  {persona.icon}
                </span>
                <div>
                  <span className="persona-vibe">{persona.vibe}</span>
                  <h2>{persona.label}</h2>
                  <p>{persona.description}</p>
                </div>
              </div>
              <button
                type="button"
                className="persona-submit"
                onClick={() => handleSelectPersona(persona)}
              >
                Let's go as {persona.label} →
              </button>
            </div>
            <img className="persona-card-image" src={persona.image} alt={persona.imageAlt} />
          </article>
        </div>
      </div>

      <div className="persona-ticker" aria-hidden="true">
        <span>{TICKER.repeat(4)}</span>
        <span>{TICKER.repeat(4)}</span>
      </div>
    </main>
  );
}

export default PersonaLogin;
