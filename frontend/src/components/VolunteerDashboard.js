import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CircleCheck, Hourglass, MapPin, PackageCheck, Route, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import WorkspaceMetric from "./WorkspaceMetric";
import "./PersonaTheme.css";
import "./VolunteerDashboard.css";
import { apiFetch } from "../api/client";
import { STATUS_TEXT, foodSummary } from "./DonationTimeline";
import Illustration from "./Illustration";

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [open, assigned] = await Promise.all([
        apiFetch("/api/donations?status=available,requested"),
        apiFetch("/api/donations?assigned=me"),
      ]);
      setQueue(open.donations || []);
      setMine(assigned.donations || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const pickUp = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/donations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "picked_up" }),
      });
      navigate(`/DeliveryTrackingPage?id=${id}`);
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const active = mine.filter((d) => ["picked_up", "in_transit"].includes(d.status));
  const delivered = mine.filter((d) => d.status === "delivered");

  return (
    <div className="volunteer-dashboard">
      <section className="workspace-heading">
        <div><h1>Ready for your next pickup?</h1><p>Collect food from donors and carry it to the NGO that claimed it.</p></div>
        <Illustration name="hero-volunteer" className="workspace-heading-art" />
        <Link className="workspace-primary" to="/VolunteerMap"><MapPin size={17} /> Open volunteer map</Link>
      </section>
      {error && <p className="workspace-panel" role="alert">{error}</p>}

      <section className="workspace-metrics" aria-label="Pickup summary">
        <WorkspaceMetric hero index={0} icon={Hourglass} pose="volunteer-peek" label="Awaiting pickup" value={queue.length} hint="Food waiting for a hero like you" />
        <WorkspaceMetric index={1} icon={Truck} label="Your active deliveries" value={active.length} hint="Picked up, not yet delivered" />
        <WorkspaceMetric index={2} icon={CircleCheck} pose="volunteer-scooter" label="Delivered" value={delivered.length} share={mine.length ? delivered.length / mine.length : null} shareOf="your pickups" />
      </section>

      {active.length > 0 && (
        <section className="workspace-panel volunteer-queue-panel">
          <div className="workspace-panel-heading"><h2>In your hands</h2></div>
          <div className="workspace-table-wrap">
            <table className="workspace-data-table">
              <thead><tr><th>Tracking ID</th><th>Deliver to</th><th>Status</th><th></th></tr></thead>
              <tbody>{active.map((d) => (
                <tr key={d.id}>
                  <td>{d.donation_tracking_id}</td>
                  <td>{d.ngo_name ? `${d.ngo_name} · ${d.ngo_address}` : <span className="workspace-muted">No NGO claimed it: deliver to the nearest partner NGO</span>}</td>
                  <td><span className={`status-pill ${d.status}`}>{STATUS_TEXT[d.status]}</span></td>
                  <td><Link className="workspace-table-action" to={`/DeliveryTrackingPage?id=${d.id}`}>Continue</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="volunteer-route-tools" aria-label="Volunteer tools">
        <Link to="/VolunteerMap"><MapPin size={18} /><span><strong>Pickup map</strong><small>Review donation locations</small></span><ArrowUpRight size={16} /></Link>
        <Link to="/DeliveryTrackingPage"><Truck size={18} /><span><strong>Delivery progress</strong><small>Continue an active delivery</small></span><ArrowUpRight size={16} /></Link>
        <Link to="/Tracking"><Route size={18} /><span><strong>Delivery history</strong><small>Everything you've carried</small></span><ArrowUpRight size={16} /></Link>
      </section>

      <section className="workspace-panel volunteer-queue-panel">
        <div className="workspace-panel-heading"><h2>Pickup queue</h2><span className="volunteer-queue-count">{queue.length} open</span></div>
        {queue.length ? (
          <div className="workspace-table-wrap">
            <table className="workspace-data-table">
              <thead><tr><th>Donation</th><th>Pickup location</th><th>Deliver to</th><th>Posted</th><th></th></tr></thead>
              <tbody>{queue.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.type}</strong><br /><span className="workspace-muted">{foodSummary(d.foodDetails)}</span></td>
                  <td><span className="volunteer-location"><MapPin size={14} />{d.location}</span></td>
                  <td>{d.ngo_name || <span className="workspace-muted">Not claimed yet</span>}</td>
                  <td className="workspace-muted">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="workspace-table-action" type="button" disabled={busyId === d.id} onClick={() => pickUp(d.id)}>
                      <PackageCheck size={14} /> {busyId === d.id ? "Saving…" : "I picked it up"}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-empty"><p>No open pickups<Illustration name="state-all-done" className="workspace-empty-art" /> right now. Check the map or return later for new donations.</p><Link className="workspace-secondary" to="/VolunteerMap">Open volunteer map</Link></div>
        )}
      </section>
    </div>
  );
};

export default VolunteerDashboard;
