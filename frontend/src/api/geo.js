import polyline from "@mapbox/polyline";

// Used when the browser won't share a location: central Mumbai, where the demo data lives.
export const FALLBACK_CENTER = [19.076, 72.8777];

export const hasCoords = (lat, lng) => typeof lat === "number" && typeof lng === "number";

// The user's position, or null if they decline or the browser can't tell within 8 s.
export function currentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

// Straight-line distance in km (haversine), for sorting pickups by nearness.
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// A driving route through the given [lat, lng] points.
// ponytail: the public OSRM demo server is rate-limited and has no SLA; self-host OSRM or use a paid router at scale.
export async function drivingRoute(points) {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`);
  if (!res.ok) throw new Error("Routing service is unavailable right now");
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No driving route found between these points");
  return {
    path: polyline.decode(route.geometry),
    distanceKm: (route.distance / 1000).toFixed(1),
    minutes: Math.round(route.duration / 60),
  };
}

// A Leaflet popup body built with textContent, so addresses and names typed by users can't inject HTML.
export function popup(title, text) {
  const el = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;
  el.append(strong);
  if (text) el.append(document.createElement("br"), document.createTextNode(text));
  return el;
}
