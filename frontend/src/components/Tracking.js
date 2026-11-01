import React, { useEffect } from "react";
import "./PersonaTheme.css";
import "./Tracking.css";
import { useFoodTracking } from "./FoodTrackingContext";
import { Link } from "react-router-dom";

const Tracking = () => {
  const { currentStep, setDonationHistory, donationHistory } =
    useFoodTracking();

  const steps = [
    "Donation Posted",
    "Claimed by NGO",
    "Volunteer On the Way",
    "Picked Up",
    "Delivered to NGO",
    "Donation Successful",
  ];

  // Update donation history when tracker moves forward
  useEffect(() => {
    if (currentStep > 0) {
      const updatedHistory = [...donationHistory];

      // Ensure history updates only when moving forward
      if (!updatedHistory.includes(currentStep)) {
        updatedHistory.push(currentStep);
        setDonationHistory(updatedHistory);
        localStorage.setItem("donationHistory", JSON.stringify(updatedHistory));
      }
    }
  }, [currentStep, donationHistory, setDonationHistory]);

  return (
    <div className="fh-theme donor-tracking">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page tracking-page">
      <div className="tracking-header">
        <h2 className="fh-title">Donation Tracking</h2>
        <p>Track the status of your food donation</p>
      </div>

      {/* Current Donation Progress */}
      <div className="current-tracking fh-card">
        <h3 className="fh-label">Current Donation Status</h3>
        <div className="tracker">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={index} className="tracker-step">
                <div
                  className={`step-circle ${isCompleted ? "completed" : ""} ${
                    isCurrent ? "current" : ""
                  }`}
                >
                  {index + 1}
                </div>
                <div className="step-label">{step}</div>
                {index < steps.length - 1 && (
                  <div
                    className={`step-line ${isCompleted ? "completed" : ""}`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Donation History */}

      {/* Navigation Links */}
      <div className="tracking-footer">
        <div className="navigation-links">
          <Link to="/Donate" className="action-button fh-btn">
            New Donation
          </Link>
          <Link to="/NgoDashboard" className="action-button fh-btn">
            NGO Dashboard
          </Link>
          <Link to="/VolunteerDashboard" className="action-button fh-btn">
            Volunteer Dashboard
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Tracking;
