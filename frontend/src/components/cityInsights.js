import React, { useState } from "react";
import axios from "axios";
import "./PersonaTheme.css";
import "./cityInsights.css";

const CityInsights = () => {
  const [cityInsights, setCityInsights] = useState(null);
  const [pincode, setPincode] = useState(""); // For storing the user input pincode

  const fetchCityInsights = async () => {
    try {
      // Sending a request with dynamic pincode
      const response = await axios.post(
        "http://127.0.0.1:5000/analyze_city_patterns",
        {
          city: "mumbai",
          donation_data: [
            {
              donation_date: "2024-12-30",
              donation_time: "09:00",
              food_type: "rice",
              quantity_kg: 100,
              area_pincode: pincode, // Use the entered pincode
              temperature: 30,
              humidity: 70,
              is_festival: false,
              city: "mumbai",
            },
          ],
        }
      );

      setCityInsights(response.data); // Update the state with the response data
    } catch (error) {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
    }
  };

  return (
    <div className="fh-theme theme-organization city-insights">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page">
        <h1 className="fh-title">Indian Food Donation Insights</h1>

        <div className="city-insights-form fh-card">
          {/* Input field for the pincode */}
          <input
            type="text"
            placeholder="Enter Pincode"
            aria-label="Pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)} // Update pincode state
          />
          <button className="fh-btn" onClick={fetchCityInsights}>Fetch City Insights</button>
        </div>

        {/* Display the insights if available */}
        {cityInsights && <pre className="fh-card">{JSON.stringify(cityInsights, null, 2)}</pre>}
      </div>
    </div>
  );
};

export default CityInsights;
