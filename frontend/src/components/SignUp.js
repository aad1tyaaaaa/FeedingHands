import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SignIn.css"; // shares the sign-in page layout, frame and form styles
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";

function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession } = useAuth();
  // Arriving from sign-in with an unverified account skips straight to the code step.
  const verifyEmail = location.state?.verifyEmail || "";
  const [formData, setFormData] = useState({
    fullName: "",
    email: verifyEmail,
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [code, setCode] = useState("");
  const [step, setStep] = useState(verifyEmail ? "verify" : "details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(verifyEmail ? "Your email isn't verified yet. Request a code below." : "");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validate = () => {
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    if (formData.password.length < 8) return "Password must be at least 8 characters";
    if (formData.phone && !/^\+[1-9]\d{6,14}$/.test(formData.phone.trim()))
      return "Phone must be in international format, e.g. +919876543210";
    return "";
  };

  // In development the API returns the code so you can test without an inbox.
  const showDevCode = (data) => data?.otp && setNotice(`Development code: ${data.otp}`);

  const handleSignUp = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        }),
      });
      setStep("verify");
      setNotice(data.message);
      showDevCode(data);
    } catch (err) {
      setError(err.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim(), token: code.trim() }),
      });
      startSession(data);
      navigate("/role-selection", { replace: true });
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      setNotice(data.message);
      showDevCode(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-panel">
        <div className="signin-container">
          <img className="signin-logo" src="/logo/logo-with-text.png" alt="FeedingHands" />
          {step === "verify" && <Illustration name="otp-phone" className="signin-art" />}
          <h2>{step === "verify" ? "Verify Email" : "Create Account"}</h2>
          <p className="signin-subtitle">
            {step === "verify"
              ? `Enter the 6-digit code sent to ${formData.email}.`
              : "Join FeedingHands and start sharing food today."}
          </p>
          {notice && <div className="signin-footer" role="status">{notice}</div>}

          {step === "details" ? (
            <form onSubmit={handleSignUp}>
              {error && <div className="error-message" role="alert">{error}</div>}
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input type="text" id="fullName" name="fullName" placeholder="Your full name" autoComplete="name"
                  value={formData.fullName} onChange={handleChange} required maxLength={200} />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@example.com" autoComplete="email"
                  value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone (optional)</label>
                <input type="tel" id="phone" name="phone" placeholder="+919876543210" autoComplete="tel"
                  value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" placeholder="At least 8 characters"
                  autoComplete="new-password" value={formData.password} onChange={handleChange} required
                  minLength={8} maxLength={72} />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Re-enter your password"
                  autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Sign Up"}</button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              {error && <div className="error-message" role="alert">{error}</div>}
              {verifyEmail && (
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="verificationCode">Verification Code</label>
                <input type="text" id="verificationCode" inputMode="numeric" autoComplete="one-time-code"
                  pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify"}</button>
              <p className="signin-switch">
                Didn't get it?{" "}
                <button type="button" className="signin-link-button" onClick={handleResend} disabled={loading}>
                  Resend code
                </button>
              </p>
            </form>
          )}
          <p className="signin-switch">
            Already have an account? <Link to="/sign-in" viewTransition>Sign in</Link>
          </p>
        </div>
      </div>
      <video className="signin-video" src="/FeedingHands_personas_brand.mp4" autoPlay muted loop playsInline aria-hidden="true" />
    </div>
  );
}

export default SignUp;
