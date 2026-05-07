import React, { useState } from "react";
import ScratchCard from "react-scratchcard";
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
    <div className="gift-card-container">
      <h2 className="gift-title">🎁 Scratch & Win a Surprise Gift! 🎉</h2>

      <div className="scratch-area">
        <ScratchCard {...scratchConfig}>
          <div className="gift-reward">
            {isRevealed ? (
              <span>₹500 Discount on Bulk Grocery Purchases  🎁</span>
            ) : (
              <span className="hidden-text">Scratch to reveal!</span>
            )}
          </div>
        </ScratchCard>
      </div>

      <button className="redeem-btn" onClick={() => setIsRevealed(true)}>
        Redeem
      </button>
    </div>
  );
};

export default GiftCard;
