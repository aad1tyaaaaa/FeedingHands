import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Globe, ImageUp, LocateFixed, Mail, MapPin, Phone, UserRound } from "lucide-react";
import "./PersonaTheme.css";
import "./Register.css";
import { apiFetch, apiUrl } from "../api/client";
import Illustration from "./Illustration";

const EMPTY = { name: "", address: "", description: "", contact: "", email: "", phone: "", website: "", latitude: null, longitude: null };

// The signed-in organization's own profile: created on first save (right after choosing the role), edited afterwards.
function Register() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [isNew, setIsNew] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiFetch("/api/organizations/me")
      .then(({ organization: o }) => {
        setForm({
          name: o.name, address: o.address, description: o.description, contact: o.contact, email: o.email,
          phone: o.phone, website: o.website, latitude: o.latitude, longitude: o.longitude,
        });
        setLogoUrl(o.logo_url);
        setIsNew(false);
      })
      .catch((err) => err.status !== 404 && setError(err.message));
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value, ...(field === "address" ? { latitude: null, longitude: null } : {}) }));
    setNotice("");
  };

  const locateMe = () => {
    if (!navigator.geolocation) return setError("Your browser can't share a location. Type the address instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setForm((f) => ({ ...f, latitude: coords.latitude, longitude: coords.longitude }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) setForm((f) => ({ ...f, address: data.display_name }));
        } catch {
          // keep the coordinates; the address can be typed
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
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/organizations/me", { method: "PUT", body: JSON.stringify(form) });
      if (isNew) navigate("/NgoDashboard", { replace: true });
      else setNotice("Profile saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("Logo must be 2 MB or smaller.");
    const body = new FormData();
    body.append("logo", file);
    try {
      const { organization } = await apiFetch("/api/organizations/me/logo", { method: "PUT", body });
      setLogoUrl(organization.logo_url);
      setNotice("Logo updated.");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="org-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>{isNew ? "Register your organization" : "Organization profile"}</h1>
          <p>Donors and volunteers see this in the NGO directory and on every donation you claim.</p>
        </div>
        <Illustration name="hero-ngo" className="workspace-heading-art" />
      </section>

      {isNew && (
        <p className="org-banner" role="status">
          <Check size={16} /> One step left: save your organization's details to start claiming donations.
        </p>
      )}

      <div className="org-layout">
        <form className="org-form" onSubmit={submit}>
          <section className="workspace-panel org-step">
            <header><span className="org-step-no">1</span><h2>About your organization</h2></header>
            <label className="org-label" htmlFor="org-name">Organization name</label>
            <div className="org-field">
              <Building2 size={18} className="org-field-icon" />
              <input id="org-name" value={form.name} onChange={set("name")} required maxLength={200} placeholder="e.g. Annapurna Food Bank" />
            </div>
            <label className="org-label" htmlFor="org-description">What you do</label>
            <textarea id="org-description" rows={3} value={form.description} onChange={set("description")} required maxLength={2000} placeholder="Who you feed, how many meals a day, your kitchen hours…" />
            <label className="org-label" htmlFor="org-website">Website <span className="org-optional">(optional)</span></label>
            <div className="org-field">
              <Globe size={18} className="org-field-icon" />
              <input id="org-website" value={form.website} onChange={set("website")} maxLength={300} placeholder="annapurna.org" />
            </div>
          </section>

          <section className="workspace-panel org-step">
            <header><span className="org-step-no">2</span><h2>Where volunteers deliver</h2></header>
            <label className="org-label" htmlFor="org-address">Address</label>
            <div className="org-location">
              <div className="org-field">
                <MapPin size={18} className="org-field-icon" />
                <input id="org-address" value={form.address} onChange={set("address")} required maxLength={500} placeholder="Building, street, area, city" />
              </div>
              <button type="button" className="workspace-secondary" onClick={locateMe} disabled={locating}>
                <LocateFixed size={16} /> {locating ? "Locating…" : "Use my location"}
              </button>
            </div>
            <p className={`org-hint${form.latitude != null ? " is-ok" : ""}`}>
              {form.latitude != null ? <><Check size={14} /> Map pin saved: volunteers get turn-by-turn directions to you.</> : "Use your location to add a map pin for route planning."}
            </p>
          </section>

          <section className="workspace-panel org-step">
            <header><span className="org-step-no">3</span><h2>How people reach you</h2></header>
            <div className="org-three">
              <div>
                <label className="org-label" htmlFor="org-contact">Contact person</label>
                <div className="org-field">
                  <UserRound size={18} className="org-field-icon" />
                  <input id="org-contact" value={form.contact} onChange={set("contact")} required maxLength={200} placeholder="Full name" />
                </div>
              </div>
              <div>
                <label className="org-label" htmlFor="org-phone">Phone</label>
                <div className="org-field">
                  <Phone size={18} className="org-field-icon" />
                  <input id="org-phone" type="tel" value={form.phone} onChange={set("phone")} required maxLength={30} placeholder="+91 22 2500 0000" />
                </div>
              </div>
              <div>
                <label className="org-label" htmlFor="org-email">Email</label>
                <div className="org-field">
                  <Mail size={18} className="org-field-icon" />
                  <input id="org-email" type="email" value={form.email} onChange={set("email")} required placeholder="team@annapurna.org" />
                </div>
              </div>
            </div>
          </section>

          {error && <p className="org-error" role="alert">{error}</p>}
          {notice && <p className="org-notice" role="status"><Check size={16} /> {notice}</p>}
          <button type="submit" className="workspace-primary org-submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? <>Register organization <ArrowRight size={17} /></> : "Save changes"}
          </button>
        </form>

        <aside className="org-side">
          <section className="workspace-panel org-logo">
            <h2>Logo</h2>
            <div className="org-logo-box">
              {logoUrl ? <img src={apiUrl(logoUrl)} alt="Your logo" /> : <Illustration name="hero-ngo" className="org-logo-placeholder" />}
            </div>
            {isNew ? (
              <p className="org-hint">Save your profile first, then add a logo.</p>
            ) : (
              <>
                <button type="button" className="workspace-secondary org-logo-button" onClick={() => fileRef.current.click()}>
                  <ImageUp size={16} /> {logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                <p className="org-hint">PNG, JPEG or WebP, up to 2 MB.</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadLogo} />
          </section>

          <section className="workspace-panel org-preview">
            <h2>Directory preview</h2>
            <div className="org-preview-card">
              <div className="org-preview-head">
                {logoUrl ? <img src={apiUrl(logoUrl)} alt="" /> : <span className="org-preview-initial">{(form.name || "N").charAt(0).toUpperCase()}</span>}
                <strong>{form.name || "Your organization"}</strong>
              </div>
              <p>{form.description || "A short description of your work appears here."}</p>
              <span><MapPin size={14} /> {form.address || "Address"}</span>
              <span><Phone size={14} /> {form.phone || "Phone"}</span>
            </div>
            {!isNew && <Link className="workspace-inline-link" to="/KnowYourNgo">Open the directory</Link>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Register;
