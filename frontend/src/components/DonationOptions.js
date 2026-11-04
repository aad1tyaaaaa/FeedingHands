import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PersonaTheme.css';
import './DonationOptions.css';
import Illustration from "./Illustration";

const DonationOptions = () => {
  const navigate = useNavigate();

  const handleMoneyDonation = () => navigate("/FundraisingPage");
  
  const handleFoodWasteDonation = () => navigate("/Donate");
  
  const handleBiogasDonation = () => navigate("/BiogasDonation");
  
  return (
    <div className="fh-theme donation-options-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="donation-options-container fh-page">
      <span className="fh-chip">Donor</span>
      <h1 className="donation-header fh-title">Choose Your <em>Donation Type</em></h1>
      <div className="options-grid">
        <div className="option-card fh-card">
          <Illustration name="coin-heart-hand" className="option-art" />
          <h2 className="card-title">Monetary Donation</h2>
          <p className="card-description">
            Support our mission with financial contributions.
          </p>
          <button className="donate-button" onClick={handleMoneyDonation}>
            Donate
          </button>
        </div>
        <div className="option-card fh-card">
          <Illustration name="donation-box" className="option-art" />
          <h2 className="card-title">Surplus Food</h2>
          <p className="card-description">
            Donate surplus food to feed those in need.
          </p>
          <button className="donate-button" onClick={handleFoodWasteDonation}>
            Donate
          </button>
        </div>
        <div className="option-card fh-card">
          <Illustration name="waste-to-energy" className="option-art" />
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