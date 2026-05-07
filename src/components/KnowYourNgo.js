import React, { useEffect, useState } from "react";
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
    <div>
      {/* Volunteers Section */}
      <div>
        <h4>NGO Detail</h4>
        {/* <button onClick={fetchVolunteers}>Refresh</button> */}
        {volunteers.length > 0 ? (
          volunteers.map((volunteer, index) => (
            <div key={index} className="volunteer-card">
              <p>
                <strong>Name:</strong> {volunteer.name}
              </p>
              <p>
                <strong>Location:</strong> {volunteer.address}
              </p>
              <p>
                <strong>Contact:</strong> {volunteer.contact}
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

export default KnowYourNgo;
