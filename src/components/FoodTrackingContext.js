import { createContext, useState, useContext, useEffect } from "react";

const FoodTrackingContext = createContext();

export const FoodTrackingProvider = ({ children }) => {
  const [foodDonated, setFoodDonated] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [donationHistory, setDonationHistory] = useState([]);

  // ✅ Add these two lines:
  const [donationId, setDonationId] = useState(null);

  const addFoodDonation = (quantity) => {
    setFoodDonated((prev) => prev + quantity);
  };

  const incrementStep = () => {
    setCurrentStep((prev) => {
      const nextStep = Math.min(prev + 1, 6);
      if (nextStep > prev) {
        const updatedHistory = [...donationHistory, nextStep];
        setDonationHistory(updatedHistory);
        localStorage.setItem("donationHistory", JSON.stringify(updatedHistory));
      }
      return nextStep;
    });
  };

  const resetTracking = () => {
    setDonationHistory((prev) => [
      ...prev,
      { id: prev.length + 1, stepsCompleted: currentStep },
    ]);
    setCurrentStep(0);
  };

  // ✅ Optional: mimic "advanceToDonationPosted"
  const advanceToDonationPosted = () => setCurrentStep(1); // or a specific value you track as "posted"

  useEffect(() => {
    const savedHistory = localStorage.getItem("donationHistory");
    if (savedHistory) {
      setDonationHistory(JSON.parse(savedHistory));
    }
  }, []);

  return (
    <FoodTrackingContext.Provider
      value={{
        foodDonated,
        addFoodDonation,
        currentStep,
        incrementStep,
        resetTracking,
        donationHistory,

        // ✅ Add these to fix Donate.js
        donationId,
        setDonationId,
        advanceToDonationPosted,
      }}
    >
      {children}
    </FoodTrackingContext.Provider>
  );
};

export const useFoodTracking = () => useContext(FoodTrackingContext);
