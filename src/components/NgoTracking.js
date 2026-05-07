import React from "react";
import "./NgoTracking.css";

const NgoTracking = ({
  steps = [
    "Donation claimed",
    "Accepted by Volunteer",
    "Picked Up",
    "Volunteer On the Way",

    "Delivered ",
  ],
  currentStep = 6,
}) => {
  return (
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
  );
};

export default NgoTracking;
