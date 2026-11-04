import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "../api/client";
import { FALLBACK_CENTER, currentPosition, distanceKm, hasCoords, popup } from "../api/geo";
import { foodSummary } from "./DonationTimeline";
import "./PersonaTheme.css";
import "./VolunteerMap.css";
import Illustration from "./Illustration";

const dot = (color) => ({ radius: 9, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 });

// Every open pickup (and partner NGO) on one map, nearest first.
const VolunteerMap = () => {
  const mapEl = useRef(null);
  const [me, setMe] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const map = L.map(mapEl.current, { center: FALLBACK_CENTER, zoom: 12 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    let alive = true;
    (async () => {
      try {
        const [position, open, ngos] = await Promise.all([
          currentPosition(),
          apiFetch("/api/donations?status=available,requested"),
          apiFetch("/api/organizations"),
        ]);
        if (!alive) return;
        const here = position || FALLBACK_CENTER;
        setMe(position);
        if (position) L.circleMarker(position, dot("#12b76a")).addTo(map).bindPopup("You are here");

        for (const o of ngos.organizations || []) {
          if (hasCoords(o.latitude, o.longitude)) {
            L.circleMarker([o.latitude, o.longitude], dot("#6c4cff")).addTo(map).bindPopup(popup(o.name, o.address));
          }
        }
        const located = (open.donations || [])
          .filter((d) => hasCoords(d.latitude, d.longitude))
          .map((d) => ({ ...d, km: distanceKm(here, [d.latitude, d.longitude]) }))
          .sort((a, b) => a.km - b.km);
        for (const d of located) {
          L.circleMarker([d.latitude, d.longitude], dot("#ff6b2c")).addTo(map)
            .bindPopup(popup(`${d.type} · ${d.donation_tracking_id}`, `${foodSummary(d.foodDetails)} — ${d.location}`));
        }
        setPickups(located);
        const points = [here, ...located.map((d) => [d.latitude, d.longitude])];
        if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();

    return () => {
      alive = false;
      map.remove();
    };
  }, []);

  return (
    <div className="fh-theme theme-volunteer volunteer-map">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page map-container">
        <div className="map-header">
          <Illustration name="map-route" className="route-art" />
          <h2 className="fh-title">Pickup <em>Map</em></h2>
          <div className="route-info fh-label">
            <span><strong>{pickups.length}</strong> open pickups</span>
            <span>{me ? "Sorted by distance from you" : "Allow location access to sort by distance"}</span>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="map-frame">
          <div ref={mapEl} style={{ height: "60vh", width: "100%" }} />
        </div>
        <div className="location-info">
          {pickups.slice(0, 6).map((d) => (
            <div key={d.id} className="location-card fh-card end">
              <div className="marker-icon end" aria-hidden="true" />
              <div>
                <h3>{d.type} · {d.km.toFixed(1)} km</h3>
                <p>{d.location}</p>
                <p><Link to={`/Route_Optimization?id=${d.id}`}>Route</Link> · <Link to="/VolunteerDashboard">Pick up from dashboard</Link></p>
              </div>
            </div>
          ))}
          {!pickups.length && !error && <p className="fh-card">No open pickups with a map location right now.</p>}
        </div>
      </div>
    </div>
  );
};

export default VolunteerMap;
