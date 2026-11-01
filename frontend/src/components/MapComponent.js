import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function MapComponent({ onLocationChange }) {
  const [position, setPosition] = useState([51.505, -0.09]); // Default coordinates (e.g., London)

  // Update the position and notify parent component
  const handleClick = (e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);
    onLocationChange(lat, lng); // Pass the new position to the parent component
  };

  return (
    <div className="map-container" style={{ height: "400px", width: "100%" }}>
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          map.on("click", handleClick); // Click event to change marker position
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position}>
          <Popup>
            You are here <br /> Latitude: {position[0]} <br /> Longitude:{" "}
            {position[1]}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapComponent;
