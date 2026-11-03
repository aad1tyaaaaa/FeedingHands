// import React, { useState, useEffect } from "react";
// import "./Dashboard.css";
// import { Link, useNavigate } from "react-router-dom";
// import { Line } from "react-chartjs-2";
// import { createClient } from "@supabase/supabase-js";
// import {
//   Chart as ChartJS,
//   LineElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   Filler,
// } from "chart.js";

// ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler);

// // Initialize Supabase Client securely
// const SUPABASE_URL = "https://evrxtwxxwptqjhecthdv.supabase.co";
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cnh0d3h4d3B0cWpoZWN0aGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODIzMDgsImV4cCI6MjA1NDY1ODMwOH0.QKuD5Wz8HxibrI_zpM-7BRq8KX7MHlYTZ9Yis_REmI0";
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// function Dashboard() {
//   // const navigate = useNavigate();
//   // const [totalDonations, setTotalDonations] = useState(0);
//   // const [user, setUser] = useState({
//   //   id: null,
//   //   name: "",
//   //   donations: 0,
//   //   impactScore: 0,
//   //   points: 0,
//   // });

//   // const [chartData, setChartData] = useState({
//   //   labels: [
//   //     "Jan",
//   //     "Feb",
//   //     "Mar",
//   //     "Apr",
//   //     "May",
//   //     "Jun",
//   //     "Jul",
//   //     "Aug",
//   //     "Sep",
//   //     "Oct",
//   //     "Nov",
//   //     "Dec",
//   //   ],
//   //   datasets: [
//   //     {
//   //       label: "Donations",
//   //       data: Array(12).fill(0),
//   //       borderColor: "#4CAF50",
//   //       backgroundColor: "rgba(76, 175, 80, 0.2)",
//   //       tension: 0.4,
//   //     },
//   //   ],
//   // });

//   useEffect(() => {
//     fetchUserData();
//     fetchTotalDonations();

//     const subscription = supabase
//       .channel("donation_updates")
//       .on(
//         "postgres_changes",
//         { event: "INSERT", schema: "public", table: "donation" },
//         (payload) => {
//           console.log("New Donation:", payload);
//           fetchTotalDonations();
//           updateChartData();
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(subscription);
//     };
//   }, []);

//   const updateChartData = async () => {
//     const { data, error } = await supabase
//       .from("donation")
//       .select("created_at");

//     if (error) {
//       console.error("Error fetching donation data:", error);
//       return;
//     }

//     // Extract month-wise donation counts
//     const monthData = Array(12).fill(0);
//     data.forEach((donation) => {
//       const month = new Date(donation.created_at).getMonth(); // Get month index
//       monthData[month] += 1;
//     });

//     setChartData({
//       labels: [
//         "Jan",
//         "Feb",
//         "Mar",
//         "Apr",
//         "May",
//         "Jun",
//         "Jul",
//         "Aug",
//         "Sep",
//         "Oct",
//         "Nov",
//         "Dec",
//       ],
//       datasets: [
//         {
//           label: "Donations",
//           data: monthData,
//           borderColor: "#4CAF50",
//           backgroundColor: "rgba(76, 175, 80, 0.2)",
//           tension: 0.4,
//         },
//       ],
//     });
//   };

//   // Fetch user data securely
//   const fetchUserData = async () => {
//     const { data: authData, error: authError } = await supabase.auth.getUser();
//     if (authError || !authData?.user) {
//       console.error("User not authenticated:", authError);
//       return;
//     }

//     const userId = authData.user.id;

//     const { data, error: fetchError } = await supabase
//       .from("donation")
//       .select("*")
//       .eq("user_id", userId)
//       .single();

//     if (fetchError) {
//       console.error("Error fetching user donation data:", fetchError);
//     } else {
//       setUser({
//         id: userId,
//         name: data?.name || "User",
//         donations: data?.donations || 0,
//         impactScore: data?.impactScore || 0,
//         points: data?.points || 0,
//       });
//     }
//   };

//   const fetchTotalDonations = async () => {
//     const { count, error } = await supabase
//       .from("donation")
//       .select("*", { count: "exact" });

