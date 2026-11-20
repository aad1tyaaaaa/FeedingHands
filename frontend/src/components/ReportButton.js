import { useId, useState } from "react";
import { Flag } from "lucide-react";
import { apiFetch } from "../api/client";

// "Report a problem" on a donation: opens a small inline form that sends the reason to the admin team.
export default function ReportButton({ donationId }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const text = reason.trim();
    if (text.length < 10) return setError("Please describe the problem in at least 10 characters.");
    setSending(true);
    setError("");
    try {
      await apiFetch("/api/reports", { method: "POST", body: JSON.stringify({ donationId, reason: text }) });
      setSent(true);
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) return <p className="workspace-muted" role="status">Thanks, our team will review your report.</p>;

  if (!open) {
    return (
      <button type="button" className="workspace-table-action" onClick={() => setOpen(true)}>
        <Flag size={15} aria-hidden="true" /> Report a problem
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
      <label htmlFor={`${id}-reason`} style={{ fontWeight: 600 }}>What went wrong?</label>
      <textarea
        id={`${id}-reason`}
        rows={3}
        minLength={10}
        maxLength={1000}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. The food was spoiled on pickup, or nobody was at the address."
        aria-describedby={`${id}-count`}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
      />
      <small id={`${id}-count`} className="workspace-muted">{reason.length}/1000</small>
      {error && <p role="alert" style={{ margin: 0, color: "#b42318", fontWeight: 600 }}>{error}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="submit" className="workspace-table-action" disabled={sending}>{sending ? "Sending…" : "Send report"}</button>
        <button type="button" className="workspace-table-action" onClick={() => { setOpen(false); setError(""); }}>Cancel</button>
      </div>
    </form>
  );
}
