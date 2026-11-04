import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./PersonaTheme.css";
import "./DeliveryTrackingPage.css";
import { apiFetch } from "../api/client";
import DonationTimeline, { STATUS_TEXT, foodSummary } from "./DonationTimeline";
import Illustration from "./Illustration";

const NEXT = {
  picked_up: { status: "in_transit", label: "I'm on the way" },
  in_transit: { status: "delivered", label: "Delivered to NGO" },
};

// The volunteer's view of one delivery in progress: where to collect, where to drop, and the next step.
const DeliveryTrackingPage = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (id) {
        setDelivery((await apiFetch(`/api/donations/${encodeURIComponent(id)}`)).donation);
      } else {
        // No id: open the volunteer's oldest delivery still in progress.
        const { donations } = await apiFetch("/api/donations?assigned=me&status=picked_up,in_transit");
        const current = (donations || []).at(-1);
        if (current) setParams({ id: String(current.id) }, { replace: true });
        else setDelivery(null);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, setParams]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async () => {
    const next = NEXT[delivery.status];
    setSaving(true);
    try {
      const data = await apiFetch(`/api/donations/${delivery.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next.status }),
      });
      setDelivery(data.donation);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const shell = (children) => (
    <div className="fh-theme theme-volunteer delivery-tracking">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fh-page delivery-container">{children}</div>
    </div>
  );

  if (loading) return shell(<p className="fh-card delivery-state" role="status">Loading delivery…</p>);
  if (!delivery)
    return shell(
      <div className="fh-card delivery-state">
        <Illustration name="state-all-done" className="workspace-empty-art" />
        {error ? <p role="alert">{error}</p> : <p>All caught up! You have no delivery in progress.</p>}
        <Link className="fh-btn" to="/VolunteerDashboard">Find a pickup</Link>
      </div>,
    );

  const next = NEXT[delivery.status];
  return shell(
    <div className="delivery-card">
      <div className="delivery-header">
        <Illustration name="box-handover" className="route-art" />
        <h1 className="fh-title">Delivery <em>{delivery.donation_tracking_id}</em></h1>
        <p className="fh-label delivery-status">
          Status: <span className={`status-badge fh-chip status-pill ${delivery.status}`}>{STATUS_TEXT[delivery.status]}</span>
        </p>
        <Link to="/Route_Optimization" className="fh-btn fh-btn--ghost">Route map</Link>
      </div>
      {error && <p className="delivery-state--error" role="alert">{error}</p>}

      <div className="content">
        <div className="address-card fh-card">
          <h2>Pickup from</h2>
          <p className="address-details"><span>Donor:</span> {delivery.donor_name || "Donor"}</p>
          <p className="address-details"><span>Address:</span> {delivery.location}</p>
          <p className="address-details"><span>Phone:</span> <a href={`tel:${delivery.contact}`}>{delivery.contact}</a></p>
          <p className="address-details"><span>Food:</span> {delivery.type} — {foodSummary(delivery.foodDetails)}</p>
          {delivery.notes && <p className="address-details"><span>Notes:</span> {delivery.notes}</p>}
        </div>

        <div className="address-card fh-card">
          <h2>Deliver to</h2>
          {delivery.ngo_name ? (
            <>
              <p className="address-details"><span>NGO:</span> {delivery.ngo_name}</p>
              <p className="address-details"><span>Address:</span> {delivery.ngo_address}</p>
              <p className="address-details"><span>Phone:</span> <a href={`tel:${delivery.ngo_phone}`}>{delivery.ngo_phone}</a></p>
            </>
          ) : (
            <p className="address-details">No NGO has claimed this yet. Deliver to the nearest partner NGO from the <Link to="/KnowYourNgo">directory</Link>.</p>
          )}
        </div>

        <div className="fh-card" style={{ gridColumn: "1 / -1" }}>
          <DonationTimeline donation={delivery} />
        </div>

        <div className="button-container">
          {next ? (
            <button onClick={advance} disabled={saving} className="button deliver-button fh-btn fh-btn--pop">
              {saving ? "Saving…" : next.label}
            </button>
          ) : delivery.status === "delivered" ? (
            <div className="success-message fh-card" role="status">
              Delivered! Thank you — the donor has been credited with Puniya points.{" "}
              <Link to="/VolunteerDashboard">Find your next pickup</Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
  );
};

export default DeliveryTrackingPage;