//     if (error) {
//       console.error("Error fetching total donations:", error);
//     } else {
//       setTotalDonations(count || 0);
//     }
//   };

//   // Effect to fetch data and set up real-time subscription
//   useEffect(() => {
//     fetchUserData();
//     fetchTotalDonations();

//     const subscription = supabase
//       .channel("donation_updates")
//       .on(
//         "postgres_changes",
//         { event: "INSERT", schema: "public", table: "donation" },
//         (payload) => {
//           console.log("New Donation:", payload);
//           fetchTotalDonations();
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(subscription);
//     };
//   }, []);

//   const handleDonation = async () => {
//     if (!user?.id) {
//       console.error("User not logged in");
//       return;
//     }

//     const { error } = await supabase
//       .from("donation")
//       .insert([{ user_id: user.id }]);

//     if (error) {
//       console.error("Error inserting donation:", error);
//       return;
//     }

//     fetchTotalDonations(); // Refresh total donations count

//     // Update user's donations count and chart data
//     setUser((prevUser) => ({
//       ...prevUser,
//       donations: prevUser.donations + 1,
//     }));

//     setChartData((prevChart) => {
//       const newData = [...prevChart.datasets[0].data];
//       newData[newData.length - 1] += 1;
//       return {
//         ...prevChart,
//         datasets: [{ ...prevChart.datasets[0], data: newData }],
//       };
//     });

//     console.log("Donation added successfully!");
//   };
//   const handleSubmit = () => {
//     navigate("/Tracking");
//   };

//   return (
//     <div className="dashboard">
//       <div className="profile">
//         <img
//           src="https://via.placeholder.com/80"
//           alt="Profile"
//           className="profile-img"
//         />
//         <h2>Namaste, {user.name}</h2>
//         <p>Food Donation Enthusiast</p>
//         <div className="progress">
//           <span>Punya Points Progress</span>
//           <div className="progress-bar">
//             <div
//               className="progress-fill"
//               style={{ width: `${(user.points / 1000) * 100}%` }}
//             ></div>
//           </div>
//           <small>{user.points}/1000 points</small>
//         </div>
//       </div>

//       <div className="stats">
//         <div className="stat-card">
//           <h4>Total Donations</h4>
//           <p>{totalDonations}</p>
//         </div>

//         <div className="stat-card">
//           <h4>Impact Score</h4>
//           <p>{user.impactScore}</p>
//         </div>
//       </div>

//       <div className="HalfDash">
//         <div className="chart">
//           <h4>Total Food Donated</h4>
//           <Line data={chartData} options={{ responsive: true }} />
//         </div>
//       </div>
//       <div className="cta">
//         <button className="donate-button" onClick={handleSubmit}>
//           Track My Donations
//         </button>
//       </div>
//       <div className="cta">
//         <Link to="/donate">
//           <button className="donate-button" onClick={handleDonation}>
//             + Donate Now
//           </button>
//         </Link>
//         <Link to="/Register">
//           <button className="register-button">Register Organization</button>
//         </Link>
//       </div>
//     </div>
//   );
// }

// export default Dashboard;

import React, { useState, useEffect } from "react";
import "./PersonaTheme.css";
import "./Dashboard.css";
import { ArrowUpRight, CalendarDays, Clock3, HandHeart, Plus, Salad } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { apiFetch } from "../api/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// Canvas text ignores CSS, so give Chart.js the persona theme font (loaded in PersonaTheme.css).
// next/font hashes the family name; read the real one from the CSS variable (client-only module).
ChartJS.defaults.font.family = `${getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim() || "Fredoka"}, sans-serif`;
ChartJS.defaults.color = "#5d5672";

