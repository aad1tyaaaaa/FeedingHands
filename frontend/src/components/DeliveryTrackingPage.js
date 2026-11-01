import React, { useState, useEffect } from "react";
import { useFoodTracking } from "./FoodTrackingContext";
import { Link, useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./DeliveryTrackingPage.css";
import { apiFetch } from "../api/client";

const DeliveryTrackingPage = () => {
  const [status, setStatus] = useState("accepted"); // 'accepted', 'picked', 'delivered'
  const { incrementStep } = useFoodTracking();
  const [deliveryData, setDeliveryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch latest donation data on page load
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/donations");
      setDeliveryData((data.donations || [])[0] || null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load delivery details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = () => {
    incrementStep();
    setStatus("picked");
  };

  const handleDelivery = () => {
    incrementStep();
    setTimeout(() => {
      setStatus("delivered");
    }, 0);
  };

  const shell = (children) => (
    <div className="fh-theme theme-volunteer delivery-tracking">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page delivery-container">{children}</div>
    </div>
  );

  if (loading) return shell(<p className="fh-card delivery-state" role="status">Loading delivery data...</p>);
  if (error) return shell(<p className="fh-card delivery-state delivery-state--error" role="alert">{error}</p>);
  if (!deliveryData) return shell(<p className="fh-card delivery-state">No delivery data found.</p>);

  return shell(
      <div className="delivery-card">
        <div className="delivery-header">
          <h1 className="fh-title">Delivery <em>Details</em></h1>
          <p className="fh-label delivery-status">
            Status:
            <span className="status-badge fh-chip">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </p>
          <Link to="/Route_Optimization" className="fh-btn fh-btn--ghost">
            Map
          </Link>
        </div>

        <div className="content">
          {/* ✅ Donor Address Details */}
          <div className="address-card fh-card">
            <h2>Pickup Location</h2>
            <p className="address-details">
              <span>Name:</span> {deliveryData.donar_name}
            </p>
            <p className="address-details">
              <span>Address:</span> {deliveryData.location}
            </p>
            <p className="address-details">
              <span>Phone:</span> {deliveryData.contact}
            </p>
          </div>

          {/* ✅ NGO/Organization Address Details */}
          <div className="address-card fh-card">
            <h2>Delivery Location</h2>
            <p className="address-details">
              <span>NGO:</span> {deliveryData.ngo_name}
            </p>
            <p className="address-details">
              <span>Address:</span> {deliveryData.ngo_address}
            </p>
            <p className="address-details">
              <span>Phone:</span> {deliveryData.ngo_phone}
            </p>
          </div>

          {/* ✅ Action Buttons */}
          <div className="button-container">
            <button
              onClick={handlePickup}
              disabled={status !== "accepted"}
              className="button pickup-button fh-btn"
            >
              Picked up from Donor
            </button>

            <button
              onClick={handleDelivery}
              disabled={status !== "picked"}
              className="button deliver-button fh-btn fh-btn--pop"
            >
              Delivered to NGO
            </button>
          </div>

          {status === "delivered" && (
            <div className="success-message fh-card" role="status">
              Delivery completed successfully! Thank you for your service.
            </div>
          )}
        </div>
      </div>
  );
};

export default DeliveryTrackingPage;
