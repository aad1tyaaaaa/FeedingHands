import { useCallback, useEffect, useState } from "react";
import {
  FaRecycle,
  FaLeaf,
  FaTruckMoving,
  FaChartLine,
  FaQuestionCircle,
} from "react-icons/fa";
import "./PersonaTheme.css";
import "./BiogasDonation.css";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";
import DatePicker, { toISODate } from "./DatePicker";

const PICKUP_STATUS = { scheduled: "Scheduled", collected: "Collected", cancelled: "Cancelled" };

// Donors schedule food-waste pickups; biogas partners see every pickup and mark them collected.
const BiogasDonation = () => {
  const { user } = useAuth();
  const partner = user.role === "biogas" || user.role === "admin";
  const [pickups, setPickups] = useState([]);
  const [listError, setListError] = useState("");

  const loadPickups = useCallback(async () => {
    try {
      setPickups((await apiFetch("/api/biogas-donations")).donations || []);
      setListError("");
    } catch (err) {
      setListError(err.message);
    }
  }, []);

  useEffect(() => {
    loadPickups();
  }, [loadPickups]);

  const setStatus = async (id, status) => {
    if (status === "cancelled" && !window.confirm("Cancel this pickup?")) return;
    try {
      await apiFetch(`/api/biogas-donations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      loadPickups();
    } catch (err) {
      setListError(err.message);
    }
  };

  const pickupList = (
    <section className="donation-form fh-card" aria-label="Pickups">
      <h2>{partner ? "Pickup requests" : "Your scheduled pickups"}</h2>
      {listError && <p role="alert">{listError}</p>}
      {pickups.length ? (
        <div className="workspace-table-wrap">
          <table className="workspace-data-table">
            <thead><tr><th>Date</th><th>Waste</th><th>Quantity</th><th>Address</th>{partner && <th>Contact</th>}<th>Status</th><th></th></tr></thead>
            <tbody>{pickups.map((p) => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td>{p.food_type}</td>
                <td>{p.quantity} kg</td>
                <td>{p.address}</td>
                {partner && <td>{p.donor_name} · <a href={`tel:${p.contact_number}`}>{p.contact_number}</a></td>}
                <td><span className={`status-pill ${p.status === "collected" ? "delivered" : p.status === "cancelled" ? "cancelled" : "available"}`}>{PICKUP_STATUS[p.status]}</span>{p.collector_name && <small> by {p.collector_name}</small>}</td>
                <td>
                  {p.status === "scheduled" && partner && <button className="workspace-table-action" type="button" onClick={() => setStatus(p.id, "collected")}>Mark collected</button>}
                  {p.status === "scheduled" && <button className="workspace-table-action" type="button" onClick={() => setStatus(p.id, "cancelled")}>Cancel</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <p>{partner ? "No pickup requests yet." : "You haven't scheduled a pickup yet."}</p>
      )}
    </section>
  );
  const [formData, setFormData] = useState({
    wasteType: "",
    quantity: "",
    location: "",
    pickupDate: "",
    contact: "",
  });
  const [showFAQ, setShowFAQ] = useState(false);

  const foodTypes = [
    "Vegetable Waste",
    "Fruit Waste",
    "Dairy Waste",
    "Meat Waste",
    "Other",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/biogas-donations", {
        method: "POST",
        body: JSON.stringify({
          food_type: formData.wasteType,
          quantity: formData.quantity,
          address: formData.location,
          date: formData.pickupDate,
          contact_number: formData.contact,
        }),
      });
      alert("Pickup scheduled! A biogas partner will collect it on the chosen date.");
      loadPickups();
      setFormData({
        wasteType: "",
        quantity: "",
        location: "",
        pickupDate: "",
        contact: "",
      });
    } catch (error) {
      alert(error.message || "Submission failed");
    }
  };

  return (
    <div className="fh-theme biogas-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="biogas-container fh-page">
      {/* Hero Section */}
      <div className="biogas-hero">
        <Illustration name="hero-biogas" className="fh-hero-art" />
        <div className="hero-content">
          <span className="fh-chip">Waste → Energy</span>
          <h1 className="fh-title">
            Transform Food Waste into <em>Clean Energy</em> <FaRecycle aria-hidden="true" />
          </h1>
          <p>Donate your non-edible food waste to help generate biogas</p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="benefits-section">
        <h2>
          Why Donate Food Waste? <FaLeaf aria-hidden="true" />
        </h2>
        <div className="benefits-grid">
          <div className="benefit-card fh-card">
            <Illustration name="waste-bin" className="benefit-art" />
            <h3>Reduce Landfill</h3>
            <p>
              Divert organic waste from landfills and reduce methane emissions
            </p>
          </div>
          <div className="benefit-card fh-card">
            <Illustration name="clean-energy" className="benefit-art" />
            <h3>Generate Energy</h3>
            <p>1 ton of food waste can generate 300 kWh of electricity</p>
          </div>
          <div className="benefit-card fh-card">
            <Illustration name="sprout" className="benefit-art" />
            <h3>Create Fertilizer</h3>
            <p>Byproduct of biogas production enriches agricultural soil</p>
          </div>
        </div>
      </div>

      {partner && pickupList}
      {!partner && (
      <form className="donation-form fh-card" onSubmit={handleSubmit}>
        <h2>
          Schedule a Food Waste Pickup <FaTruckMoving aria-hidden="true" />
        </h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="fh-label" htmlFor="bio-type">Type of Food Waste</label>
            <select
              id="bio-type"
              name="wasteType"
              value={formData.wasteType}
              onChange={handleChange}
              required
            >
              <option value="">Select waste type</option>
              {foodTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="fh-label" htmlFor="bio-qty">Approximate Quantity (kg)</label>
            <input
              id="bio-qty"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="fh-label" htmlFor="bio-location">Pickup Location</label>
            <input
              id="bio-location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="fh-label" htmlFor="bio-date">Preferred Pickup Date</label>
            <DatePicker
              id="bio-date"
              name="pickupDate"
              min={toISODate(new Date())}
              value={formData.pickupDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="fh-label" htmlFor="bio-contact">Contact Number</label>
            <input
              id="bio-contact"
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <button type="submit" className="submit-btn fh-btn">
          Schedule Pickup
        </button>
      </form>
      )}
      {!partner && pickupList}

      {/* FAQ Section */}
      <div className="faq-section">
        <button
          className="faq-toggle fh-btn fh-btn--ghost"
          aria-expanded={showFAQ}
          onClick={() => setShowFAQ(!showFAQ)}
        >
          <FaQuestionCircle aria-hidden="true" /> {showFAQ ? "Hide" : "Show"} FAQs
        </button>
        {showFAQ && (
          <div className="faq-content">
            <div className="faq-item fh-card">
              <h3>What types of food waste can be donated?</h3>
              <p>
                We accept all non-edible organic waste including vegetable
                peels, fruit cores, coffee grounds, and eggshells.
              </p>
            </div>
            <div className="faq-item fh-card">
              <h3>Is there a minimum quantity requirement?</h3>
              <p>
                We accept donations of any size, but recommend at least 5kg for
                scheduled pickups.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default BiogasDonation;
