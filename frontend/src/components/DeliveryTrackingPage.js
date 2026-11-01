import React, { useState, useEffect } from "react";
import { useFoodTracking } from "./FoodTrackingContext";
import { Link, useNavigate } from "react-router-dom";
import "./DeliveryTrackingPage.css"
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

  if (loading) return <p>Loading delivery data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!deliveryData) return <p>No delivery data found.</p>;

  return (
    <div className="delivery-container">
      <div className="delivery-card">
        <div className="header">
          <h1>Delivery Details</h1>
          <p>
            Status:
            <span className="status-badge">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </p>
          <Link to="/Route_Optimization">
          <button>Map</button>
          </Link>
        </div>

        <div className="content">
          {/* ✅ Donor Address Details */}
          <div className="address-card">
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
          <div className="address-card">
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
              className="button pickup-button"
            >
              Picked up from Donor
            </button>

            <button
              onClick={handleDelivery}
              disabled={status !== "picked"}
              className="button deliver-button"
            >
              Delivered to NGO
            </button>
          </div>

          {status === "delivered" && (
            <div className="success-message">
              Delivery completed successfully! Thank you for your service.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackingPage;
