import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import { apiFetch } from "../api/client";

function Register() {
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationLocation, setOrganizationLocation] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNumber, setContactNo] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);

        try {
          // Use reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          const address = data.display_name;
          setOrganizationLocation(address);
        } catch (error) {
          console.error("Error fetching address:", error);
        }
      },
      (error) => {
        alert("Unable to retrieve your location.");
        console.error("Geolocation error:", error);
      }
    );
  };

  // Insert into backend
  const insertData = async () => {
    await apiFetch("/api/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: organizationName,
        address: organizationLocation,
        description: organizationDescription,
        contact: contactPerson,
        email: contactEmail,
        ContactNumber: contactNumber,
        latitude,
        longitude,
      }),
    });

    alert("Thank you for registering your organization!");
    setOrganizationName("");
    setOrganizationLocation("");
    setOrganizationDescription("");
    setContactPerson("");
    setContactEmail("");
    setContactNo("");
    setLatitude(null);
    setLongitude(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !organizationName ||
      !organizationLocation ||
      !organizationDescription ||
      !contactPerson ||
      !contactEmail ||
      !contactNumber
    ) {
      alert("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await insertData();
      navigate("/NgoDashboard");
    } catch (err) {
      console.error("Error during registration:", err);
      setError("There was an error submitting your form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-organization-container">
      <h2>Register Your Organization</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label htmlFor="organizationName">Organization Name</label>
          <input
            type="text"
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="organizationLocation">Organization Location</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              id="organizationLocation"
              value={organizationLocation}
              onChange={(e) => setOrganizationLocation(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleLocateMe}>
              Locate Me
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="contactNumber">Contact Number</label>
          <input
            type="number"
            id="contactNumber"
            value={contactNumber}
            onChange={(e) => setContactNo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="organizationDescription">Description</label>
          <textarea
            id="organizationDescription"
            value={organizationDescription}
            onChange={(e) => setOrganizationDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contactPerson">Contact Person</label>
          <input
            type="text"
            id="contactPerson"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email</label>
          <input
            type="email"
            id="contactEmail"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="register-btn" disabled={loading}>
          {loading ? "Registering..." : "Register Organization"}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}

export default Register;
