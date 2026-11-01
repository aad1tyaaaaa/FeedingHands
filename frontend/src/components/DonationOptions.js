import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PersonaTheme.css';
import './DonationOptions.css';

const DonationOptions = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("DonationOptions component rendered");
    console.log("Navigate function available:", typeof navigate === 'function');
  }, [navigate]);
  
  // Navigation handlers with error handling
  const handleMoneyDonation = () => {
    try {
      console.log("Attempting to navigate to: /FundraisingPage");
      navigate("/FundraisingPage");
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation
      window.location.href = "/FundraisingPage";
    }
  };
  
  const handleFoodWasteDonation = () => {
    try {
      console.log("Attempting to navigate to: /Donate");
      navigate("/Donate");
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation
      window.location.href = "/Donate";
    }
  };
  
  const handleBiogasDonation = () => {
    try {
      console.log("Attempting to navigate to: /BiogasDonation");
      navigate("/BiogasDonation");
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation
      window.location.href = "/BiogasDonation";
    }
  };
  
  return (
    <div className="fh-theme donation-options-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="donation-options-container fh-page">
      <span className="fh-chip">Donor</span>
      <h1 className="donation-header fh-title">Choose Your <em>Donation Type</em></h1>
      <div className="options-grid">
        <div className="option-card fh-card">
          <div className="card-icon" aria-hidden="true">💰</div>
          <h2 className="card-title">Monetary Donation</h2>
          <p className="card-description">
            Support our mission with financial contributions.
          </p>
          <button className="donate-button" onClick={handleMoneyDonation}>
            Donate
          </button>
        </div>
        <div className="option-card fh-card">
          <div className="card-icon" aria-hidden="true">♻️</div>
          <h2 className="card-title">Surplus Food</h2>
          <p className="card-description">
            Donate surplus food to feed those in need.
          </p>
          <button className="donate-button" onClick={handleFoodWasteDonation}>
            Donate
          </button>
        </div>
        <div className="option-card fh-card">
          <div className="card-icon" aria-hidden="true">⚡</div>
          <h2 className="card-title">Food to Biogas</h2>
          <p className="card-description">
            Convert food waste into sustainable energy.
          </p>
          <button className="donate-button" onClick={handleBiogasDonation}>
           Donate
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DonationOptions;