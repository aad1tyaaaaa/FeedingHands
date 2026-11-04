import React, { useEffect, useState } from "react";
import "./PersonaTheme.css";
import "./VolunteerForm.css";
import { apiFetch } from "../api/client";
import Illustration from "./Illustration";

// The volunteer's own profile; created automatically when they chose the role, edited here.
const VolunteerForm = () => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/volunteers/me")
      .then(({ volunteer: v }) => {
        setFormData({ name: v.name, email: v.email, phone: v.phone, address: v.address });
        setStats(v);
      })
      .catch((err) => err.status !== 404 && setMessage(err.message));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { volunteer } = await apiFetch("/api/volunteers/me", { method: "PUT", body: JSON.stringify(formData) });
      setStats(volunteer);
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fh-theme theme-volunteer volunteer-signup">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page volunteer-container">
      <div className="volunteer-hero">
        <Illustration name="profile-verified" className="fh-hero-art" />
        <span className="fh-chip">Volunteer</span>
        <h1 className="fh-title">Your <em>Volunteer</em> Profile</h1>
        <p>{stats ? `${stats.deliveries} deliveries completed. Thank you!` : "Keep your details current so NGOs and donors can reach you."}</p>
      </div>
      <div className="volunteer-form fh-card">
        <div className="form-header">
          <div className="form-icon" aria-hidden="true">🤝</div>
          <h2>Contact details</h2>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="input-group">
            <label className="fh-label" htmlFor="vf-name">Full Name</label>
            <input
              type="text"
              id="vf-name"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label className="fh-label" htmlFor="vf-email">Email</label>
            <input
              type="email"
              id="vf-email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label className="fh-label" htmlFor="vf-phone">Phone Number</label>
            <input
              type="tel"
              id="vf-phone"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label className="fh-label" htmlFor="vf-address">Address</label>
            <input
              type="text"
              id="vf-address"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="submit-btn fh-btn" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </div>
      </div>
    </div>
  );
};

export default VolunteerForm;
