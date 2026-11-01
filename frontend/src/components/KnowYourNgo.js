import React, { useEffect, useState } from "react";
import "./PersonaTheme.css";
import "./KnowYourNgo.css";
import { apiFetch } from "../api/client";

const KnowYourNgo = () => {
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  async function fetchVolunteers() {
    try {
      const data = await apiFetch("/api/organizations");
      setVolunteers(data.organizations || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }

  return (
    <div className="fh-theme theme-organization know-your-ngo">
      <div className="fh-blob" aria-hidden="true" />
      {/* Volunteers Section */}
      <div className="fh-page">
        <h4 className="fh-title">NGO Detail</h4>
        {/* <button onClick={fetchVolunteers}>Refresh</button> */}
        {volunteers.length > 0 ? (
          <div className="ngo-list">
            {volunteers.map((volunteer, index) => (
              <div key={index} className="volunteer-card fh-card">
                <p>
                  <strong className="fh-label">Name:</strong> {volunteer.name}
                </p>
                <p>
                  <strong className="fh-label">Location:</strong> {volunteer.address}
                </p>
                <p>
                  <strong className="fh-label">Contact:</strong> {volunteer.contact}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty fh-card">No volunteers found.</p>
        )}
      </div>
    </div>
  );
};

export default KnowYourNgo;
