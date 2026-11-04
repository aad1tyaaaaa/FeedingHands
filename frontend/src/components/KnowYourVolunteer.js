import { useEffect, useState } from "react";
import "./PersonaTheme.css";
import "./KnowYourVolunteer.css";
import { apiFetch } from "../api/client";
import Illustration from "./Illustration";

// The public volunteer wall: names and deliveries only. Contact details stay private.
const KnowYourVolunteer = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/volunteers")
      .then((data) => setVolunteers(data.volunteers || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="fh-theme theme-volunteer know-volunteer">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page">
        <Illustration name="high-five" className="fh-hero-art" />
        <h4 className="fh-title">Our <em>Volunteers</em></h4>
        {error && <p role="alert">{error}</p>}
        {volunteers.length > 0 ? (
          volunteers.map((v) => (
            <div key={v.id} className="volunteer-card fh-card">
              <p><strong className="fh-label">Name:</strong> {v.name}</p>
              <p><strong className="fh-label">Deliveries:</strong> {v.deliveries}</p>
              <p><strong className="fh-label">Volunteering since:</strong> {new Date(v.created_at).toLocaleDateString()}</p>
            </div>
          ))
        ) : (
          !error && <p className="fh-card volunteer-empty">No volunteers yet.</p>
        )}
      </div>
    </div>
  );
};

export default KnowYourVolunteer;
