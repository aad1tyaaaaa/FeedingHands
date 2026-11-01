import React from "react";
import "./FoodHeroes.css";

const FoodHeroes = () => {
  // Base64 Image (Example: A hotel image)
  const base64Image = "https://images.wsj.net/im-65599456?size=1.5"; // Replace with your actual Base64 image

  return (
    <div className="food-heroes-container">
      <header className="food-heroes-header">
        <h1>🌟 Featured Donor: Grand Royale Hotel 🌟</h1>
        <p>Making a difference, one meal at a time.</p>
      </header>

      <section className="food-heroes-section">
        <img src={base64Image} alt="Grand Royale Hotel" className="food-heroes-image" />
        <div className="food-heroes-text">
          <h2>Helping the Community with Every Meal 🍽️</h2>
          <p>
            Grand Royale Hotel has donated over <strong>500+ meals</strong> 
            every month, ensuring that no food goes to waste. We proudly support
            the local community and stand by our mission to reduce hunger.
          </p>
          <a href="#" className="food-heroes-btn">
            Join the Movement
          </a>
        </div>
      </section>

      <section className="food-heroes-contact">
        <h2>📍 Visit Us</h2>
        <p><strong>Grand Royale Hotel</strong></p>
        <p>123 Main Street, Cityville, ST 45678</p>
        <p>📞 Phone: +1 (234) 567-8900</p>
        <p>📧 Email: contact@grandroyale.com</p>
      </section>

      <footer className="food-heroes-footer">
        <p>
          Want to become a featured donor? <a href="#">Contact Us</a>
        </p>
      </footer>
    </div>
  );
};

export default FoodHeroes;
