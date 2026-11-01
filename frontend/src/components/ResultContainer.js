import React from 'react';

const ResultContainer = ({ freshnessStatus, expiryEstimate, confidenceLevel, captureAndPredict }) => {
  return (
    <div className="result-container">
      <div id="freshness-status" className="status-box">
        <h3>Freshness Status</h3>
        <div id="freshness-indicator">{freshnessStatus}</div>
      </div>
      <div id="expiry-estimate" className="status-box">
        <h3>Estimated Expiry</h3>
        <div id="expiry-indicator">{expiryEstimate}</div>
      </div>
      <div id="confidence-level" className="status-box">
        <h3>Confidence Level</h3>
        <div id="confidence-indicator">{confidenceLevel}%</div>
      </div>
      <button onClick={captureAndPredict}>Capture & Analyze</button>
    </div>
  );
};

export default ResultContainer;