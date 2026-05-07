// import React, { useState, useEffect } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   Legend,
//   ResponsiveContainer,
// } from "recharts";
// import axios from "axios";

// const ForecastChart = ({ eventType }) => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [hoveredMonth, setHoveredMonth] = useState(null);
//   const [hoveredData, setHoveredData] = useState(null);

//   const months = [
//     "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
//   ];

//   const averageAttendees = {
//     Weddings: 150,
//     "Birthday Parties": 25,
//     "Social Gatherings": 80,
//     "Corporate Events": 60,
//     Festivals: 200,
//   };

//   const foodServedPerPerson = 0.5; // 500g (in kg)
//   const wastageRate = 0.15; // 15% food is wasted

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       let results = [];

//       for (let i = 1; i <= 12; i++) {
//         try {
//           const res = await axios.get(
//             `https://monthlyeventprediction.onrender.com/predict?event=${eventType}&year=2025&month=${i}`
//           );
//           results.push({ month: i, count: res.data.prediction });
//         } catch (error) {
//           console.error(`Error fetching ${eventType} data for ${months[i - 1]}:`, error);
//           results.push({ month: i, count: Math.floor(Math.random() * 10) + 5 });
//         }
//       }
//       setData(results);
//       setLoading(false);
//     };

//     fetchData();
//   }, [eventType]);

//   const calculateFoodEstimate = (events) => {
//     const avgAttendees = averageAttendees[eventType] || 50;
//     const totalFoodServed = events * avgAttendees * foodServedPerPerson;
//     const totalFoodWasted = totalFoodServed * wastageRate;

//     return {
//       daily: (totalFoodWasted / 30).toFixed(2),
//       weekly: (totalFoodWasted / 4).toFixed(2),
//       monthly: totalFoodWasted.toFixed(2),
//       peopleFedDaily: Math.round(totalFoodWasted / 0.5 / 30),
//     };
//   };

//   return (
//     <div className="fade-in">
//       <div className="chart-container">
//         <h2>📊 {eventType} Forecast</h2>

//         {loading ? (
//           <div className="loading">Loading forecast data...</div>
//         ) : (
//           <ResponsiveContainer width="100%" height={400}>
//             <LineChart data={data} onMouseLeave={() => setHoveredMonth(null)}>
//               <XAxis
//                 dataKey="month"
//                 tickFormatter={(month) => months[month - 1]}
//                 tick={{ angle: -25, textAnchor: "end", fontSize: 12 }}
//               />
//               <YAxis />
//               <Tooltip
//                 formatter={(value) => {
//                   const foodEstimates = calculateFoodEstimate(value);
//                   return [
//                     `${value} events\n${foodEstimates.monthly} kg wasted\nFeeds ~${foodEstimates.peopleFedDaily} people/day`,
//                     "Event Count",
//                   ];
//                 }}
//                 labelFormatter={(label) => months[label - 1]}
//                 cursor={{ stroke: "red", strokeWidth: 2 }}
//               />
//               <Legend />
//               <CartesianGrid stroke="#ddd" strokeDasharray="5 5" />
//               <Line
//                 type="monotone"
//                 dataKey="count"
//                 stroke="#6366f1"
//                 strokeWidth={3}
//                 activeDot={{ r: 8, onMouseEnter: (e) => {
//                   setHoveredMonth(months[e.month - 1]);
//                   setHoveredData(calculateFoodEstimate(e.count));
//                 } }}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
//       </div>

//       {hoveredMonth && hoveredData && (
//         <div className="stats-container">
//           <h3>📅 {hoveredMonth} Estimates</h3>
//           <div className="stat-card"><div className="stat-title">Daily Food Waste</div><div className="stat-value">{hoveredData.daily} kg</div></div>
//           <div className="stat-card"><div className="stat-title">Weekly Food Waste</div><div className="stat-value">{hoveredData.weekly} kg</div></div>
//           <div className="stat-card"><div className="stat-title">Monthly Food Waste</div><div className="stat-value">{hoveredData.monthly} kg</div></div>
//           <div className="stat-card"><div className="stat-title">People Fed Daily</div><div className="stat-value">{hoveredData.peopleFedDaily}</div></div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ForecastChart;



