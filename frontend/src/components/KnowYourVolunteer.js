import React, { useEffect, useState } from "react";
import "./PersonaTheme.css";
import "./KnowYourVolunteer.css";
import { apiFetch } from "../api/client";

const KnowYourVolunteer= () => {
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  async function fetchVolunteers() {
    try {
      const data = await apiFetch("/api/volunteers");
      setVolunteers(data.volunteers || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }

  return (
    <div className="fh-theme theme-volunteer know-volunteer">
      <div className="fh-blob" aria-hidden="true" />
      {/* Volunteers Section */}
      <div className="fh-page">
        <h4 className="fh-title">Volunteer <em>Detail</em></h4>
        {/* <button onClick={fetchVolunteers}>Refresh</button> */}
        {volunteers.length > 0 ? (
          volunteers.map((volunteer, index) => (
            <div key={index} className="volunteer-card fh-card">
              <p>
                <strong className="fh-label">Name:</strong> {volunteer.name}
              </p>
              
              <p>
                <strong className="fh-label">Contact:</strong> {volunteer.phone}
              </p>
            </div>
          ))
        ) : (
          <p className="fh-card volunteer-empty">No volunteers found.</p>
        )}
      </div>
    </div>
  );
};

export default KnowYourVolunteer;
