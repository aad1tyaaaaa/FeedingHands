import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, LocateFixed, MapPin, Minus, Plus, ScanSearch, Trash2 } from "lucide-react";
import "./PersonaTheme.css";
import "./Donate.css";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";

const TYPES = [
  { value: "Vegetarian", art: "icon-veg", hint: "Veg meals, rotis, rice" },
  { value: "Non-Vegetarian", art: "icon-non-veg", hint: "Chicken, fish, eggs" },
  { value: "Packaged Food", art: "icon-packaged", hint: "Sealed, labelled packs" },
  { value: "Other", art: "icon-other-food", hint: "Fruit, bakery, mixed" },
];

const NEXT_STEPS = [
  { art: "ngo-building", title: "An NGO nearby claims it", text: "Usually within the hour." },
  { art: "volunteer-scooter", title: "A volunteer picks it up", text: "They'll call you before arriving." },
  { art: "trophy", title: "Delivered: +10 Puniya points", text: "Track every step live." },
];

const blankItem = () => ({ name: "", quantity: 10 });

// Nominatim is free but rate-limited; a failed lookup never blocks a donation.
async function geocode(address) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    const [hit] = res.ok ? await res.json() : [];
    return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : {};
  } catch {
    return {};
  }
}

function Donate() {
  const { user } = useAuth();
  const [type, setType] = useState("Vegetarian");
  const [items, setItems] = useState([blankItem()]);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [contact, setContact] = useState(user.phone || "");
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(null);
  const [copied, setCopied] = useState(false);

  const setItem = (i, patch) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const portions = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const namedItems = items.filter((it) => it.name.trim());

  const locateMe = () => {
    if (!navigator.geolocation) return setError("Your browser can't share a location. Type the address instead.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords({ latitude: c.latitude, longitude: c.longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}`);
          const data = await res.json();
          if (data.display_name) setLocation(data.display_name);
        } catch {
          // coordinates are enough; the address can be typed
        }
        setLocating(false);
      },
      () => {
        setError("Couldn't read your location. Type the address instead.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!namedItems.length) return setError("Add at least one food item.");
    if (namedItems.some((it) => !(Number(it.quantity) > 0))) return setError("Each item needs a number of portions.");
    setSubmitting(true);
    try {
      const where = coords || (await geocode(location));
      const { donation } = await apiFetch("/api/donations", {
        method: "POST",
        body: JSON.stringify({
          type,
          location: location.trim(),
          latitude: where.latitude ?? null,
          longitude: where.longitude ?? null,
          contact: contact.trim(),
          notes: notes.trim(),
          foodDetails: JSON.stringify(namedItems.map((it) => ({ name: it.name.trim(), quantity: String(it.quantity) }))),
        }),
      });
      setPosted(donation);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setPosted(null);
    setItems([blankItem()]);
    setNotes("");
    setCopied(false);
  };

  if (posted) {
    return (
      <div className="donate-dashboard">
        <section className="workspace-panel donate-success">
          <Illustration name="state-success" className="donate-success-art" />
          <h1>Donation posted. Thank you!</h1>
          <p>NGOs nearby can claim it now. Share this tracking ID with anyone who wants to follow along.</p>
          <div className="donate-success-id">
            <code>{posted.donation_tracking_id}</code>
            <button
              type="button"
              className="workspace-secondary"
              onClick={() => navigator.clipboard?.writeText(posted.donation_tracking_id).then(() => setCopied(true)).catch(() => {})}
            >
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
            </button>
          </div>
          <div className="donate-success-actions">
            <Link className="workspace-primary" to={`/Tracking?id=${posted.id}`}>Track this donation <ArrowRight size={16} /></Link>
            <button type="button" className="workspace-secondary" onClick={reset}>Donate something else</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="donate-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Donate food</h1>
          <p>Tell us what you have and where to collect it. NGOs nearby can claim it right away.</p>
        </div>
        <Illustration name="hero-donate" className="workspace-heading-art" />
      </section>

      <div className="donate-layout">
        <form className="donate-form" onSubmit={submit}>
          <section className="workspace-panel donate-step">
            <header><span className="donate-step-no">1</span><h2>What are you donating?</h2></header>

            <div className="donate-types" role="radiogroup" aria-label="Type of food">
              {TYPES.map((t) => (
                <label key={t.value} className={`donate-type${type === t.value ? " is-selected" : ""}`}>
                  <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} />
                  <Illustration name={t.art} className="donate-type-art" />
                  <strong>{t.value}</strong>
                  <span>{t.hint}</span>
                  <Check size={16} className="donate-type-check" aria-hidden="true" />
                </label>
              ))}
            </div>

            <div className="donate-items">
              <div className="donate-items-head">
                <span className="donate-label">Food items</span>
                <span className="donate-total">{portions} portions</span>
              </div>
              {items.map((it, i) => (
                <div key={i} className="donate-item">
                  <input
                    aria-label={`Item ${i + 1} name`}
                    placeholder={i === 0 ? "e.g. Veg pulao" : "Another item"}
                    value={it.name}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    maxLength={80}
                  />
                  <div className="donate-stepper" role="group" aria-label={`Item ${i + 1} portions`}>
                    <button type="button" aria-label="Fewer portions" onClick={() => setItem(i, { quantity: Math.max(1, (Number(it.quantity) || 1) - 5) })}><Minus size={15} /></button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      aria-label="Portions"
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    />
                    <button type="button" aria-label="More portions" onClick={() => setItem(i, { quantity: (Number(it.quantity) || 0) + 5 })}><Plus size={15} /></button>
                  </div>
                  <button type="button" className="donate-remove" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className="donate-add" onClick={() => setItems((l) => [...l, blankItem()])}>
                <Plus size={16} /> Add another item
              </button>
            </div>
          </section>

          <section className="workspace-panel donate-step">
            <header><span className="donate-step-no">2</span><h2>Where should we pick it up?</h2></header>
            <label className="donate-label" htmlFor="donate-location">Pickup address</label>
            <div className="donate-location">
              <span className="donate-input-icon"><MapPin size={18} /></span>
              <input
                id="donate-location"
                required
                maxLength={500}
                placeholder="House / building, street, area, city"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setCoords(null);
                }}
              />
              <button type="button" className="workspace-secondary" onClick={locateMe} disabled={locating}>
                <LocateFixed size={16} /> {locating ? "Locating…" : "Use my location"}
              </button>
            </div>
            <p className={`donate-hint${coords ? " is-ok" : ""}`}>
              {coords ? <><Check size={14} /> Exact location captured: volunteers get a precise map pin.</> : "A full address with area and city helps volunteers find you."}
            </p>
          </section>

          <section className="workspace-panel donate-step">
            <header><span className="donate-step-no">3</span><h2>How can volunteers reach you?</h2></header>
            <div className="donate-two">
              <div>
                <label className="donate-label" htmlFor="donate-contact">Phone number</label>
                <input id="donate-contact" type="tel" required maxLength={20} placeholder="+91 98765 43210" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div>
                <label className="donate-label" htmlFor="donate-notes">Notes <span className="donate-optional">(optional)</span></label>
                <textarea id="donate-notes" rows={3} maxLength={500} placeholder="Gate code, cooked at 2 pm, contains nuts…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </section>

          {error && <p className="donate-error" role="alert">{error}</p>}
          <button type="submit" className="workspace-primary donate-submit" disabled={submitting}>
            {submitting ? "Posting…" : <>Post donation <ArrowRight size={17} /></>}
          </button>
        </form>

        <aside className="donate-side">
          <section className="workspace-panel donate-summary">
            <h2>Your donation</h2>
            <div className="donate-summary-type">
              <Illustration name={TYPES.find((t) => t.value === type).art} className="donate-summary-art" />
              <div><strong>{type}</strong><span>{portions} portions · {namedItems.length || 0} item{namedItems.length === 1 ? "" : "s"}</span></div>
            </div>
            {namedItems.length > 0 && (
              <ul className="donate-summary-items">
                {namedItems.map((it, i) => <li key={i}><span>{it.name}</span><span>{it.quantity}</span></li>)}
              </ul>
            )}
            <p className="donate-summary-where"><MapPin size={15} /> {location || "Pickup address not added yet"}</p>
          </section>

          <section className="workspace-panel donate-next">
            <h2>What happens next</h2>
            <ol>
              {NEXT_STEPS.map((s) => (
                <li key={s.title}>
                  <Illustration name={s.art} className="donate-next-art" />
                  <div><strong>{s.title}</strong><span>{s.text}</span></div>
                </li>
              ))}
            </ol>
          </section>

          <Link className="workspace-panel donate-fresh" to="/ImageRecognition">
            <Illustration name="scan-tomato" className="donate-fresh-art" />
            <div><strong>Not sure it's still fresh?</strong><span><ScanSearch size={14} /> Run a quick freshness check</span></div>
            <ArrowRight size={18} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default Donate;