function Dashboard() {
  const [donations, setDonations] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Monthly Donations",
        data: Array(12).fill(0),
        backgroundColor: "#ff6b2c",
        hoverBackgroundColor: "#ffd84a",
        borderWidth: 0,
        borderRadius: 999,
        maxBarThickness: 34,
        borderSkipped: false,
      },
    ],
  });

  useEffect(() => {
    const refresh = async () => {
      try {
        const data = await apiFetch("/api/donations");
        const records = data.donations || [];
        setDonations(records);
        const monthlyCounts = Array(12).fill(0);
        records.forEach((donation) => {
          const date = new Date(donation.created_at);
          if (!Number.isNaN(date.getTime())) monthlyCounts[date.getMonth()] += 1;
        });
        setChartData((current) => ({
          ...current,
          datasets: [{ ...current.datasets[0], data: monthlyCounts }],
        }));
      } catch (error) {
        console.error("Error fetching donation statistics:", error);
      }
    };

    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const thisMonthCount = donations.filter((donation) => {
    const date = new Date(donation.created_at);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const foodTypeCount = new Set(donations.map((donation) => donation.type).filter(Boolean)).size;

  return (
      <div className="donor-dashboard">
        <section className="workspace-heading">
          <div>
            <h1>Your giving, in one place</h1>
            <p>Make a donation, follow its progress, and see your community activity.</p>
          </div>
          <Link className="workspace-primary" to="/Donate"><Plus size={17} /> Start a donation</Link>
        </section>

        <section className="workspace-metrics" aria-label="Donation summary">
          <WorkspaceMetric hero index={0} icon={HandHeart} label="Donation records" value={donations.length} hint="Every plate you've shared so far" />
          <WorkspaceMetric index={1} icon={CalendarDays} label="This month" value={thisMonthCount} share={donations.length ? thisMonthCount / donations.length : null} shareOf="all donations" />
          <WorkspaceMetric index={2} icon={Salad} label="Food types" value={foodTypeCount} hint="Different categories you've donated" />
        </section>

        <div className="donor-dashboard-grid">
          <section className="workspace-panel donor-chart-panel">
            <div className="workspace-panel-heading">
              <h2>Monthly donation activity</h2>
              <Link className="workspace-inline-link" to="/Tracking">Donation history <ArrowUpRight size={15} /></Link>
            </div>
            <div className="donor-chart">
              {donations.length ? (
                <Bar data={chartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 900, easing: "easeOutQuart" },
                  plugins: { legend: { display: false }, tooltip: { intersect: false, backgroundColor: "#1b1530", padding: 10, cornerRadius: 12 } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#f1ebe6" }, border: { display: false } }, x: { grid: { display: false } } },
                }} />
              ) : (
                <div className="workspace-empty donor-chart-empty">
                  <p>Your monthly activity will appear here after your first donation.</p>
                  <Link className="workspace-inline-link" to="/Donate">Start a donation <ArrowUpRight size={15} /></Link>
                </div>
              )}
            </div>
          </section>

          <aside className="workspace-panel donor-tools-panel">
            <div className="workspace-panel-heading"><h2>Useful tools</h2></div>
            <div className="workspace-tool-links">
              <Link className="workspace-tool-link" to="/Tracking"><span>Track a donation</span><ArrowUpRight size={16} /></Link>
              <Link className="workspace-tool-link" to="/ImageRecognition"><span>Check food freshness</span><ArrowUpRight size={16} /></Link>
              <Link className="workspace-tool-link" to="/LearnerCorner"><span>Learn about food safety</span><ArrowUpRight size={16} /></Link>
            </div>
          </aside>
        </div>

        <section className="workspace-panel donor-recent-panel">
          <div className="workspace-panel-heading">
            <h2>Recent donations</h2>
            <Link className="workspace-inline-link" to="/Tracking">View all <ArrowUpRight size={15} /></Link>
          </div>
          {donations.length ? (
            <div className="workspace-table-wrap">
              <table className="workspace-data-table">
                <thead><tr><th>Donation</th><th>Pickup location</th><th>Date added</th></tr></thead>
                <tbody>{donations.slice(0, 5).map((donation) => (
                  <tr key={donation.id}>
                    <td>{donation.type || "Food donation"}</td>
                    <td>{donation.location || "Location not listed"}</td>
                    <td className="workspace-muted">{donation.created_at ? new Date(donation.created_at).toLocaleDateString() : "Date unavailable"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="workspace-empty">
              <p>No donation records yet. Your first contribution will appear here.</p>
              <Link className="workspace-secondary" to="/Donate"><Clock3 size={15} /> Create a donation</Link>
            </div>
          )}
        </section>
      </div>
  );
}

export default Dashboard;
