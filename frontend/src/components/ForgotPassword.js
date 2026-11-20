import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignIn.css"; // shares the sign-in page layout, frame and form styles
import { apiFetch } from "../api/client";
import { homeFor, useAuth } from "./AuthContext";
import Illustration from "./Illustration";

// Two steps: ask for a code by email, then set a new password with it (which also signs you in).
function ForgotPassword() {
  const navigate = useNavigate();
  const { startSession } = useAuth();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestCode = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setStep("reset");
      // In development the API returns the code so you can test without an inbox.
      setNotice(data?.otp ? `Development code: ${data.otp}` : data?.message || "If that account exists, we've emailed it a code.");
    } catch (err) {
      setError(err.message || "Couldn't send a code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), token: code.trim(), password }),
      });
      navigate(homeFor(startSession(data)), { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't reset your password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-panel">
        <div className="signin-container">
          <img className="signin-logo" src="/logo/logo-with-text.png" alt="FeedingHands" />
          <Illustration name={step === "reset" ? "hero-email" : "shield-lock"} className="signin-art signin-art--wide" />
          <h2>{step === "reset" ? "Set a New Password" : "Forgot Password"}</h2>
          <p className="signin-subtitle">
            {step === "reset"
              ? `Enter the 6-digit code sent to ${email} and choose a new password.`
              : "Enter your account email and we'll send you a reset code."}
          </p>
          {notice && <div className="signin-footer" role="status">{notice}</div>}

          {step === "email" ? (
            <form onSubmit={requestCode}>
              {error && <div className="error-message" role="alert">{error}</div>}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="you@example.com" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset code"}</button>
            </form>
          ) : (
            <form onSubmit={resetPassword}>
              {error && <div className="error-message" role="alert">{error}</div>}
              <div className="form-group">
                <label htmlFor="resetCode">Reset Code</label>
                <input type="text" id="resetCode" inputMode="numeric" autoComplete="one-time-code"
                  pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input type="password" id="newPassword" placeholder="At least 8 characters" autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" placeholder="Re-enter your new password" autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? "Saving..." : "Reset password"}</button>
              <p className="signin-switch">
                Didn't get it?{" "}
                <button type="button" className="signin-link-button" onClick={() => requestCode()} disabled={loading}>
                  Resend code
                </button>
              </p>
            </form>
          )}
          <p className="signin-switch">
            Remembered it? <Link to="/sign-in" viewTransition>Sign in</Link>
          </p>
        </div>
      </div>
      <video className="signin-video" src="/FeedingHands_personas_brand.mp4" autoPlay muted loop playsInline aria-hidden="true" />
    </div>
  );
}

export default ForgotPassword;
