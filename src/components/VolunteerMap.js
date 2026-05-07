import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { apiFetch } from "../api/client";

// GraphHopper API key
const GRAPHHOPPER_API_KEY = "f206c0f1-17d5-4428-8123-38ba89088efb";

const VolunteerMap = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [volunteerCoords, setVolunteerCoords] = useState(null);
  const [donorCoords, setDonorCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Function to create custom icon with fallback if images aren't available
  const createCustomIcon = (iconUrl, iconColor, iconSize) => {
    // Try to use custom image, but fall back to a colored marker if not available
    try {
      return L.icon({
        iconUrl: iconUrl,
        iconSize: iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]],
        popupAnchor: [0, -iconSize[1]]
      });
    } catch (e) {
      // If image loading fails, create a colored marker using Leaflet's default
      return new L.Icon.Default({
        className: `colored-marker ${iconColor}`,
        imagePath: 'https://unpkg.com/leaflet@1.7.1/dist/images/'
      });
    }
  };

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

  // Function to fetch donor's address from backend
  const fetchDonorAddress = async () => {
    try {
      const response = await apiFetch("/api/donations");
      const latest = (response.donations || [])[0];
      if (!latest) return null;
      return {
        address: latest.location,
        latitude: latest.latitude,
        longitude: latest.longitude,
      };
    } catch (error) {
      console.error("Error fetching donor data:", error);
      return null;
    }
  };

  // Function to directly create a route between two points without using GraphHopper API
  const drawDirectRoute = (map, start, end) => {
    // Create a simple straight line between start and end (fallback if API fails)
    const routeLine = L.polyline([start, end], {
      color: 'red',
      weight: 5,
      opacity: 0.7,
      lineJoin: 'round'
    }).addTo(map);
    
    // Calculate straight-line distance (in km)
    const latlng1 = L.latLng(start[0], start[1]);
    const latlng2 = L.latLng(end[0], end[1]);
    const distanceKm = (latlng1.distanceTo(latlng2) / 1000).toFixed(2);
    
    // Set basic route info based on straight line
    setRouteInfo({
      distance: distanceKm,
      time: Math.floor(distanceKm * 2), // Rough estimate: 30 km/h average speed
    });
    
    // Fit map to show the route
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    
    return routeLine;
  };

  // Function to calculate route using GraphHopper
  const calculateRoute = async (map, start, end) => {
    // First draw a direct route as fallback
    const directRoute = drawDirectRoute(map, start, end);
    
    // Then try to get a better route from GraphHopper
    const url = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=car&details=true&points_encoded=false&instructions=true&key=${GRAPHHOPPER_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.paths && data.paths.length > 0) {
        const route = data.paths[0];
        
        // Only remove the direct route if the map still exists
        if (map && map._container && directRoute) {
          map.removeLayer(directRoute);
        }
        
        // Format the coordinates correctly for Leaflet
        const coordinates = route.points.coordinates.map((coord) => [
          coord[1], // Latitude
          coord[0]  // Longitude
        ]);
        
        // Draw the route with improved styling - only if map still exists
        if (map && map._container) {
          const routeLine = L.polyline(coordinates, {
            color: 'red',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map);
          
          // Set route information from API
          setRouteInfo({
            distance: (route.distance / 1000).toFixed(2), // Convert to km
            time: Math.floor(route.time / 60000), // Convert to minutes
          });
          
          // Fit map to show the route
          map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
          
          return routeLine;
        }
      }
      
      return directRoute; // Keep the direct route if API response is invalid
    } catch (error) {
      console.error("Error calculating route with GraphHopper:", error);
      return directRoute; // Keep the direct route if API call fails
    }
  };

  // Effect to fetch coordinates
  useEffect(() => {
    // Volunteer's location (Shah & Anchor College)
    const volunteerCoords = [19.0605, 72.8996]; 
    setVolunteerCoords(volunteerCoords);

    // Fetch donor's location from Supabase
    fetchDonorAddress().then((donorData) => {
      if (donorData) {
        const donorCoords = [donorData.latitude, donorData.longitude];
        setDonorCoords(donorCoords);
        setEndAddress(donorData.address);
      } else {
        // Fallback coordinates if Supabase fetch fails
        const fallbackDonorCoords = [19.0824, 72.9120]; // Example coordinates
        setDonorCoords(fallbackDonorCoords);
        setEndAddress("Example Destination");
      }
    });

    // Cleanup function for the entire component
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      mapInitializedRef.current = false;
    };
  }, []);

  // Effect to initialize map and display route when coordinates are ready
  useEffect(() => {
    if (!volunteerCoords || !donorCoords) return;
    
    // Only initialize the map once
    if (!mapInitializedRef.current) {
      // Make sure the map container exists
      const mapContainer = document.getElementById("map");
      if (!mapContainer) return;
      
      // Initialize the map
      const map = L.map("map", {
        center: volunteerCoords,
        zoom: 12
      });
      
      // Store the map instance in ref
      mapInstanceRef.current = map;
      mapInitializedRef.current = true;

      // Add a tile layer (Map tiles)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Create custom markers for start and end points
      // Using colored markers as fallback
      const startIcon = createCustomIcon('/images/start-marker.png', 'green', [32, 32]);
      const endIcon = createCustomIcon('/images/end-marker.png', 'red', [32, 32]);

      // Add markers for start and end points
      const startMarker = L.marker(volunteerCoords, { icon: startIcon })
        .addTo(map)
        .bindPopup(`<strong>Start Location</strong>`);
        
      const endMarker = L.marker(donorCoords, { icon: endIcon })
        .addTo(map)
        .bindPopup(`<strong>Destination</strong>`);

      // Get addresses for the markers
      reverseGeocode(volunteerCoords[0], volunteerCoords[1]).then(address => {
        setStartAddress(address);
        startMarker.setPopupContent(`<strong>Start Location</strong><br>${address}`);
      });

      reverseGeocode(donorCoords[0], donorCoords[1]).then(address => {
        setEndAddress(address);
        endMarker.setPopupContent(`<strong>Destination</strong><br>${address}`);
      });

      // Calculate and display the route
      calculateRoute(map, volunteerCoords, donorCoords);

      // Add CSS for marker colors
      const style = document.createElement('style');
      style.textContent = `
        .colored-marker.green img {
          filter: hue-rotate(90deg);
        }
        .colored-marker.red img {
          filter: hue-rotate(0deg);
        }
      `;
      document.head.appendChild(style);

      // Store reference to style element for cleanup
      mapRef.current = style;
    }
  }, [volunteerCoords, donorCoords]);

  return (
    <div className="map-container">
      <div className="map-header">
        <h2>Route Planner</h2>
        {routeInfo && (
          <div className="route-info">
            <span><strong>Distance:</strong> {routeInfo.distance} km</span>
            <span><strong>Estimated Time:</strong> {routeInfo.time} minutes</span>
          </div>
        )}
      </div>
      <div id="map" style={{ height: "80vh", width: "100%" }}></div>
      <div className="location-info">
        <div className="location-card start">
          <div className="marker-icon start"></div>
          <div>
            <h3>Start Location</h3>
            <p>{startAddress}</p>
          </div>
        </div>
        <div className="location-card end">
          <div className="marker-icon end"></div>
          <div>
            <h3>Destination</h3>
            <p>{endAddress}</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .map-container {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border-radius: 8px;
        }
        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .route-info {
          display: flex;
          gap: 20px;
        }
        .location-info {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          gap: 20px;
        }
        .location-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        .location-card.start {
          border-left: 4px solid #4CAF50;
        }
        .location-card.end {
          border-left: 4px solid #F44336;
        }
        .location-card h3 {
          margin: 0 0 5px 0;
        }
        .location-card p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        .marker-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .marker-icon.start {
          background-color: #4CAF50;
        }
        .marker-icon.end {
          background-color: #F44336;
        }
      `}</style>
    </div>
  );
};

export default VolunteerMap;