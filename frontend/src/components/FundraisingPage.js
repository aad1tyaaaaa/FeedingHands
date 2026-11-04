import { useEffect, useState } from "react";
import { FaHeart, FaHandHoldingHeart, FaInfoCircle, FaUsers } from "react-icons/fa";
import "./PersonaTheme.css";
import "./FundraisingPage.css";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";

const PRESETS = [500, 1000, 2500];
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Demo fundraiser: the full pledge flow, but no money moves and no card details are ever asked for.
// Real payments (Razorpay order + webhook verification) are a separate, later phase.
const FundraisingPage = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [pledged, setPledged] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/api/stats").then((data) => setStats(data.totals)).catch(() => {});
  }, []);

  const value = custom ? Number(custom) : amount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value || value < 1) return;
    setPledged(value);
  };

  return (
    <div className="fh-theme fundraising-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fundraising-container fh-page">
        <div className="fundraising-hero">
          <Illustration name="hero-fundraising" className="fh-hero-art" />
          <div className="hero-content">
            <span className="fh-chip">Fundraiser · Demo</span>
            <h1 className="fh-title">
              Nourish Lives Through Your <em>Generosity</em> <FaHeart aria-hidden="true" />
            </h1>
            <p>Funds pay for transport, packaging and cold storage, so more food reaches people in need.</p>
          </div>
        </div>

        <div className="donation-content">
          <div className="impact-stats">
            <div className="stat-card">
              <FaHandHoldingHeart className="stat-icon" aria-hidden="true" />
              <h3>{stats ? stats.delivered : "—"}</h3>
              <p>Donations delivered</p>
            </div>
            <div className="stat-card">
              <FaUsers className="stat-icon" aria-hidden="true" />
              <h3>{stats ? stats.volunteers : "—"}</h3>
              <p>Volunteers</p>
            </div>
          </div>

          {pledged ? (
            <div className="success-message fh-card" role="status">
              <h2>Thank you, {user.fullName.split(" ")[0]}!</h2>
              <p>
                We've noted your {inr(pledged)} pledge. Online payments aren't live yet. We'll email you when you can
                complete it.
              </p>
              <button type="button" className="fh-btn" onClick={() => setPledged(null)}>Make another pledge</button>
            </div>
          ) : (
            <form className="donation-form fh-card" onSubmit={handleSubmit}>
              <div className="amount-selection">
                <h2>Choose an amount</h2>
                <div className="preset-amounts">
                  {PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={`amount-btn ${!custom && amount === p ? "selected" : ""}`}
                      onClick={() => {
                        setAmount(p);
                        setCustom("");
                      }}
                    >
                      {inr(p)}
                    </button>
                  ))}
                </div>
                <div className="custom-amount">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Other amount in rupees"
                    placeholder="Other amount"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <span className="fh-label">Rupees</span>
                </div>
              </div>

              <div className="security-info">
                <FaInfoCircle className="lock-icon" aria-hidden="true" />
                <span>Demo mode: no payment is taken and no card details are collected.</span>
              </div>

              <button type="submit" className="donate-btn fh-btn" disabled={!value || value < 1}>
                Pledge {value ? inr(value) : ""}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundraisingPage;
