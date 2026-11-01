import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Route.css"; // Updated CSS file
import polyline from "@mapbox/polyline"; // For decoding polyline
import { apiFetch } from "../api/client";

// Custom icons for start, destination, and NGO
const startIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowSize: [41, 41], // Size of the shadow
});

const endIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowSize: [41, 41], // Size of the shadow
});

const ngoIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowSize: [41, 41], // Size of the shadow
});

const RouteOptimization = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [ngoAddress, setNgoAddress] = useState("");
  const [volunteerCoords, setVolunteerCoords] = useState(null); // User's current location
  const [donorCoords, setDonorCoords] = useState(null); // Destination coordinates
  const [ngoCoords, setNgoCoords] = useState(null); // NGO coordinates
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState(null); // For error handling

  // Function to reverse geocode coordinates into addresses
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || "Address not found";
    } catch (error) {
      console.error("Error with reverse geocoding:", error);
      return "Address lookup failed";
    }
  };

  const fetchDonorAddress = async () => {
    try {
      const response = await apiFetch("/api/donations");
      const data = response.donations || [];
      if (!data || data.length === 0) {
        throw new Error("No donor data found in the database.");
      }

      console.log("Donor data fetched:", data[0]);
      return data[0];
    } catch (error) {
      console.error("Error fetching donor data:", error);
      setError("Failed to fetch donor data: " + error.message);
      return null;
    }
  };

  const fetchNgoAddress = async () => {
    try {
      const response = await apiFetch("/api/organizations");
      const data = response.organizations || [];
      if (!data || data.length === 0) {
        throw new Error("No NGO data found in the database.");
      }

      console.log("NGO data fetched:", data[0]);
      return data[0];
    } catch (error) {
      console.error("Error fetching NGO data:", error);
      setError("Present at same locations " );
      return null;
    }
  };

  // Function to calculate route using OSRM
  const calculateRoute = async (map, start, end) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=polyline`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log("OSRM API Response:", data);

      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        // Decode the polyline to get coordinates
        const coordinates = polyline.decode(route.geometry);

        // Format coordinates for Leaflet
        const latLngCoordinates = coordinates.map((coord) => [
          coord[0],
          coord[1],
        ]);

        // Draw the route on the map
        const routeLine = L.polyline(latLngCoordinates, {
          color: "blue",
          weight: 5,
          opacity: 0.9,
          lineJoin: "round",
        }).addTo(map);

        // Set route information
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(2), // Convert to km
          time: Math.floor(route.duration / 60), // Convert to minutes
        });

        // Fit map to show the route
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

        return routeLine;
      } else {
        console.error("No route found in OSRM response");
        setError("Could not calculate a route. Please try again.");
      }
    } catch (error) {
      console.error("Error calculating route with OSRM:", error);
      setError("");
    }
  };

  // Effect to fetch user's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Volunteer coordinates:", latitude, longitude);
          setVolunteerCoords([latitude, longitude]);
        },
        (error) => {
          console.error("Error fetching user's location:", error);
          setError("Failed to fetch your location. Please enable geolocation.");
          setVolunteerCoords([19.0605, 72.8996]); // Fallback to default coordinates
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setError("Geolocation is not supported by your browser.");
      setVolunteerCoords([19.0605, 72.8996]); // Fallback to default coordinates
    }
  }, []);

  // Effect to fetch donor's location
  useEffect(() => {
    fetchDonorAddress().then((donorData) => {
      if (donorData && donorData.latitude && donorData.longitude) {
        console.log(
          "Setting donor coordinates:",
          donorData.latitude,
          donorData.longitude
        );
        setDonorCoords([donorData.latitude, donorData.longitude]);
      } else {
        console.error("Invalid donor data:", donorData);
        setError(
          "No valid donor coordinates found. Please check your database."
        );
      }
    });
  }, []);

  // Effect to fetch NGO's location
  useEffect(() => {
    fetchNgoAddress().then((ngoData) => {
      if (ngoData && ngoData.latitude && ngoData.longitude) {
        console.log(
          "Setting NGO coordinates:",
          ngoData.latitude,
          ngoData.longitude
        );
        setNgoCoords([ngoData.latitude, ngoData.longitude]);
      } else {
        console.error("Invalid NGO data:", ngoData);
        setError("No valid NGO coordinates found. Please check your database.");
      }
    });
  }, []);

  // Effect to initialize map and display route
  useEffect(() => {
    if (!volunteerCoords || !donorCoords || !ngoCoords) {
      console.log("Waiting for coordinates...");
      return;
    }

    console.log(
      "Initializing map with:",
      volunteerCoords,
      donorCoords,
      ngoCoords
    );

    // Initialize the map
    const map = L.map("map", {
      center: volunteerCoords,
      zoom: 12,
    });

    // Add a tile layer (Map tiles)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add markers for start, end, and NGO points with custom icons
    const startMarker = L.marker(volunteerCoords, { icon: startIcon })
      .addTo(map)
      .bindPopup("Start Location");

    const endMarker = L.marker(donorCoords, { icon: endIcon })
      .addTo(map)
      .bindPopup("Destination");

    const ngoMarker = L.marker(ngoCoords, { icon: ngoIcon })
      .addTo(map)
      .bindPopup("NGO Location");

    // Get addresses for the markers
    reverseGeocode(volunteerCoords[0], volunteerCoords[1]).then((address) => {
      setStartAddress(address);
      startMarker.setPopupContent(
        `<strong>Start Location</strong><br>${address}`
      );
    });

    reverseGeocode(donorCoords[0], donorCoords[1]).then((address) => {
      setEndAddress(address);
      endMarker.setPopupContent(`<strong>Destination</strong><br>${address}`);
    });

    reverseGeocode(ngoCoords[0], ngoCoords[1]).then((address) => {
      setNgoAddress(address);
      ngoMarker.setPopupContent(`<strong>NGO Location</strong><br>${address}`);
    });

    // Calculate and display the route
    calculateRoute(map, volunteerCoords, donorCoords);

    // Store the map instance in ref
    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [volunteerCoords, donorCoords, ngoCoords]);

  return (
    <div className="route-optimization-container">
      <div className="route-optimization-header">
        <h2>Route Planner</h2>
        {error && <div className="route-optimization-error">{error}</div>}
        {routeInfo && (
          <div className="route-optimization-info">
            <span>
              <strong>Distance:</strong> {routeInfo.distance} km
            </span>
            <span>
              <strong>Estimated Time:</strong> {routeInfo.time} minutes
            </span>
          </div>
        )}
      </div>
      <div id="map" className="route-optimization-map"></div>
      <div className="route-optimization-location-info">
        <div className="route-optimization-location-card start">
          <div className="route-optimization-marker-icon start"></div>
          <div>
            <h3>Start Location</h3>
            <p>{startAddress || "Loading..."}</p>
          </div>
        </div>
        <div className="route-optimization-location-card end">
          <div className="route-optimization-marker-icon end"></div>
          <div>
            <h3>Destination</h3>
            <p>{endAddress || "Loading..."}</p>
          </div>
        </div>
        <div className="route-optimization-location-card ngo">
          <div className="route-optimization-marker-icon ngo"></div>
          <div>
            <h3>NGO Location</h3>
            <p>{ngoAddress || "Loading..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimization;