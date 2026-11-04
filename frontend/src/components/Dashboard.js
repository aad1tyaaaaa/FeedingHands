

import React, { useState, useEffect } from "react";
import "./PersonaTheme.css";
import "./Dashboard.css";
import { ArrowUpRight, Award, CalendarDays, Clock3, HandHeart, Plus } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import { STATUS_TEXT } from "./DonationTimeline";
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
import Illustration from "./Illustration";

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

ChartJS.defaults.font.family = `${getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim() || "Fredoka"}, sans-serif`;
ChartJS.defaults.color = "#5d5672";

function Dashboard() {
  const { user, refresh: refreshUser } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loadError, setLoadError] = useState("");
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
        setLoadError("");
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
        setLoadError(error.message);
      }
    };

    refresh();
    refreshUser(); // points change when a volunteer delivers
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const now = new Date();
  const thisMonthCount = donations.filter((donation) => {
    const date = new Date(donation.created_at);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const delivered = donations.filter((donation) => donation.status === "delivered").length;

  return (
      <div className="donor-dashboard">
        <section className="workspace-heading">
          <div>
            <h1>Hi {user.fullName.split(" ")[0]}, your giving in one place</h1>
            {loadError && <p role="alert">{loadError}</p>}
            <p>Make a donation, follow its progress, and see your community activity.</p>
          </div>
          <Illustration name="hero-donor" className="workspace-heading-art" />
          <Link className="workspace-primary" to="/Donate"><Plus size={17} /> Start a donation</Link>
        </section>

        <section className="workspace-metrics" aria-label="Donation summary">
          <WorkspaceMetric hero index={0} icon={HandHeart} pose="donor-box" label="Donation records" value={donations.length} hint="Every plate you've shared so far" />
          <WorkspaceMetric index={1} icon={CalendarDays} label="This month" value={thisMonthCount} share={donations.length ? thisMonthCount / donations.length : null} shareOf="all donations" />
          <WorkspaceMetric index={2} icon={Award} pose="donor-wave" label="Puniya points" value={user.points} hint={`${delivered} delivered · 10 points each`} />
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
                <div className="workspace-empty donor-chart-empty"><Illustration name="trend-chart" className="workspace-empty-art" />
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
                <thead><tr><th>Donation</th><th>Pickup location</th><th>Date added</th><th>Status</th></tr></thead>
                <tbody>{donations.slice(0, 5).map((donation) => (
                  <tr key={donation.id}>
                    <td><Link to={`/Tracking?id=${donation.id}`}>{donation.donation_tracking_id}</Link> · {donation.type}</td>
                    <td>{donation.location || "Location not listed"}</td>
                    <td className="workspace-muted">{donation.created_at ? new Date(donation.created_at).toLocaleDateString() : "Date unavailable"}</td>
                    <td><span className={`status-pill ${donation.status}`}>{STATUS_TEXT[donation.status]}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="workspace-empty"><Illustration name="state-empty" className="workspace-empty-art" />
              <p>No donation records yet. Your first contribution will appear here.</p>
              <Link className="workspace-secondary" to="/Donate"><Clock3 size={15} /> Create a donation</Link>
            </div>
          )}
        </section>
      </div>
  );
}

export default Dashboard;
