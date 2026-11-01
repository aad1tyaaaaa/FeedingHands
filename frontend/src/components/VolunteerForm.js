import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./VolunteerForm.css";
import { apiFetch } from "../api/client";

const VolunteerForm = () => {
  const navigate = useNavigate();

  const handleVolunteersubmit = () => {
    navigate("/VolunteerDashboard");
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    // availability: "",
    // skills: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/volunteers", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        }),
      });
      alert("Thank you for volunteering!");
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        // availability: "",
        // skills: "",
      });
      navigate("/VolunteerDashboard");
    } catch (err) {
      console.error("Error submitting volunteer form:", err);
      alert(err.message || "Error submitting form. Please try again.");
    }
  };

  return (
    <div className="fh-theme theme-volunteer volunteer-signup">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page volunteer-container">
      <div className="volunteer-hero">
        <span className="fh-chip">Volunteer</span>
        <h1 className="fh-title">Join Our <em>Volunteer</em> Program</h1>
        <p>Make a difference by volunteering your time and skills.</p>
      </div>
      <div className="volunteer-form fh-card">
        <div className="form-header">
          <div className="form-icon" aria-hidden="true">🤝</div>
          <h2>Volunteer Signup</h2>
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
          {/* <div className="input-group">
            <span className="input-icon"></span>
            <input
              type="datetime-local"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              required
            />
          </div> */}
          {/* <div className="input-group">
            <span className="input-icon"></span>
            <input
              type="text"
              name="skills"
              placeholder="Skills (comma-separated)"
              value={formData.skills}
              onChange={handleChange}
              required
            />
          </div> */}
          <button
            type="submit"
            className="submit-btn fh-btn"
            onClick={handleVolunteersubmit}
          >
            Submit
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};

export default VolunteerForm;
