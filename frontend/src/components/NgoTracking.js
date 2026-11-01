import React from "react";
import "./PersonaTheme.css";
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
    <div className="fh-theme theme-organization ngo-tracking">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page">
        <div className="tracker fh-card">
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
    </div>
  );
};

export default NgoTracking;
