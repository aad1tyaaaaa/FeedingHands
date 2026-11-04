import { useEffect, useState } from "react";
import "./PersonaTheme.css";
import "./KnowYourNgo.css";
import { apiFetch, apiUrl } from "../api/client";
import Illustration from "./Illustration";

// Directory of partner NGOs: where to deliver food and whom to call.
const KnowYourNgo = () => {
  const [organizations, setOrganizations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/organizations")
      .then((data) => setOrganizations(data.organizations || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="fh-theme theme-organization know-your-ngo">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page">
        <Illustration name="handshake" className="fh-hero-art" />
        <h4 className="fh-title">Partner NGOs</h4>
        {error && <p role="alert">{error}</p>}
        {organizations.length > 0 ? (
          <div className="ngo-list">
            {organizations.map((o) => (
              <div key={o.id} className="volunteer-card fh-card">
                {o.logo_url && <img src={apiUrl(o.logo_url)} alt="" width={56} height={56} style={{ objectFit: "contain" }} />}
                <p><strong className="fh-label">Name:</strong> {o.name}</p>
                {o.description && <p>{o.description}</p>}
                <p><strong className="fh-label">Location:</strong> {o.address}</p>
                {o.phone && <p><strong className="fh-label">Phone:</strong> <a href={`tel:${o.phone}`}>{o.phone}</a></p>}
                {o.website && <p><a href={o.website} target="_blank" rel="noopener noreferrer">Website</a></p>}
              </div>
            ))}
          </div>
        ) : (
          !error && <p className="empty fh-card">No partner NGOs yet.</p>
        )}
      </div>
    </div>
  );
};

export default KnowYourNgo;
