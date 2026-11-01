import React, { useState } from "react";
import { useDonation } from "./DonationContext";
import "./Donate.css";
import { useFoodTracking } from "./FoodTrackingContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

function Donate({ onDonationSuccess }) {
  const { addDonation } = useDonation();
  const navigate = useNavigate();
  const { setDonationId, advanceToDonationPosted } = useFoodTracking();

  const [formState, setFormState] = useState({
    type: "Vegetarian",
    location: "",
    notes: "",
    contact: "",
    foodDetails: [{ name: "", quantity: "" }],
    latitude: null,
    longitude: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleFoodChange = (index, event) => {
    const updatedFoodDetails = formState.foodDetails.map((item, i) => 
      i === index ? { ...item, [event.target.name]: event.target.value } : item
    );
    setFormState(prev => ({ ...prev, foodDetails: updatedFoodDetails }));
  };

  const handleAddFood = () => {
    setFormState(prev => ({
      ...prev,
      foodDetails: [...prev.foodDetails, { name: "", quantity: "" }]
    }));
  };

  const handleRemoveFood = (index) => {
    setFormState(prev => ({
      ...prev,
      foodDetails: prev.foodDetails.filter((_, i) => i !== index)
    }));
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding using OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'FoodDonationApp/1.0 (your-contact@email.com)'
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch address');
      
      const data = await response.json();
      const address = data.display_name || 'Location found but address unavailable';
      
      setFormState(prev => ({
        ...prev,
        location: address,
        latitude: latitude,
        longitude: longitude
      }));
    } catch (err) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formState.location.trim()) {
        throw new Error("Pickup location is required");
      }
      if (formState.foodDetails.some(item => 
        !item.name.trim() || !item.quantity.trim()
      )) {
        throw new Error("All food items must have name and quantity");
      }

      const fullTimestampId = Date.now();
      
      // const { data: { user } } = await supabase.auth.getUser();
      // if (!user) throw new Error("User not authenticated");

      // Get coordinates - either from state or by geocoding the address
      let latitude = formState.latitude;
      let longitude = formState.longitude;

      // If coordinates are not available, try to geocode the manually entered address
      if (!latitude || !longitude) {
        try {
          console.log("Geocoding address:", formState.location);
          const encodedAddress = encodeURIComponent(formState.location);
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
            {
              headers: {
                'User-Agent': 'FoodDonationApp/1.0 (your-contact@email.com)'
              }
            }
          );
          
          if (!geocodeResponse.ok) throw new Error('Failed to geocode address');
          
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData && geocodeData.length > 0) {
            latitude = parseFloat(geocodeData[0].lat);
            longitude = parseFloat(geocodeData[0].lon);
            console.log("Geocoded coordinates:", latitude, longitude);
          } else {
            console.warn("No geocoding results found for address:", formState.location);
          }
        } catch (geocodeErr) {
          console.warn('Geocoding failed:', geocodeErr);
          // Continue without coordinates rather than failing the donation
        }
      }

      // Convert latitude and longitude to numbers to ensure proper data type
      const finalLatitude = latitude !== null && latitude !== undefined ? Number(latitude) : null;
      const finalLongitude = longitude !== null && longitude !== undefined ? Number(longitude) : null;

      const donationData = {
        // user_id: user.id,
        type: formState.type,
        location: formState.location,
        latitude: finalLatitude,
        longitude: finalLongitude,
        contact: formState.contact,
        notes: formState.notes,
        foodDetails: JSON.stringify(formState.foodDetails),
        donation_tracking_id: fullTimestampId.toString(),
        puniya_points: 0,
        status2: "Donation Posted",
        created_at: new Date().toISOString()
      };

      const insertedData = await apiFetch("/api/donations", {
        method: "POST",
        body: JSON.stringify(donationData),
      });

      setDonationId(fullTimestampId);
      localStorage.setItem("currentDonationId", fullTimestampId.toString());

      const totalQuantity = formState.foodDetails.reduce(
        (sum, item) => sum + (parseInt(item.quantity) || 0), 0
      );
      addDonation(totalQuantity);

      setFormState({
        type: "Vegetarian",
        location: "",
        notes: "",
        contact: "",
        foodDetails: [{ name: "", quantity: "" }],
        latitude: null,
        longitude: null
      });

      alert(`Donation submitted! ID: ${fullTimestampId}`);
      navigate("/Tracking");

    } catch (err) {
      console.error("Donation error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-food-page">
      <div className="donheader">
        <h1>Donate Food</h1>
        <p>Share Your Kindness with Those in Need</p>
      </div>

      <div className="main-section">
        <div className="donation-form">
          <h3>Food Donation Form</h3>

          <div className="form-group">
            <label>Type of Food</label>
            <select 
              value={formState.type} 
              onChange={(e) => setFormState(prev => ({
                ...prev,
                type: e.target.value
              }))}
            >
              <option value="Vegetarian">Vegetarian</option>
              <option value="Non-Vegetarian">Non-Vegetarian</option>
              <option value="Packaged Food">Packaged Food</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Food Items</label>
            {formState.foodDetails.map((food, index) => (
              <div key={index} className="food-input">
                <input
                  type="text"
                  name="name"
                  placeholder="Food name"
                  value={food.name}
                  onChange={(e) => handleFoodChange(index, e)}
                />
                <input
                  type="text"
                  name="quantity"
                  placeholder="Quantity (portions)"
                  value={food.quantity}
                  onChange={(e) => handleFoodChange(index, e)}
                />
                {formState.foodDetails.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveFood(index)}
                    aria-label="Remove food item"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={handleAddFood}
              className="add-food-button"
            >
              + Add More Items
            </button>
          </div>

          <div className="form-group">
            <label>Pickup Location</label>
            <div className="location-input-group">
              <input
                type="text"
                placeholder="Enter your full address"
                value={formState.location}
                onChange={(e) => setFormState(prev => ({
                  ...prev,
                  location: e.target.value
                }))}
              />
              <button
                type="button"
                onClick={handleLocateMe}
                className="locate-me-button"
                disabled={isLocating}
              >
                {isLocating ? (
                  <>
                    <span className="spinner small"></span>
                    Locating...
                  </>
                ) : (
                  '📍 Locate Me'
                )}
              </button>
            </div>
            {formState.latitude && formState.longitude && (
              <div className="coordinates-display">
                <small style={{color: 'green'}}>✓ Coordinates captured: {formState.latitude.toFixed(6)}, {formState.longitude.toFixed(6)}</small>
              </div>
            )}
            <div className="location-help-text">
              <small style={{color: '#666'}}>
                💡 For best results, use the "Locate Me" button or enter a complete address with city and area details.
              </small>
            </div>
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="tel"
              placeholder="Enter your contact number"
              value={formState.contact}
              onChange={(e) => setFormState(prev => ({
                ...prev,
                contact: e.target.value
              }))}
            />
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea
              placeholder="Special instructions, dietary restrictions, etc."
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              rows="4"
            />
          </div>

          <button 
            className="submit-button" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              "Submit Donation"
            )}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      <div className="footer">
        <p>Contact Us: 1-800-FOOD-HELP</p>
        <p>© 2024 Food Donation Platform. All rights reserved.</p>
      </div>
    </div>
  );
}

export default Donate;