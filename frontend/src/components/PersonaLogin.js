import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./PersonaLogin.css";

const PERSONAS = [
  {
    role: "donor",
    label: "Food Donor",
    username: "donor",
    password: "donor123",
    destination: "/dashboard",
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
    username: "volunteer",
    password: "volunteer123",
    destination: "/VolunteerDashboard",
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
    username: "organization",
    password: "organization123",
    destination: "/NgoDashboard",
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
  const [credentials, setCredentials] = useState({});
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const lastStep = useRef(0);
  const touchY = useRef(null);

  const go = (index) => {
    setActive(Math.max(0, Math.min(PERSONAS.length - 1, index)));
    setError("");
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

  const handleChange = (role, field, value) => {
    setCredentials((current) => ({
      ...current,
      [role]: { ...current[role], [field]: value },
    }));
  };

  const handleLogin = (persona) => {
    const entered = credentials[persona.role] || {};
    if (
      entered.username !== persona.username ||
      entered.password !== persona.password
    ) {
      setError(`Invalid credentials for ${persona.label}.`);
      return;
    }

    localStorage.setItem(
      "fh_user",
      JSON.stringify({
        id: `demo-${persona.role}`,
        fullName: persona.label,
        role: persona.role,
        demo: true,
      }),
    );
    setError("");
    navigate(persona.destination);
  };

  const persona = PERSONAS[active];
  const entered = credentials[persona.role] || {};

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
          <h1 className="persona-title">
            pick your <em>era.</em>
          </h1>
          <article
            className={`persona-card ${persona.role}`}
            key={persona.role}
          >
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

            {error && <div className="persona-error">{error}</div>}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleLogin(persona);
              }}
            >
              <label htmlFor={`${persona.role}-username`}>Username</label>
              <input
                id={`${persona.role}-username`}
                value={entered.username || ""}
                onChange={(event) =>
                  handleChange(persona.role, "username", event.target.value)
                }
                placeholder={persona.username}
              />
              <label htmlFor={`${persona.role}-password`}>Password</label>
              <input
                id={`${persona.role}-password`}
                type="password"
                value={entered.password || ""}
                onChange={(event) =>
                  handleChange(persona.role, "password", event.target.value)
                }
                placeholder={persona.password}
              />
              <button
                type="button"
                className="persona-autofill"
                onClick={() =>
                  setCredentials((current) => ({
                    ...current,
                    [persona.role]: { username: persona.username, password: persona.password },
                  }))
                }
              >
                ⚡ Autofill demo login
              </button>
              <button type="submit" className="persona-submit">
                Let's go as {persona.label} →
              </button>
            </form>
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
