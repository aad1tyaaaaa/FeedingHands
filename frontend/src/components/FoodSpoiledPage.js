import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="food-spoiled-container">
      <h1>Food Spoiled</h1>
      <p>Unfortunately, the food you donated has been marked as spoiled.</p>
      <p>You will be redirected to your Dashboard shortly...</p>
    </div>
  );
};

export default FoodSpoiledPage;