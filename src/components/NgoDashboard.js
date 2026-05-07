import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NgoDashboard.css";
import { useFoodTracking } from "./FoodTrackingContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { apiFetch } from "../api/client";

export default function NgoDashboard() {
  const [donations, setDonations] = useState([]);
  const { incrementStep } = useFoodTracking();
  const navigate = useNavigate();

  // Initialize chart data with correct day order (Monday first)
  const [chartData, setChartData] = useState([
    { day: "Mon", donations: 0 },
    { day: "Tue", donations: 0 },
    { day: "Wed", donations: 0 },
    { day: "Thu", donations: 0 },
    { day: "Fri", donations: 0 },
    { day: "Sat", donations: 0 },
    { day: "Sun", donations: 0 },
  ]);

  async function fetchDonations() {
    try {
      const data = await apiFetch("/api/donations");
      const list = data.donations || [];
      console.log("Fetched Donations:", data);
      setDonations(list);
      updateChartData(list);
    } catch (error) {
      console.error("Error fetching donations:", error.message);
    }
  }

  // Update chart data when donations change
  function updateChartData(donationsList) {
    // Create a map to count donations per day (0=Sunday, 1=Monday, etc.)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    
    donationsList.forEach((donation) => {
      const donationDay = new Date(donation.created_at).getDay(); // 0=Sun, 1=Mon, etc.
      dayCounts[donationDay]++;
    });

    // Reorder to show Monday first in the chart
    const reorderedData = [
      { day: "Mon", donations: dayCounts[1] },
      { day: "Tue", donations: dayCounts[2] },
      { day: "Wed", donations: dayCounts[3] },
      { day: "Thu", donations: dayCounts[4] },
      { day: "Fri", donations: dayCounts[5] },
      { day: "Sat", donations: dayCounts[6] },
      { day: "Sun", donations: dayCounts[0] },
    ];

    setChartData(reorderedData);
  }

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimNow = (donationId) => {
    incrementStep();
    navigate("/Tracking");
  };

  return (
    <div className="dashboard no-sidebar">
      <div className="main-content">
        <header>
          <h1>Dashboard Overview</h1>
          <div className="user-profile">AS</div>
        </header>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Donations Received</h3>
            <p>{donations.length} kg</p>
            <span>
              📈{" "}
              {donations.length > 0
                ? "Increased from last month"
                : "No donations yet"}
            </span>
          </div>
          <div className="stat-card">
            <Link to="/Event_prediction">
            <button>Predicted Events</button>
            </Link>
          </div>
          <div className="stat-card">
            <h3>Pending Requests</h3>
            <p>0</p>
            <span></span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="chart-container">
          <h2>Weekly Donations</h2>
          <BarChart width={600} height={300} data={chartData}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="donations" fill="#4CAF50" />
          </BarChart>
        </div>

        {/* Recent Donations Table */}
        <div className="recent-donations">
          <h2>Recent Donations</h2>
          <table>
            <thead>
              <tr>
                <th>Food Type</th>
                <th>Food Items</th>
                <th>Pickup Location</th>
                <th>Additional Notes</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {donations.length > 0 ? (
                donations.map((donation) => (
                  <tr key={donation.id}>
                    <td>{donation.type}</td>
                    <td>
                      {donation.foodDetails &&
                        JSON.parse(donation.foodDetails).map((item, index) => (
                          <div key={index}>
                            {item.name} – {item.quantity}
                          </div>
                        ))}
                    </td>
                    <td>{donation.location}</td>
                    <td>{donation.notes}</td>
                    <td>
                      {donation.created_at
                        ? new Date(donation.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => handleClaimNow(donation.id)}
                      >
                        Claim Now
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No donations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}