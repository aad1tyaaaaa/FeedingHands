import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./NgoDashboard.css";
import { useFoodTracking } from "./FoodTrackingContext";
import { ArrowUpRight, CalendarDays, CircleCheck, Hourglass, Inbox, Route, Truck } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "../api/client";

export default function NgoDashboard() {
  const [donations, setDonations] = useState([]);
  const { incrementStep } = useFoodTracking();
  const navigate = useNavigate();

  // Initialize chart data with correct day order (Monday first)
  async function fetchDonations() {
    try {
      const data = await apiFetch("/api/donations");
      const list = data.donations || [];
      setDonations(list);
    } catch (error) {
      console.error("Error fetching donations:", error.message);
    }
  }

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimNow = () => {
    incrementStep();
    navigate("/Tracking");
  };

  const openDonations = donations.filter((donation) => donation.status !== "picked_up");
  const collectedDonations = donations.length - openDonations.length;
  const weekData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
    const count = donations.filter((donation) => {
      const date = new Date(donation.created_at);
      return !Number.isNaN(date.getTime()) && (date.getDay() + 6) % 7 === index;
    }).length;
    return { day, donations: count };
  });

  return (
      <div className="organization-dashboard">
        <section className="workspace-heading">
          <div><h1>Distribution overview</h1><p>Review incoming food and coordinate collection with your team.</p></div>
          <Link className="workspace-primary" to="/NgoTracking"><Truck size={17} /> Manage distribution</Link>
        </section>

        <section className="workspace-metrics" aria-label="Distribution summary">
          <WorkspaceMetric hero index={0} icon={Inbox} label="Donation records" value={donations.length} hint="Everything shared with your organization" />
          <WorkspaceMetric index={1} icon={Hourglass} label="Available to review" value={openDonations.length} share={donations.length ? openDonations.length / donations.length : null} shareOf="donations" />
          <WorkspaceMetric index={2} icon={CircleCheck} label="Collected" value={collectedDonations} share={donations.length ? collectedDonations / donations.length : null} shareOf="donations" />
        </section>

        <div className="organization-overview-grid">
          <section className="workspace-panel organization-chart-panel">
            <div className="workspace-panel-heading"><h2>Donations by weekday</h2><span className="organization-chart-note">Based on submitted dates</span></div>
            <div className="organization-chart">
              {donations.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="#ebe5fb" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#5d5672", fontSize: 13 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8a8499", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "#f5f1ff", radius: 12 }} />
                    <Bar dataKey="donations" fill="var(--accent)" activeBar={{ fill: "var(--pop)" }} radius={[999, 999, 999, 999]} maxBarSize={38} animationDuration={900} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="workspace-empty organization-chart-empty">
                  <p>Donation activity will appear here as food is shared with your organization.</p>
                  <Link className="workspace-inline-link" to="/Event_prediction">Explore event forecasts <ArrowUpRight size={15} /></Link>
                </div>
              )}
            </div>
          </section>

          <aside className="workspace-panel organization-tools-panel">
            <div className="workspace-panel-heading"><h2>Planning tools</h2></div>
            <div className="workspace-tool-links">
              <Link className="workspace-tool-link" to="/Event_prediction"><span>Explore event forecasts</span><CalendarDays size={16} /></Link>
              <Link className="workspace-tool-link" to="/Route_Optimization"><span>Plan a delivery route</span><Route size={16} /></Link>
              <Link className="workspace-tool-link" to="/KnowYourNgo"><span>Review organization profile</span><ArrowUpRight size={16} /></Link>
            </div>
          </aside>
        </div>

        <section className="workspace-panel organization-donations-panel">
          <div className="workspace-panel-heading"><h2>Incoming donations</h2><Link className="workspace-inline-link" to="/NgoTracking">Open tracking <ArrowUpRight size={15} /></Link></div>
          {donations.length ? (
            <div className="workspace-table-wrap">
              <table className="workspace-data-table">
                <thead><tr><th>Food type</th><th>Pickup location</th><th>Received</th><th>Status</th><th></th></tr></thead>
                <tbody>{donations.slice(0, 8).map((donation) => (
                  <tr key={donation.id}>
                    <td>{donation.type || "Food donation"}</td>
                    <td>{donation.location || "Location not listed"}</td>
                    <td className="workspace-muted">{donation.created_at ? new Date(donation.created_at).toLocaleDateString() : "Date unavailable"}</td>
                    <td>{donation.status === "picked_up" ? "Collected" : "Available"}</td>
                    <td><button className="workspace-table-action" type="button" onClick={handleClaimNow}>Open tracking</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="workspace-empty"><p>Incoming donations will appear here when they are submitted.</p><Link className="workspace-secondary" to="/Event_prediction">Explore event forecasts</Link></div>
          )}
        </section>
      </div>
  );
}