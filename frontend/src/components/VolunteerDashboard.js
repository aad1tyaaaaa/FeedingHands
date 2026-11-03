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
import { ArrowUpRight, CircleCheck, Hourglass, MapPin, PackageCheck, Route, Truck } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
// import VolunteerDashboard from "./VolunteerDashboard";
import "./PersonaTheme.css";
import "./VolunteerDashboard.css";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

const VolunteerDashboard = () => {
  const [donations, setDonations] = useState([]);
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
  return (
      <div className="volunteer-dashboard">
        <section className="workspace-heading">
          <div><h1>Ready for your next pickup?</h1><p>Review available donations, collect food, and keep deliveries moving.</p></div>
          <Link className="workspace-primary" to="/VolunteerMap"><MapPin size={17} /> Open volunteer map</Link>
        </section>

        <section className="workspace-metrics" aria-label="Pickup summary">
          <WorkspaceMetric hero index={0} icon={Hourglass} label="Awaiting pickup" value={pendingDonations.length} hint="Food waiting for a hero like you" />
          <WorkspaceMetric index={1} icon={CircleCheck} label="Collected" value={pickedUpDonations.length} share={donations.length ? pickedUpDonations.length / donations.length : null} shareOf="donations" />
          <WorkspaceMetric index={2} icon={MapPin} label="With a location" value={pendingDonations.filter((donation) => donation.location).length} share={pendingDonations.length ? pendingDonations.filter((donation) => donation.location).length / pendingDonations.length : null} shareOf="open pickups" />
        </section>

        <section className="volunteer-route-tools" aria-label="Volunteer tools">
          <Link to="/VolunteerMap"><MapPin size={18} /><span><strong>Pickup map</strong><small>Review donation locations</small></span><ArrowUpRight size={16} /></Link>
          <Link to="/DeliveryTrackingPage"><Truck size={18} /><span><strong>Delivery progress</strong><small>Continue an active delivery</small></span><ArrowUpRight size={16} /></Link>
          <Link to="/Tracking"><Route size={18} /><span><strong>Donation tracking</strong><small>See the full movement history</small></span><ArrowUpRight size={16} /></Link>
        </section>

        <section className="workspace-panel volunteer-queue-panel">
          <div className="workspace-panel-heading"><h2>Pickup queue</h2><span className="volunteer-queue-count">{pendingDonations.length} open</span></div>
          {pendingDonations.length ? (
            <div className="workspace-table-wrap">
              <table className="workspace-data-table">
                <thead><tr><th>Donation</th><th>Pickup location</th><th>Details</th><th>Posted</th><th></th></tr></thead>
                <tbody>{pendingDonations.map((donation) => {
                  let foodItems = "Details not listed";
                  try {
                    const items = JSON.parse(donation.foodDetails || "[]");
                    if (Array.isArray(items) && items.length) foodItems = items.map((item) => `${item.name} (${item.quantity})`).join(", ");
                  } catch {
                    foodItems = donation.foodDetails || "Details not listed";
                  }
                  return (
                    <tr key={donation.id}>
                      <td>{donation.type || "Food donation"}</td>
                      <td><span className="volunteer-location"><MapPin size={14} />{donation.location || "Location not listed"}</span></td>
                      <td>{foodItems}</td>
                      <td className="workspace-muted">{donation.created_at ? new Date(donation.created_at).toLocaleDateString() : "Date unavailable"}</td>
                      <td><button className="workspace-table-action" type="button" onClick={() => handlePickup(donation.id)}><PackageCheck size={14} /> Mark collected</button></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          ) : (
            <div className="workspace-empty"><p>No open pickups right now. Check the map or return later for new donations.</p><Link className="workspace-secondary" to="/VolunteerMap">Open volunteer map</Link></div>
          )}
        </section>
      </div>
  );
};

export default VolunteerDashboard;
