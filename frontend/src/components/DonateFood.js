import { useState } from "react";

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
    <div>
      <h2>Donate Food</h2>
      <textarea
        placeholder="Enter food details..."
        value={foodDetails}
        onChange={(e) => setFoodDetails(e.target.value)}
      />
      <button onClick={donateFood}>Donate</button>
    </div>
  );
};

export default DonateFood;
