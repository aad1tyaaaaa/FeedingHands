import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Building2, Download, Flag, Users } from "lucide-react";
import "./Settings.css"; // shared form + admin styles
import { API_BASE_URL, apiFetch, getToken } from "../api/client";
import { homeFor, useAuth } from "./AuthContext";
import { STATUS_TEXT } from "./DonationTimeline";
import WorkspaceMetric from "./WorkspaceMetric";

const TABS = [
  ["overview", "Overview"],
  ["orgs", "NGO reviews"],
  ["users", "Users"],
  ["reports", "Reports"],
];
const ROLES = ["donor", "volunteer", "organization", "biogas", "admin", "pending"];
const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");

function ErrorNote({ error }) {
  return error ? <p className="settings-error" role="alert">{error}</p> : null;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  if (user?.role !== "admin") return <Navigate to={homeFor(user)} replace />;

  return (
    <div className="admin-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Admin</h1>
          <p>Verify NGOs, manage accounts and act on reports.</p>
        </div>
      </section>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" id={`admin-tab-${key}`} aria-controls="admin-panel"
            aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <section className="workspace-panel" role="tabpanel" id="admin-panel" aria-labelledby={`admin-tab-${tab}`}>
        {tab === "overview" && <Overview />}
        {tab === "orgs" && <OrgReviews />}
        {tab === "users" && <UsersTab me={user} />}
        {tab === "reports" && <Reports />}
      </section>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiFetch("/api/admin/overview").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorNote error={error} />;
  if (!data) return <p role="status">Loading…</p>;
  const users = Object.values(data.usersByRole || {}).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="workspace-metrics" aria-label="Platform summary">
        <WorkspaceMetric hero index={0} icon={Building2} label="NGOs awaiting review" value={data.pendingOrganizations || 0} />
        <WorkspaceMetric index={1} icon={Flag} label="Open reports" value={data.openReports || 0} />
        <WorkspaceMetric index={2} icon={Users} label="Users" value={users} />
      </div>
      <h2 className="settings-label">Users by role</h2>
      <ul className="admin-breakdown">
        {Object.entries(data.usersByRole || {}).map(([role, n]) => <li key={role}>{role}: {n}</li>)}
      </ul>
      <h2 className="settings-label" style={{ marginTop: 18 }}>Donations by status</h2>
      <ul className="admin-breakdown">
        {Object.entries(data.donationsByStatus || {}).map(([s, n]) => <li key={s}>{STATUS_TEXT[s] || s}: {n}</li>)}
      </ul>
    </>
  );
}

const EXT = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" };

