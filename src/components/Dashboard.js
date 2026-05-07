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
import "./Dashboard.css";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import "./LearnerCorner";
import "./ImageRecognition";
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

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    id: null,
    name: "User",
    donations: 0,
    impactScore: 0,
    points: 0,
  });

  const [totalDonations, setTotalDonations] = useState(0);
  const [open, setopen] = useState(false);
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
        backgroundColor: "rgba(76, 175, 80, 0.7)",
        borderColor: "#2e7d32",
        borderWidth: 1,
      },
    ],
  });

  useEffect(() => {
    const refresh = async () => {
      await fetchUserData();
      await fetchDonationStats();
    };

    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    try {
      const data = await apiFetch("/api/auth/me");
      const currentUser = data.user;
      setUser({
        id: currentUser?.id || currentUser?._id || null,
        name: currentUser?.fullName || "User",
        donations: currentUser?.donations || 0,
        impactScore: currentUser?.impactScore || 0,
        points: currentUser?.points || 0,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchDonationStats = async () => {
    try {
      const data = await apiFetch("/api/donations");
      const donations = data.donations || [];
      setTotalDonations(donations.length);

      const monthlyCounts = Array(12).fill(0);
      donations.forEach((donation) => {
        const date = new Date(donation.created_at);
        if (!Number.isNaN(date.getTime())) {
          monthlyCounts[date.getMonth()] += 1;
        }
      });

      setChartData((prev) => ({
        ...prev,
        datasets: [
          {
            ...prev.datasets[0],
            data: monthlyCounts,
          },
        ],
      }));
    } catch (error) {
      console.error("Error fetching donation statistics:", error);
    }
  };

  const handleDonation = async () => {
    if (!user?.id) {
      console.error("User not logged in");
      return;
    }

    try {
      await apiFetch("/api/donations", {
        method: "POST",
        body: JSON.stringify({
          type: "General",
          location: "N/A",
          foodDetails: "",
          notes: "Quick donation from dashboard",
        }),
      });

      fetchTotalDonations();
      setUser((prevUser) => ({
        ...prevUser,
        donations: prevUser.donations + 1,
      }));
      console.log("Donation added successfully!");
    } catch (error) {
      console.error("Error inserting donation:", error);
      return;
    }
  };

  return (
    <div className="dashboard">
      <div className="profile">
        <img
          src="https://via.placeholder.com/80"
          alt="Profile"
          className="profile-img"
        />
        <h2>Namaste, {user?.name}</h2>
        <p>Food Donation Enthusiast</p>

        <div className="progress">
          <span>Punya Points Progress</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(user.points / 1000) * 100}%` }}
            ></div>
          </div>
          <small>{user.points}/1000 points</small>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <h4>Total Donations</h4>
          <p>{totalDonations}</p>
        </div>

        <div className="stat-card">
          <h4>Impact Score</h4>
          <p>{user.impactScore}</p>
        </div>
      </div>

      <div className="HalfDash">
        <div className="chart">
          <h4>Total Food Donated</h4>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Monthly Donation Count" },
              },
              scales: {
                y: { beginAtZero: true, precision: 0 },
              },
            }}
          />
        </div>
      </div>

      <div className="cta">
        <button className="donate-button" onClick={() => navigate("/Tracking")}>
          Track My Donations
        </button>
      </div>

      <div className="cta">
        <Link to="/donate">
          <button className="donate-button" onClick={handleDonation}>
            + Donate Now
          </button>
        </Link>
       
      </div>
      
      <div className="sidebar">
        <button  className="menu-icon" onClick={()=>setopen(true)}>
          <Menu size={28} />
        </button>
       <div className={`menu ${ open? 'open' : ''}`}>
        <button className="close-btn" onClick={() => setopen(false)}>
          <X size={24} />
        </button>
        <ul>
          <Link to="/LearnerCorner">
        <li><button>Learners Corner</button></li>
        </Link>
        <Link to="/ImageRecognition">
        <li> <button>AI Food Detection</button></li>
        </Link>
        <Link to="/FoodHeroes">
        <li><button>Food Heroes</button></li>
        </Link>
        </ul>
        </div>
         {open && <div className="overlay" onClick={() => setopen(false)} />}
      </div>
    </div>
  );
}

export default Dashboard;
