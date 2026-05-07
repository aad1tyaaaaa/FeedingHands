// import React, { useState } from "react";
// import ForecastChart from "./ForecastChart";
// import "./Event_prediction.css";

// function Event_prediction() {
//   const [eventType, setEventType] = useState("Weddings");

//   return (
//     <div className="app-container">
//       <h1>📊 Ghatkopar Event Forecast</h1>

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
import "./Event_prediction.css";

function Event_prediction() {
  const [eventType, setEventType] = useState("Weddings");

  return (
    <div className="app-container">
      <h1>📊 Ghatkopar Event Forecast</h1>

      <select
        className="event-dropdown"
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
        <p>Based on AI predictions for Ghatkopar area events in 2025</p>
      </div>
    </div>
  );
}

export default Event_prediction;
