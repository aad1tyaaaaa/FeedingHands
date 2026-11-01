import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./FoodSpoiledPage.css"; // Add styles if needed

const FoodSpoiledPage = () => {
  const navigate = useNavigate();

  // Automatically redirect to the NGO page after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/Dashboard"); // Replace with your NGO page route
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer); // Cleanup timer
  }, [navigate]);

  return (
    <div className="fh-theme food-spoiled">
      <div className="fh-blob" aria-hidden="true" />
      <div className="food-spoiled-container fh-card" role="status">
        <span className="food-spoiled-icon" aria-hidden="true">!</span>
        <h1 className="fh-title">Food <em>Spoiled</em></h1>
        <p>Unfortunately, the food you donated has been marked as spoiled.</p>
        <p className="fh-label">You will be redirected to your Dashboard shortly...</p>
        <div className="food-spoiled-timer" aria-hidden="true" />
      </div>
    </div>
  );
};

export default FoodSpoiledPage;