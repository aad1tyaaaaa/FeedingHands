import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./Register.css";
import { apiFetch, apiUrl } from "../api/client";
import Illustration from "./Illustration";

const EMPTY = { name: "", address: "", description: "", contact: "", email: "", phone: "", website: "", latitude: null, longitude: null };

// The signed-in organization's own profile: created on first save, edited afterwards.
function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [isNew, setIsNew] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleLocateMe = () => {
    if (!navigator.geolocation) return setError("Geolocation is not supported by your browser.");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setForm((f) => ({ ...f, latitude: coords.latitude, longitude: coords.longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          );
          const data = await res.json();
          if (data.display_name) setForm((f) => ({ ...f, address: data.display_name }));
        } catch {
          // keep the coordinates; the address can be typed
        }
      },
      () => setError("Unable to read your location. Type the address instead."),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/organizations/me", { method: "PUT", body: JSON.stringify(form) });
      if (isNew) navigate("/NgoDashboard", { replace: true });
      else setNotice("Profile saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("Logo must be 2 MB or smaller.");
    const body = new FormData();
    body.append("logo", file);
    try {
      const { organization } = await apiFetch("/api/organizations/me/logo", { method: "PUT", body });
      setLogoUrl(organization.logo_url);
      setNotice("Logo updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-page fh-theme theme-organization">
      <div className="fh-blob" aria-hidden="true" />
      <div className="register-organization-container fh-card">
        <Illustration name="ngo-building" className="fh-hero-art" />
        <h2 className="fh-title">{isNew ? <>Register Your <em>Organization</em></> : <>Your <em>Organization</em></>}</h2>
        {!isNew && <p><Link to="/NgoDashboard">← Back to dashboard</Link></p>}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="org-name">Organization Name</label>
            <input type="text" id="org-name" value={form.name} onChange={set("name")} required maxLength={200} />
          </div>
          <div className="form-group">
            <label htmlFor="org-address">Address</label>
            <div className="register-locate">
              <input type="text" id="org-address" value={form.address} onChange={set("address")} required maxLength={500} />
              <button type="button" className="fh-btn fh-btn--pop" onClick={handleLocateMe}>Locate Me</button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="org-phone">Contact Number</label>
            <input type="tel" id="org-phone" value={form.phone} onChange={set("phone")} required maxLength={30} placeholder="+912225000000" />
          </div>
          <div className="form-group">
            <label htmlFor="org-description">Description</label>
            <textarea id="org-description" value={form.description} onChange={set("description")} required maxLength={2000} />
          </div>
          <div className="form-group">
            <label htmlFor="org-contact">Contact Person</label>
            <input type="text" id="org-contact" value={form.contact} onChange={set("contact")} required maxLength={200} />
          </div>
          <div className="form-group">
            <label htmlFor="org-email">Contact Email</label>
            <input type="email" id="org-email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="form-group">
            <label htmlFor="org-website">Website (optional)</label>
            <input type="text" id="org-website" value={form.website} onChange={set("website")} maxLength={300} />
          </div>
          {!isNew && (
            <div className="form-group">
              <label htmlFor="org-logo">Logo (PNG, JPEG or WebP, up to 2 MB)</label>
              {logoUrl && <img src={apiUrl(logoUrl)} alt="" width={72} height={72} style={{ objectFit: "contain" }} />}
              <input type="file" id="org-logo" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} />
            </div>
          )}
          <button type="submit" className="register-btn fh-btn" disabled={loading}>
            {loading ? "Saving..." : isNew ? "Register Organization" : "Save changes"}
          </button>
          {error && <p className="error-message" role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
        </form>
      </div>
    </div>
  );
}

export default Register;
