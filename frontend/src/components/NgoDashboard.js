import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PersonaTheme.css";
import "./NgoDashboard.css";
import { ArrowUpRight, CalendarDays, CircleCheck, Hourglass, Inbox, Route, Truck } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "../api/client";
import { STATUS_TEXT, foodSummary } from "./DonationTimeline";
import Illustration from "./Illustration";

export default function NgoDashboard() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([
        apiFetch("/api/donations?status=available"),
        apiFetch("/api/donations?assigned=me"),
      ]);
      setAvailable(open.donations || []);
      setClaimed(mine.donations || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    apiFetch("/api/organizations/me").catch((err) => err.status === 404 && setHasProfile(false));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const claim = async (donation) => {
    setBusyId(donation.id);
    try {
      await apiFetch(`/api/donations/${donation.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "requested" }),
      });
      navigate(`/NgoTracking?id=${donation.id}`);
    } catch (err) {
      setError(err.message);
      load(); // someone else may have claimed it first
    } finally {
      setBusyId(null);
    }
  };

  const active = claimed.filter((d) => !["delivered", "cancelled"].includes(d.status));
  const delivered = claimed.filter((d) => d.status === "delivered");
  const all = [...available, ...claimed];
  const weekData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({
    day,
    donations: all.filter((d) => (new Date(d.created_at).getDay() + 6) % 7 === index).length,
  }));

  return (
    <div className="organization-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Distribution overview</h1>
          <p>Claim food near you and follow it until it reaches your kitchen.</p>
        </div>
        <Illustration name="hero-ngo" className="workspace-heading-art" />
        <Link className="workspace-primary" to="/NgoTracking"><Truck size={17} /> Track claimed food</Link>
      </section>

      {!hasProfile && (
        <p className="workspace-panel" role="alert">
          Add your organization's name and address before claiming donations.{" "}
          <Link className="workspace-inline-link" to="/Register">Complete profile <ArrowUpRight size={15} /></Link>
        </p>
      )}
      {error && <p className="workspace-panel" role="alert">{error}</p>}

      <section className="workspace-metrics" aria-label="Distribution summary">
        <WorkspaceMetric hero index={0} icon={Inbox} pose="ngo-crate" label="Available to claim" value={available.length} hint="Posted by donors and waiting for an NGO" />
        <WorkspaceMetric index={1} icon={Hourglass} label="In progress" value={active.length} share={claimed.length ? active.length / claimed.length : null} shareOf="your claims" />
        <WorkspaceMetric index={2} icon={CircleCheck} pose="ngo-wave" label="Delivered to you" value={delivered.length} share={claimed.length ? delivered.length / claimed.length : null} shareOf="your claims" />
      </section>

      <section className="workspace-panel organization-donations-panel">
        <div className="workspace-panel-heading"><h2>Available donations</h2></div>
        {available.length ? (
          <div className="workspace-table-wrap">
            <table className="workspace-data-table">
              <thead><tr><th>Food</th><th>Pickup location</th><th>Posted</th><th></th></tr></thead>
              <tbody>{available.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.type}</strong><br /><span className="workspace-muted">{foodSummary(d.foodDetails)}</span></td>
                  <td>{d.location}</td>
                  <td className="workspace-muted">{new Date(d.created_at).toLocaleString()}</td>
                  <td>
                    <button className="workspace-table-action" type="button" disabled={!hasProfile || busyId === d.id} onClick={() => claim(d)}>
                      {busyId === d.id ? "Claiming…" : "Claim"}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-empty"><p>No food waiting<Illustration name="state-all-done" className="workspace-empty-art" /> right now. New donations appear here automatically.</p></div>
        )}
      </section>

      <div className="organization-overview-grid">
        <section className="workspace-panel organization-chart-panel">
          <div className="workspace-panel-heading"><h2>Donations by weekday</h2><span className="organization-chart-note">Available and claimed</span></div>
          <div className="organization-chart">
            {all.length ? (
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
              <div className="workspace-empty organization-chart-empty"><Illustration name="pie-chart" className="workspace-empty-art" /><p>Donation activity will appear here.</p></div>
            )}
          </div>
        </section>

        <aside className="workspace-panel organization-tools-panel">
          <div className="workspace-panel-heading"><h2>Planning tools</h2></div>
          <div className="workspace-tool-links">
            <Link className="workspace-tool-link" to="/Event_prediction"><span>Donation forecast</span><CalendarDays size={16} /></Link>
            <Link className="workspace-tool-link" to="/Route_Optimization"><span>Plan a pickup route</span><Route size={16} /></Link>
            <Link className="workspace-tool-link" to="/Register"><span>Edit organization profile</span><ArrowUpRight size={16} /></Link>
          </div>
        </aside>
      </div>

      <section className="workspace-panel organization-donations-panel">
        <div className="workspace-panel-heading"><h2>Your claims</h2><Link className="workspace-inline-link" to="/NgoTracking">Open tracking <ArrowUpRight size={15} /></Link></div>
        {claimed.length ? (
          <div className="workspace-table-wrap">
            <table className="workspace-data-table">
              <thead><tr><th>Tracking ID</th><th>Pickup location</th><th>Volunteer</th><th>Status</th></tr></thead>
              <tbody>{claimed.slice(0, 10).map((d) => (
                <tr key={d.id}>
                  <td><Link to={`/NgoTracking?id=${d.id}`}>{d.donation_tracking_id}</Link></td>
                  <td>{d.location}</td>
                  <td>{d.volunteer_name || <span className="workspace-muted">Waiting for a volunteer</span>}</td>
                  <td><span className={`status-pill ${d.status}`}>{STATUS_TEXT[d.status]}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-empty"><p>Food you claim<Illustration name="state-empty" className="workspace-empty-art" /> will appear here with live delivery status.</p></div>
        )}
      </section>
    </div>
  );
}
