import React, { useState } from "react";
import ScratchCard from "react-scratchcard";
import "./PersonaTheme.css";
import "./GiftCard.css";

const GiftCard = () => {
  const [isRevealed, setIsRevealed] = useState(false);

  const scratchConfig = {
    width: 300,
    height: 150,
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSszHfvlvCeaCjaXSt7VdCtIoczA3qFtm-OfQ&s",
     // Placeholder scratch texture
    finishPercent: 50, // Reveal when 50% is scratched
    onComplete: () => setIsRevealed(true),
  };

  return (
    <div className="fh-theme gift-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="gift-card-container fh-card">
      <span className="fh-chip">Reward</span>
      <h2 className="gift-title">🎁 Scratch & Win a Surprise Gift! 🎉</h2>

      <div className="scratch-area">
        <ScratchCard {...scratchConfig}>
          <div className="gift-reward" aria-live="polite">
            {isRevealed ? (
              <span>₹500 Discount on Bulk Grocery Purchases  🎁</span>
            ) : (
              <span className="hidden-text">Scratch to reveal!</span>
            )}
          </div>
        </ScratchCard>
      </div>

      <button className="redeem-btn fh-btn" onClick={() => setIsRevealed(true)}>
        Redeem
      </button>
      </div>
    </div>
  );
};

export default GiftCard;
