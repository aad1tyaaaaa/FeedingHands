// import React, { useState } from "react";
// import ForecastChart from "./ForecastChart";
// import "./Event_prediction.css";

// function Event_prediction() {
//   const [eventType, setEventType] = useState("Weddings");

//   return (
//     <div className="app-container">
//       <h1>Ghatkopar event forecast</h1>

//       <select
//         className="event-dropdown"
//         onChange={(e) => setEventType(e.target.value)}
//         value={eventType}
//       >
//         <option value="Weddings">Weddings</option>
//         <option value="Birthday Parties">Birthday Parties</option>
//         <option value="Social Gatherings">Social Gatherings</option>
//         <option value="Corporate Events">Corporate Events</option>
//         <option value="Festivals">Festivals</option>
//       </select>

//       <ForecastChart eventType={eventType} />

//       <div className="footer">
//         <p>Based on AI predictions for Ghatkopar area events in 2025</p>
//       </div>
//     </div>
//   );
// }

// export default Event_prediction;






import React, { useState } from "react";
import ForecastChart from "./ForecastChart";
import "./PersonaTheme.css";
import "./Event_prediction.css";

function Event_prediction() {
  const [eventType, setEventType] = useState("Weddings");

  return (
    <div className="fh-theme theme-organization event-prediction">
      <div className="fh-blob" aria-hidden="true" />
      <div className="app-container fh-page">
        <h1 className="fh-title">Ghatkopar event forecast</h1>

        <select
          className="event-dropdown"
          aria-label="Event type"
          onChange={(e) => setEventType(e.target.value)}
          value={eventType}
        >
          <option value="Weddings">Weddings</option>
          <option value="Birthday Parties">Birthday Parties</option>
          <option value="Social Gatherings">Social Gatherings</option>
          <option value="Corporate Events">Corporate Events</option>
          <option value="Festivals">Festivals</option>
        </select>

        <ForecastChart eventType={eventType} />

        <div className="footer">
          <p className="fh-label">Based on AI predictions for Ghatkopar area events in 2025</p>
        </div>
      </div>
    </div>
  );
}

export default Event_prediction;
