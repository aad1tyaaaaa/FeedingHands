import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./SignIn.css";
import { apiFetch } from "../api/client";
import { homeFor, useAuth } from "./AuthContext";

function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, startSession } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) return <Navigate to={location.state?.from || homeFor(user)} replace />;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });
      const signedIn = startSession(data);
      navigate(location.state?.from || homeFor(signedIn), { replace: true });
    } catch (err) {
      if (err.data?.code === "unverified") {
        navigate("/sign-up", { state: { verifyEmail: formData.email.trim() } });
        return;
      }
      setError(err.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-panel">
        <div className="signin-container">
          <img className="signin-logo" src="/logo/logo-with-text.png" alt="FeedingHands" />
          <h2>Sign In</h2>
          <p className="signin-subtitle">Welcome back! Sign in to keep feeding hands.</p>
          {location.state?.message && <div className="signin-footer" role="status">{location.state.message}</div>}
          <form onSubmit={handleSignIn}>
            {error && <div className="error-message" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="signin-switch">
            New to FeedingHands? <Link to="/sign-up" viewTransition>Create an account</Link>
          </p>
        </div>
      </div>
      <video
        className="signin-video"
        src="/FeedingHands_personas_brand.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    </div>
  );
}

export default SignIn;
