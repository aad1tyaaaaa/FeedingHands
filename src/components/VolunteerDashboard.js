// // VolunteerDashboard.js
// import React, { useState } from "react";
// import { MapPin, Package } from "lucide-react";
// import "./VolunteerDashboard.css";

// const initialDonations = [
//   {
//     id: 1,
//     donor: "John Doe",
//     location: "123 Main St",
//     status: "pending",
//     items: "Rice, Vegetables",
//     quantity: "5kg",
//   },
//   {
//     id: 2,
//     donor: "Jane Smith",
//     location: "456 Oak Ave",
//     status: "pending",
//     items: "Canned Foods",
//     quantity: "3kg",
//   },
//   {
//     id: 3,
//     donor: "Mike Johnson",
//     location: "789 Pine Rd",
//     status: "pending",
//     items: "Bread, Fruits",
//     quantity: "4kg",
//   },
// ];

// const VolunteerDashboard = () => {
//   const [donations, setDonations] = useState(initialDonations);

//   const handlePickup = (id) => {
//     setDonations(
//       donations.map((donation) =>
//         donation.id === id ? { ...donation, status: "picked_up" } : donation
//       )
//     );
//   };

//   const pendingDonations = donations.filter((d) => d.status === "pending");

//   return (
//     <div className="volunteer-dashboard">
//       <div className="dashboard-container">
//         <div className="dashboard-card">
//           <div className="dashboard-header">
//             <h2 className="dashboard-title">Volunteer Dashboard</h2>
//           </div>

//           <div className="stats-grid">
//             <div className="stat-card">
//               <div className="stat-content">
//                 <Package className="stat-icon" />
//                 <div>
//                   <p className="stat-label">Pending Pickups</p>
//                   <p className="stat-value">{pendingDonations.length}</p>
//                 </div>
//               </div>
//             </div>

//             <div className="stat-card">
//               <div className="stat-content">
//                 <Package className="stat-icon" />
//                 <div>
//                   <p className="stat-label">Today's Pickups</p>
//                   <p className="stat-value">
//                     {donations.filter((d) => d.status === "picked_up").length}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="donations-list">
//             <h3 className="list-header">Pending Donations</h3>
//             {pendingDonations.map((donation) => (
//               <div key={donation.id} className="donation-card">
//                 <div className="donation-content">
//                   <div>
//                     <div className="donor-info">
//                       <span className="status-badge">Pending</span>
//                       <h4 className="donor-name">{donation.donor}</h4>
//                     </div>
//                     <div className="location-info">
//                       <MapPin size={16} />
//                       <span>{donation.location}</span>
//                     </div>
//                     <div className="donation-details">
//                       Items: {donation.items} ({donation.quantity})
//                     </div>
//                   </div>
//                   <button
//                     className="pickup-button"
//                     onClick={() => handlePickup(donation.id)}
//                   >
//                     Mark as Picked Up
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VolunteerDashboard;

import React, { useState, useEffect } from "react";
import { MapPin, Package } from "lucide-react";
// import VolunteerDashboard from "./VolunteerDashboard";
import "./VolunteerDashboard.css";
import { Link, useNavigate } from "react-router-dom";
import { useFoodTracking } from "./FoodTrackingContext";
import { apiFetch } from "../api/client";

const VolunteerDashboard = () => {
  const [donations, setDonations] = useState([]);
  const { incrementStep } = useFoodTracking();
  useEffect(() => {
    async function fetchDonations() {
      try {
        const data = await apiFetch("/api/donations");
        setDonations(data.donations || []);
      } catch (error) {
        console.error("Error fetching donations:", error.message);
      }
    }

    fetchDonations();
    const interval = setInterval(fetchDonations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mark a donation as picked up
  const handlePickup = async (id) => {
    try {
      await apiFetch(`/api/donations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "picked_up", status2: "Picked Up" }),
      });
      setDonations((donations) =>
        donations.map((donation) =>
          donation.id === id ? { ...donation, status: "picked_up" } : donation
        )
      );
    } catch (error) {
      console.error("Error updating donation status:", error.message);
    }
  };

  const pendingDonations = donations.filter((d) => d.status !== "picked_up");
  const pickedUpDonations = donations.filter((d) => d.status === "picked_up");
  const navigate = useNavigate();
  return (
    <div className="dashboard no-sidebar">
      <div className="main-content">
        <Link to="/Tracking" className="back-button">
          Back to Tracking
        </Link>
        <header>
          <h1>Volunteer Dashboard</h1>
          <div className="user-profile">VL</div>
        </header>

        {/* Stats Section */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <Package className="stat-icon" />
              <div>
                <p className="stat-label">Pending Pickups</p>
                <p className="stat-value">{pendingDonations.length}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <Package className="stat-icon" />
              {/* <div>
                <p className="stat-label">Today's Pickups</p>
                <p className="stat-value">{pickedUpDonations.length}</p>
              </div> */}
            </div>
          </div>
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
                      {(() => {
                        try {
                          return JSON.parse(donation.foodDetails).map(
                            (item, index) => (
                              <div key={index}>
                                {item.name} – {item.quantity}
                              </div>
                            )
                          );
                        } catch (error) {
                          return "Invalid data";
                        }
                      })()}
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
                        onClick={() => {
                          incrementStep();
                          navigate("/DeliveryTrackingPage");
                        }}
                      >
                        Accept
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

        {/* Pending Donations List */}
        <div className="donations-list">
          <h3 className="list-header">Pending Donations</h3>
          {pendingDonations.map((donation) => (
            <div key={donation.id} className="donation-card">
              <div className="donation-content">
                <div>
                  <div className="donor-info">
                    <span className="status-badge">Pending</span>
                    <h4 className="donor-name">{donation.donor}</h4>
                  </div>
                  <div className="location-info">
                    <MapPin size={16} />
                    <span>{donation.location}</span>
                  </div>
                  <div className="donation-details">
                    Items:{" "}
                    {(() => {
                      try {
                        return JSON.parse(donation.foodDetails).map((item) => (
                          <span key={item.name}>
                            {item.name} ({item.quantity}){" "}
                          </span>
                        ));
                      } catch (error) {
                        return "Invalid data";
                      }
                    })()}
                  </div>
                </div>
                <button
                  className="pickup-button"
                  onClick={() => handlePickup(donation.id)}
                >
                  Mark as Picked Up
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VolunteerDashboard;
