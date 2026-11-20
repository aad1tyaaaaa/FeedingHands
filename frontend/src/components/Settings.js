import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";

// One form's busy / error / success state, so each section reports on itself.
function useAction() {
  const [state, setState] = useState({ busy: false, error: "", notice: "" });
  const run = async (fn, notice) => {
    setState({ busy: true, error: "", notice: "" });
    try {
      await fn();
      setState({ busy: false, error: "", notice });
    } catch (err) {
      setState({ busy: false, error: err.message || "Something went wrong. Please try again.", notice: "" });
    }
  };
  const fail = (error) => setState({ busy: false, error, notice: "" });
  return [state, run, fail];
}

function Status({ state }) {
  if (state.error) return <p className="settings-error" role="alert">{state.error}</p>;
  if (state.notice) return <p className="settings-notice" role="status">{state.notice}</p>;
  return null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, refresh, startSession, logout } = useAuth();

  const [profile, setProfile] = useState({ fullName: user.fullName || "", phone: user.phone || "" });
  const [profileState, runProfile, failProfile] = useAction();
  const [notify, setNotify] = useState(user.emailNotifications !== false);
  const [notifyState, runNotify] = useAction();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwState, runPw, failPw] = useAction();
  const [del, setDel] = useState({ password: "", typed: "" });
  const [delState, runDel] = useAction();

  const patchMe = (body) => apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify(body) }).then(refresh);

  const saveProfile = (e) => {
    e.preventDefault();
    const phone = profile.phone.trim();
    if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) return failProfile("Phone must be in international format, e.g. +919876543210");
    runProfile(() => patchMe({ fullName: profile.fullName.trim(), phone }), "Profile saved.");
  };

  const toggleNotify = (e) => {
    const on = e.target.checked;
    setNotify(on);
    runNotify(
      () => patchMe({ emailNotifications: on }).catch((err) => { setNotify(!on); throw err; }),
      on ? "You'll get donation updates by email." : "Donation update emails are off.",
    );
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return failPw("New password must be at least 8 characters");
    if (pw.next !== pw.confirm) return failPw("New passwords do not match");
    runPw(async () => {
      const data = await apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      startSession(data); // the old token stops working once the password changes
      setPw({ current: "", next: "", confirm: "" });
    }, "Password changed. Other devices have been signed out.");
  };

  const deleteAccount = (e) => {
    e.preventDefault();
    runDel(async () => {
      await apiFetch("/api/auth/me", { method: "DELETE", body: JSON.stringify({ password: del.password }) });
      logout();
      navigate("/sign-in", { replace: true, state: { message: "Your account has been deleted." } });
    }, "");
  };

  return (
    <div className="settings-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Settings</h1>
          <p>Signed in as {user.email}. Manage your profile, emails, password and account.</p>
        </div>
      </section>

      <div className="settings-grid">
        <form className="workspace-panel settings-form" onSubmit={saveProfile}>
          <h2>Profile</h2>
          <label className="settings-label">
            Full name
            <input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              autoComplete="name" required maxLength={200} />
          </label>
          <label className="settings-label">
            Phone (optional)
            <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              autoComplete="tel" placeholder="+919876543210" />
          </label>
          <Status state={profileState} />
          <button type="submit" className="workspace-primary" disabled={profileState.busy}>
            {profileState.busy ? "Saving…" : "Save profile"}
          </button>
        </form>

        <section className="workspace-panel settings-form" aria-labelledby="settings-email-heading">
          <h2 id="settings-email-heading">Email notifications</h2>
          <label className="settings-check">
            <input type="checkbox" checked={notify} onChange={toggleNotify} disabled={notifyState.busy} />
            <span>Email me when a donation I'm part of is claimed, picked up or delivered, and about new food nearby.</span>
          </label>
          <p>Account emails (codes, receipts, verification decisions) are always sent.</p>
          <Status state={notifyState} />
        </section>

        <form className="workspace-panel settings-form" onSubmit={changePassword}>
          <h2>Change password</h2>
          <label className="settings-label">
            Current password
            <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })}
              autoComplete="current-password" required />
          </label>
          <label className="settings-label">
            New password
            <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })}
              autoComplete="new-password" required minLength={8} maxLength={72} />
          </label>
          <label className="settings-label">
            Confirm new password
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              autoComplete="new-password" required />
          </label>
          <Status state={pwState} />
          <button type="submit" className="workspace-primary" disabled={pwState.busy}>
            {pwState.busy ? "Saving…" : "Change password"}
          </button>
        </form>

        <form className="workspace-panel settings-form settings-danger" onSubmit={deleteAccount}>
          <h2>Delete account</h2>
          <p>
            This removes your login and profile for good. Donations you took part in stay in the records of the
            people who handled them, without your account attached.
          </p>
          <label className="settings-label">
            Password
            <input type="password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })}
              autoComplete="current-password" required />
          </label>
          <label className="settings-label">
            Type DELETE to confirm
            <input value={del.typed} onChange={(e) => setDel({ ...del, typed: e.target.value })} autoComplete="off" required />
          </label>
          <Status state={delState} />
          <button type="submit" className="workspace-primary" disabled={delState.busy || del.typed !== "DELETE"}>
            {delState.busy ? "Deleting…" : "Delete my account"}
          </button>
        </form>
      </div>
    </div>
  );
}