// The document needs the Bearer token, so a plain link won't do: fetch it, then save the blob.
async function downloadDocument(org) {
  const res = await fetch(`${API_BASE_URL}/api/admin/organizations/${org.id}/document`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Couldn't download the document.");
  }
  const blob = await res.blob();
  // Content-Disposition is only readable cross-origin if the API exposes it; otherwise name it ourselves.
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") || "")?.[1]
    || `registration-${org.id}${EXT[blob.type] || ""}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function OrgReviews() {
  const [status, setStatus] = useState("pending");
  const [orgs, setOrgs] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setOrgs(null);
    apiFetch(`/api/admin/organizations?status=${status}`)
      .then((d) => setOrgs(d.organizations || []))
      .catch((err) => { setError(err.message); setOrgs([]); });
  }, [status]);
  useEffect(load, [load]);

  const act = async (fn, id) => {
    setBusy(id);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const decide = (org, verdict) => {
    const note = (notes[org.id] || "").trim();
    if (verdict === "rejected" && !note) return setError("Add a note telling the organization why it was rejected.");
    act(async () => {
      await apiFetch(`/api/admin/organizations/${org.id}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ status: verdict, note }),
      });
      setOrgs((list) => list.filter((o) => o.id !== org.id));
    }, org.id);
  };

  return (
    <>
      <div className="admin-toolbar">
        <label className="settings-label">
          Show
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <ErrorNote error={error} />
      {!orgs ? <p role="status">Loading…</p> : !orgs.length ? (
        <p className="workspace-empty">No {status} organizations.</p>
      ) : (
        <div className="admin-list">
          {orgs.map((o) => (
            <article key={o.id} className="admin-item">
              <h3>{o.name}</h3>
              <div className="admin-meta">
                <span>Owner: {o.ownerEmail}</span>
                <span>Registration no.: {o.registrationNo || "not given"}</span>
                <span>Contact: {o.contact}, {o.phone}, {o.email}</span>
                {o.website && <span>Website: {o.website}</span>}
              </div>
              <p>{o.address}</p>
              <p>{o.description}</p>
              {o.reviewNote && <p><strong>Last review note:</strong> {o.reviewNote}</p>}
              <div className="admin-actions">
                {o.hasDocument ? (
                  <button type="button" className="workspace-table-action" disabled={busy === o.id}
                    onClick={() => act(() => downloadDocument(o), o.id)}>
                    <Download size={15} aria-hidden="true" /> Download document
                  </button>
                ) : <span className="admin-suspended">No document uploaded</span>}
              </div>
              <label className="settings-label">
                Note to the organization (emailed to them; required to reject)
                <textarea rows={2} maxLength={1000} value={notes[o.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
              </label>
              <div className="admin-actions">
                {o.verificationStatus !== "verified" && (
                  <button type="button" className="workspace-table-action" disabled={busy === o.id} onClick={() => decide(o, "verified")}>Approve</button>
                )}
                {o.verificationStatus !== "rejected" && (
                  <button type="button" className="workspace-table-action" disabled={busy === o.id} onClick={() => decide(o, "rejected")}>Reject</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function UsersTab({ me }) {
  const [query, setQuery] = useState({ q: "", role: "" });
  const [draft, setDraft] = useState("");
  const [users, setUsers] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async (before) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (query.q) params.set("q", query.q);
    if (query.role) params.set("role", query.role);
    if (before) params.set("before", before);
    try {
      const d = await apiFetch(`/api/admin/users?${params}`);
      setUsers((list) => (before ? [...list, ...(d.users || [])] : d.users || []));
      setNext(d.next ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => { load(); }, [load]);

  const toggleSuspend = async (u) => {
    setBusy(u.id);
    setError("");
    try {
      const d = await apiFetch(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ suspended: !u.suspended }) });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...d.user } : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, q: draft.trim() })); }}>
        <label className="settings-label">
          Search name or email
          <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </label>
        <label className="settings-label">
          Role
          <select value={query.role} onChange={(e) => setQuery((q) => ({ ...q, role: e.target.value }))}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <button type="submit" className="workspace-secondary">Search</button>
      </form>
      <ErrorNote error={error} />
      {!loading && !users.length ? <p className="workspace-empty">No users match.</p> : (
        <div className="workspace-table-wrap">
          <table className="workspace-data-table">
            <thead><tr><th>User</th><th>Role</th><th>Points</th><th>Joined</th><th>Status</th><th><span className="workspace-sr-only">Actions</span></th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.fullName || "(no name)"}</strong><br /><span className="workspace-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span></td>
                <td>{u.role}</td>
                <td>{u.points ?? 0}</td>
                <td className="workspace-muted">{when(u.created_at)}</td>
                <td>{u.suspended ? <span className="admin-suspended">Suspended</span> : u.isVerified ? "Active" : "Unverified email"}</td>
                <td>
                  {u.id !== me.id && (
                    <button type="button" className="workspace-table-action" disabled={busy === u.id} onClick={() => toggleSuspend(u)}>
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {loading && <p role="status">Loading…</p>}
      {next && !loading && (
        <div className="admin-list"><button type="button" className="workspace-secondary admin-more" onClick={() => load(next)}>Load more</button></div>
      )}
    </>
  );
}

function Reports() {
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setReports(null);
    apiFetch(`/api/admin/reports?status=${status}`)
      .then((d) => setReports(d.reports || []))
      .catch((err) => { setError(err.message); setReports([]); });
  }, [status]);

  const draft = (id) => drafts[id] || { resolution: "", cancel: false };
  const setDraft = (id, patch) => setDrafts((all) => ({ ...all, [id]: { ...draft(id), ...patch } }));

  const close = async (r, verdict) => {
    const { resolution, cancel } = draft(r.id);
    if (!resolution.trim()) return setError("Write what you found or did before closing the report.");
    setBusy(r.id);
    setError("");
    try {
      await apiFetch(`/api/admin/reports/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: verdict, resolution: resolution.trim(), cancelDonation: verdict === "resolved" && cancel }),
      });
      setReports((list) => list.filter((x) => x.id !== r.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <label className="settings-label">
          Show
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
      </div>
      <ErrorNote error={error} />
      {!reports ? <p role="status">Loading…</p> : !reports.length ? (
        <p className="workspace-empty">No {status} reports.</p>
      ) : (
        <div className="admin-list">
          {reports.map((r) => (
            <article key={r.id} className="admin-item">
              <h3>Donation <Link to={`/tracking?id=${r.donationId}`}>{r.trackingId || `#${r.donationId}`}</Link></h3>
              <div className="admin-meta">
                <span>Reported by {r.reporterName || "a deleted account"}</span>
                <span>{when(r.created_at)}</span>
              </div>
              <p>{r.reason}</p>
              {status === "open" ? (
                <>
                  <label className="settings-label">
                    Resolution
                    <textarea rows={2} maxLength={1000} value={draft(r.id).resolution}
                      onChange={(e) => setDraft(r.id, { resolution: e.target.value })} />
                  </label>
                  <label className="settings-check">
                    <input type="checkbox" checked={draft(r.id).cancel} onChange={(e) => setDraft(r.id, { cancel: e.target.checked })} />
                    <span>Also cancel this donation (when resolving)</span>
                  </label>
                  <div className="admin-actions">
                    <button type="button" className="workspace-table-action" disabled={busy === r.id} onClick={() => close(r, "resolved")}>Resolve</button>
                    <button type="button" className="workspace-table-action" disabled={busy === r.id} onClick={() => close(r, "dismissed")}>Dismiss</button>
                  </div>
                </>
              ) : (
                <p><strong>{status === "resolved" ? "Resolved" : "Dismissed"} {when(r.resolved_at)}:</strong> {r.resolution}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
