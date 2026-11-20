import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bike, Building2, Copy, MapPin, ScanSearch, Search, Utensils, XCircle } from "lucide-react";
import "./PersonaTheme.css";
import "./Tracking.css";
import { apiFetch } from "../api/client";
import usePolling, { usePagedList } from "../api/usePolling";
import DonationPhotos from "./DonationPhotos";
import LoadMore from "./LoadMore";
import ReportButton from "./ReportButton";
import { useAuth } from "./AuthContext";
import DonationTimeline, { STATUS_TEXT, foodSummary, formatDate } from "./DonationTimeline";
import Illustration from "./Illustration";

// Donors see their donations, NGOs what they claimed, volunteers what they carried.
// Anyone can also look up a tracking ID (the public view, without contact details).
const Tracking = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [selected, setSelected] = useState(null);
  const [lookup, setLookup] = useState("");
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState(null);

  const listPath =
    user.role === "biogas" ? null : user.role === "organization" || user.role === "volunteer" ? "/api/donations?assigned=me" : "/api/donations";
  const list = usePagedList(listPath);
  const donations = list.items;
  const loading = list.loading;

  // A lookup by tracking ID clears ?id=, so with no id there's nothing to refresh (keep the lookup result).
  const loadSelected = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = await apiFetch(`/api/donations/${encodeURIComponent(selectedId)}`);
      setSelected(data.donation);
      setError("");
    } catch (err) {
      setSelected(null);
      setError(err.message);
    }
  }, [selectedId]);

  // Poll so progress made by the NGO or volunteer shows up without a reload.
  usePolling(loadSelected);

  // An NGO is involved in a donation when its organization claimed it.
  useEffect(() => {
    if (user.role !== "organization") return;
    apiFetch("/api/organizations/me").then((data) => setOrgId(data.organization?.id ?? null)).catch(() => {});
  }, [user.role]);

  useEffect(() => {
    // Open the newest donation by default, but never replace a tracking-ID lookup result.
    if (!selectedId && !selected && donations.length) setParams({ id: String(donations[0].id) }, { replace: true });
  }, [donations, selectedId, selected, setParams]);

  const handleLookup = async (e) => {
    e.preventDefault();
    const id = lookup.trim().toUpperCase();
    if (!id) return;
    setError("");
    try {
      const data = await apiFetch(`/api/donations/tracking/${encodeURIComponent(id)}`);
      setParams({}, { replace: true });
      setSelected({ ...data.tracking, public: true });
    } catch (err) {
      setSelected(null);
      setError(err.message);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this donation? This can't be undone.")) return;
    try {
      const data = await apiFetch(`/api/donations/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      setSelected(data.donation);
      list.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const canCancel =
    selected && !selected.public && ["available", "requested"].includes(selected.status) &&
    ((user.role === "donor" && selected.donor_id === user.id) || (user.role === "organization" && selected.status === "requested"));

  const involved =
    selected && !selected.public &&
    (user.role === "admin" || selected.donor_id === user.id || selected.volunteer_id === user.id ||
      (orgId != null && selected.organization_id === orgId));

  const copyId = () => navigator.clipboard?.writeText(selected.donation_tracking_id).catch(() => {});
  const listTitle = user.role === "donor" ? "Your donations" : user.role === "organization" ? "Claimed by you" : "Your deliveries";

  return (
    <div className="tracking-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Donation tracking</h1>
          <p>Follow every donation from the donor's kitchen to the plate.</p>
        </div>
        <Illustration name="hero-tracking" className="workspace-heading-art" />
        <form className="tracking-lookup" onSubmit={handleLookup} role="search">
          <label>
            <Search size={17} aria-hidden="true" />
            <input aria-label="Tracking ID" placeholder="Track an ID, e.g. FH-7KQ2M9XA" value={lookup} onChange={(e) => setLookup(e.target.value)} />
          </label>
          <button className="workspace-primary" type="submit">Track</button>
        </form>
      </section>

      {(error || list.error) && <p className="tracking-error" role="alert">{error || list.error}</p>}

      <div className="tracking-layout">
        <section className="workspace-panel tracking-detail" aria-live="polite">
          {selected ? (
            <>
              <div className="tracking-detail-head">
                <div className="tracking-detail-id">
                  <h2>{selected.donation_tracking_id}</h2>
                  <button type="button" className="tracking-copy" onClick={copyId} aria-label="Copy tracking ID" title="Copy tracking ID">
                    <Copy size={15} />
                  </button>
                </div>
                <span className={`status-pill ${selected.status}`}>{STATUS_TEXT[selected.status]}</span>
              </div>

              <dl className="tracking-facts">
                <div className="tracking-fact">
                  <Utensils size={18} />
                  <dt>Food</dt>
                  <dd>{selected.type}{selected.foodDetails && <small>{foodSummary(selected.foodDetails)}</small>}</dd>
                </div>
                {selected.location && (
                  <div className="tracking-fact">
                    <MapPin size={18} />
                    <dt>Pickup</dt>
                    <dd>
                      {selected.location}
                      {selected.contact && user.role !== "donor" && <small>{selected.donor_name} · <a href={`tel:${selected.contact}`}>{selected.contact}</a></small>}
                    </dd>
                  </div>
                )}
                {selected.freshness && (
                  <div className="tracking-fact">
                    <ScanSearch size={18} />
                    <dt>Freshness check</dt>
                    <dd>
                      {selected.freshness}
                      {selected.freshness_confidence != null && <small>{Math.round(selected.freshness_confidence * 100)}% confident · model estimate at posting</small>}
                    </dd>
                  </div>
                )}
                <div className="tracking-fact">
                  <Building2 size={18} />
                  <dt>NGO</dt>
                  <dd>
                    {selected.ngo_name || "Not claimed yet"}
                    {selected.ngo_phone && <small><a href={`tel:${selected.ngo_phone}`}>{selected.ngo_phone}</a></small>}
                  </dd>
                </div>
                <div className="tracking-fact">
                  <Bike size={18} />
                  <dt>Volunteer</dt>
                  <dd>{selected.volunteer_name || "Not assigned yet"}</dd>
                </div>
              </dl>

              {!selected.public && <DonationPhotos donation={selected} />}

              <DonationTimeline donation={selected} />

              {(canCancel || involved || selected.public) && (
                <div className="tracking-actions">
                  {involved && <ReportButton donationId={selected.id} />}
                  {canCancel && (
                    <button className="workspace-secondary tracking-cancel" type="button" onClick={cancel}>
                      <XCircle size={16} /> Cancel donation
                    </button>
                  )}
                  {selected.public && <span className="workspace-muted">Public view: contact details are hidden.</span>}
                </div>
              )}
            </>
          ) : (
            <div className="workspace-empty">
              <Illustration name="state-no-results" className="workspace-empty-art" />
              <p>{loading ? "Loading…" : "Pick a donation from the list, or enter a tracking ID above."}</p>
            </div>
          )}
        </section>

        {user.role !== "biogas" && (
          <aside className="workspace-panel tracking-sidebar" aria-label={listTitle}>
            <div className="workspace-panel-heading">
              <h2>{listTitle}</h2>
              <span className="tracking-count">{donations.length}</span>
            </div>
            {loading ? (
              <p role="status">Loading…</p>
            ) : donations.length ? (
              <ul className="tracking-list">
                {donations.map((d) => (
                  <li key={d.id}>
                    <button type="button" className="tracking-item" aria-current={String(d.id) === selectedId} onClick={() => setParams({ id: String(d.id) })}>
                      <span className="tracking-item-id">{d.donation_tracking_id}</span>
                      <span className={`status-pill ${d.status}`}>{STATUS_TEXT[d.status]}</span>
                      <span className="tracking-item-where">{d.type} · {d.location}</span>
                      <span className="tracking-item-when">{formatDate(d.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="workspace-empty">
                <Illustration name="state-no-results" className="workspace-empty-art" />
                <p>Nothing to track yet.</p>
                {user.role === "donor" && <Link className="workspace-secondary" to="/donate">Make your first donation</Link>}
                {user.role === "organization" && <Link className="workspace-secondary" to="/ngo">Claim a donation</Link>}
                {user.role === "volunteer" && <Link className="workspace-secondary" to="/volunteer">Pick up a donation</Link>}
              </div>
            )}
            <LoadMore list={list} />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Tracking;
