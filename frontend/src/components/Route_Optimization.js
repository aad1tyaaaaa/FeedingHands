import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./PersonaTheme.css";
import "./Route.css";
import { apiFetch } from "../api/client";
import { FALLBACK_CENTER, currentPosition, drivingRoute, hasCoords, popup } from "../api/geo";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";

const DOT = { start: "#12b76a", pickup: "#ff6b2c", ngo: "#6c4cff" };
const dot = (color) => ({ radius: 9, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 });

// Route for one donation: your location -> donor pickup -> claiming NGO.
// Without ?id= it opens the caller's first donation still on the move.
const RouteOptimization = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const mapEl = useRef(null);
  const [donation, setDonation] = useState(null);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = params.get("id");
        let d;
        if (id) {
          d = (await apiFetch(`/api/donations/${encodeURIComponent(id)}`)).donation;
        } else {
          const { donations } = await apiFetch("/api/donations?assigned=me&status=requested,picked_up,in_transit");
          d = (donations || [])[0];
        }
        if (!cancelled) setDonation(d || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!donation || !mapEl.current) return undefined;
    const map = L.map(mapEl.current, { center: FALLBACK_CENTER, zoom: 12 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    let alive = true;
    (async () => {
      const pickup = hasCoords(donation.latitude, donation.longitude) ? [donation.latitude, donation.longitude] : null;
      const ngo = hasCoords(donation.ngo_latitude, donation.ngo_longitude) ? [donation.ngo_latitude, donation.ngo_longitude] : null;
      if (!pickup) {
        setError("This donation has no map location; use the address instead.");
        return;
      }
      // Once the food is picked up, the trip starts at the donor.
      const enRoute = ["picked_up", "in_transit"].includes(donation.status);
      const start = enRoute ? null : await currentPosition();
      if (!alive) return;

      const stops = [start, pickup, ngo].filter(Boolean);
      if (start) L.circleMarker(start, dot(DOT.start)).addTo(map).bindPopup("You are here");
      L.circleMarker(pickup, dot(DOT.pickup)).addTo(map).bindPopup(popup("Pickup", donation.location));
      if (ngo) L.circleMarker(ngo, dot(DOT.ngo)).addTo(map).bindPopup(popup(donation.ngo_name, donation.ngo_address));
      map.fitBounds(L.latLngBounds(stops), { padding: [50, 50], maxZoom: 15 });

      if (stops.length < 2) return;
      try {
        const r = await drivingRoute(stops);
        if (!alive) return;
        L.polyline(r.path, { color: "#6c4cff", weight: 5, opacity: 0.85 }).addTo(map);
        setRoute(r);
      } catch (err) {
        if (alive) setError(`${err.message}. Showing stops only.`);
      }
    })();

    return () => {
      alive = false;
      map.remove();
    };
  }, [donation]);

  const theme = user.role === "organization" ? "theme-organization" : "theme-volunteer";

  return (
    <div className={`fh-theme ${theme} route-optimization-container`}>
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page route-optimization-page">
        <div className="route-optimization-header">
          <Illustration name="hero-route" className="route-art" />
          <h2 className="fh-title">Route <em>Planner</em></h2>
          {error && <div className="route-optimization-error" role="alert">{error}</div>}
          {route && (
            <div className="route-optimization-info fh-label">
              <span><strong>Distance:</strong> {route.distanceKm} km</span>
              <span><strong>Driving time:</strong> {route.minutes} min</span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="fh-card" role="status">Loading…</p>
        ) : !donation ? (
          <p className="fh-card">
            No donation on the move.{" "}
            {user.role === "volunteer" ? <Link to="/VolunteerMap">Find a pickup</Link> : <Link to="/NgoDashboard">Claim a donation</Link>}
          </p>
        ) : (
          <>
            <div className="route-optimization-map-frame">
              <div ref={mapEl} className="route-optimization-map" />
            </div>
            <div className="route-optimization-location-info">
              <div className="route-optimization-location-card fh-card end">
                <div className="route-optimization-marker-icon end" aria-hidden="true" />
                <div><h3>Pickup · {donation.donation_tracking_id}</h3><p>{donation.location}</p></div>
              </div>
              <div className="route-optimization-location-card fh-card ngo">
                <div className="route-optimization-marker-icon ngo" aria-hidden="true" />
                <div><h3>Drop-off</h3><p>{donation.ngo_name ? `${donation.ngo_name} · ${donation.ngo_address}` : "Not claimed by an NGO yet"}</p></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RouteOptimization;