import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const ForecastChart = ({ eventType }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];

  const averageAttendees = {
    Weddings: 150,
    "Birthday Parties": 25,
    "Social Gatherings": 80,
    "Corporate Events": 60,
    Festivals: 200,
  };

  const foodServedPerPerson = 0.5; // 500g (in kg)
  const wastageRate = 0.15; // 15% food is wasted

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let results = [];

      for (let i = 1; i <= 12; i++) {
        try {
          const res = await axios.get(
            `https://monthlyeventprediction.onrender.com/predict?event=${eventType}&year=2025&month=${i}`
          );
          results.push({ month: i, count: res.data.prediction });
        } catch (error) {
          console.error(`Error fetching ${eventType} data for ${months[i - 1]}:`, error);
          results.push({ month: i, count: Math.floor(Math.random() * 10) + 5 });
        }
      }
      setData(results);
      setLoading(false);
    };

    fetchData();
  }, [eventType]);

  const calculateFoodEstimate = (events) => {
    const avgAttendees = averageAttendees[eventType] || 50;
    const totalFoodServed = events * avgAttendees * foodServedPerPerson;
    const totalFoodWasted = totalFoodServed * wastageRate;

    return {
      daily: (totalFoodWasted / 30).toFixed(2),
      weekly: (totalFoodWasted / 4).toFixed(2),
      monthly: totalFoodWasted.toFixed(2),
      peopleFedDaily: Math.round(totalFoodWasted / 0.5 / 30),
    };
  };

  return (
    <div className="fade-in">
      <div className="chart-container">
        <h2>📊 {eventType} Forecast</h2>

        {loading ? (
          <div className="loading">Loading forecast data...</div>
        ) : (
            <ResponsiveContainer width="150%" height={400}>
            <LineChart
              data={data}
              onMouseLeave={() => setHoveredMonth(null)}
              margin={{ left: 60, right: 20 }} // Add margin to prevent clipping
            >
              <XAxis
                dataKey="month"
                tickFormatter={(month) => months[month - 1]}
                tick={{ angle: -25, textAnchor: "end", fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => {
                  const foodEstimates = calculateFoodEstimate(value);
                  return [
                    `${value} events\n${foodEstimates.monthly} kg wasted\nFeeds ~${foodEstimates.peopleFedDaily} people/day`,
                    "Event Count",
                  ];
                }}
                labelFormatter={(label) => months[label - 1]}
                cursor={{ stroke: "red", strokeWidth: 2 }}
              />
              <Legend />
              <CartesianGrid stroke="#ddd" strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={3}
                activeDot={{
                  r: 8,
                  onMouseEnter: (e) => {
                    setHoveredMonth(months[e.month - 1]);
                    setHoveredData(calculateFoodEstimate(e.count));
                  },
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {hoveredMonth && hoveredData && (
        <div className="stats-container">
          <h3>📅 {hoveredMonth} Estimates</h3>
          <div className="stat-card"><div className="stat-title">Daily Food Waste</div><div className="stat-value">{hoveredData.daily} kg</div></div>
          <div className="stat-card"><div className="stat-title">Weekly Food Waste</div><div className="stat-value">{hoveredData.weekly} kg</div></div>
          <div className="stat-card"><div className="stat-title">Monthly Food Waste</div><div className="stat-value">{hoveredData.monthly} kg</div></div>
          <div className="stat-card"><div className="stat-title">People Fed Daily</div><div className="stat-value">{hoveredData.peopleFedDaily}</div></div>
        </div>
      )}
    </div>
  );
};

export default ForecastChart;