import React, { useEffect, useState } from "react";
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
    <div>
      {/* Volunteers Section */}
      <div>
        <h4>Volunteer Detail</h4>
        {/* <button onClick={fetchVolunteers}>Refresh</button> */}
        {volunteers.length > 0 ? (
          volunteers.map((volunteer, index) => (
            <div key={index} className="volunteer-card">
              <p>
                <strong>Name:</strong> {volunteer.name}
              </p>
              
              <p>
                <strong>Contact:</strong> {volunteer.phone}
              </p>
            </div>
          ))
        ) : (
          <p>No volunteers found.</p>
        )}
      </div>
    </div>
  );
};

export default KnowYourVolunteer;
