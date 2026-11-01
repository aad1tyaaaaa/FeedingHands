import { useState } from "react";
import "./PersonaTheme.css";
import "./Donate.css";

const DonateFood = () => {
  const [foodDetails, setFoodDetails] = useState("");

  const donateFood = async () => {
    if (!foodDetails) return alert("Please enter food details!");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const response = await fetch("http://localhost:5000/api/donate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, foodDetails }),
        });

        const data = await response.json();
        alert(data.message);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Location permission denied. Please enable GPS.");
      }
    );
  };

  return (
    <div className="fh-theme donatefood-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page">
        <h2 className="fh-title">Donate <em>Food</em></h2>
        <div className="fh-card donatefood-card">
          <label className="fh-label" htmlFor="donatefood-details">Food details</label>
          <textarea
            id="donatefood-details"
            placeholder="Enter food details..."
            value={foodDetails}
            onChange={(e) => setFoodDetails(e.target.value)}
          />
          <button className="fh-btn" onClick={donateFood}>Donate</button>
        </div>
      </div>
    </div>
  );
};

export default DonateFood;
