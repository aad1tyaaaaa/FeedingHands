import { useCallback, useEffect, useState } from "react";
import { FaBoxOpen, FaHeart, FaHandHoldingHeart, FaInfoCircle, FaLock, FaRupeeSign, FaSnowflake, FaTruck, FaUsers } from "react-icons/fa";
import "./PersonaTheme.css";
import "./FundraisingPage.css";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import Illustration from "./Illustration";

const PRESETS = [250, 500, 1000, 2500];
const MAX_AMOUNT = 500000; // the API's per-payment limit, in rupees
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const USES = [
  [FaTruck, "Transport", "Getting pickups to NGOs while the food is fresh."],
  [FaBoxOpen, "Packaging", "Clean, sealed containers for every meal."],
  [FaSnowflake, "Cold storage", "Keeping perishables safe until they're delivered."],
];

// Razorpay's checkout script is only fetched when someone actually pays.
let razorpayScript = null;
function loadRazorpay() {
  razorpayScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      razorpayScript = null; // let the next click retry
      script.remove();
      reject(new Error("Couldn't open the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return razorpayScript;
}

// With Razorpay configured on the API this takes real payments (order -> checkout -> server-side signature check).
// Without it, the page stays a clearly labelled demo: a pledge is noted on screen and no money moves.
const FundraisingPage = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null); // null while loading
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // {amount, demo}

  const loadMine = useCallback(() => {
    // "created" = checkout opened but never paid (abandoned or still being confirmed), so not listed
    apiFetch("/api/payments/mine").then((data) => setMine((data.payments || []).filter((p) => p.status !== "created"))).catch(() => {});
  }, []);

  const loadStats = useCallback(() => {
    apiFetch("/api/stats").then((data) => setStats(data.totals)).catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
    apiFetch("/api/payments/config")
      .then((data) => setConfig(data))
      .catch(() => setConfig({ enabled: false }));
  }, [loadStats]);

  useEffect(() => {
    if (config?.enabled) loadMine();
  }, [config, loadMine]);

  const value = custom ? Number(custom) : amount;
  const valid = Number.isInteger(value) && value >= 1 && value <= MAX_AMOUNT;
  const live = Boolean(config?.enabled);

  const pay = async () => {
    setBusy(true);
    try {
      const order = await apiFetch("/api/payments/order", { method: "POST", body: JSON.stringify({ amount: value }) });
      const Razorpay = await loadRazorpay();
      const checkout = new Razorpay({
        key: order.keyId || config.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "FeedingHands",
        description: "Donation to FeedingHands",
        prefill: { name: user.fullName, email: user.email },
        theme: { color: "#ff6b2c" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (res) => {
          try {
            const { payment } = await apiFetch("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
              }),
            });
            setDone({ amount: payment?.amount ?? value, demo: false });
            loadStats();
          } catch (err) {
            setError(`Your payment went through, but we couldn't confirm it yet (${err.message}). It will appear below once confirmed.`);
          } finally {
            loadMine();
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", (res) => setError(res.error?.description || "The payment failed. You have not been charged."));
      checkout.open();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setError("");
    if (live) pay();
    else setDone({ amount: value, demo: true });
  };

  return (
    <div className="fh-theme fundraising-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fundraising-container fh-page">
        <div className="fundraising-hero">
          <Illustration name="hero-fundraising" className="fh-hero-art" />
          <div className="hero-content">
            <span className="fh-chip">{config && !live ? "Fundraiser · Demo, no payment taken" : "Fundraiser"}</span>
            <h1 className="fh-title">
              Nourish Lives Through Your <em>Generosity</em> <FaHeart aria-hidden="true" />
            </h1>
            <p>Funds pay for transport, packaging and cold storage, so more food reaches people in need.</p>
          </div>
        </div>

        <div className="impact-stats">
          {stats?.raisedRupees > 0 && (
            <div className="stat-card">
              <FaRupeeSign className="stat-icon" aria-hidden="true" />
              <h3>{inr(stats.raisedRupees)}</h3>
              <p>Raised so far</p>
            </div>
          )}
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

        <div className="donation-content">
          {done ? (
            <div className="success-message fh-card" role="status">
              <FaHeart className="success-icon" aria-hidden="true" />
              <h2>Thank you, {user.fullName.split(" ")[0]}!</h2>
              {done.demo ? (
                <p>
                  Demo: we've noted your {inr(done.amount)} pledge on this screen only. Online payments aren't switched on
                  yet, so no money was taken.
                </p>
              ) : (
                <p>We've received your {inr(done.amount)} contribution. A receipt is on its way to your email.</p>
              )}
              <button type="button" className="fh-btn" onClick={() => setDone(null)}>
                {done.demo ? "Make another pledge" : "Give again"}
              </button>
            </div>
          ) : (
            <form className="donation-form fh-card" onSubmit={handleSubmit}>
              <h2>Choose an amount</h2>
              <div className="preset-amounts">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    aria-pressed={!custom && amount === p}
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
              <label className="fh-label" htmlFor="custom-amount">Or enter your own amount</label>
              <div className={`custom-amount ${custom ? "active" : ""}`}>
                <span aria-hidden="true">₹</span>
                <input
                  id="custom-amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={MAX_AMOUNT}
                  step="1"
                  placeholder="e.g. 750"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </div>
              {custom && !valid && <p className="form-error" role="alert">Enter a whole number of rupees from 1 to {inr(MAX_AMOUNT)}.</p>}
              {error && <p className="form-error" role="alert">{error}</p>}

              <button type="submit" className="donate-btn fh-btn" disabled={!config || !valid || busy}>
                {busy ? "Opening payment…" : `${live ? "Donate" : "Pledge (demo)"} ${valid ? inr(value) : ""}`}
              </button>

              <p className="security-info">
                {live ? <FaLock aria-hidden="true" /> : <FaInfoCircle aria-hidden="true" />}
                <span>
                  {!config
                    ? "Checking payment options…"
                    : live
                      ? "Secure payment by Razorpay (UPI, cards, netbanking). FeedingHands never sees your card or UPI details."
                      : "Demo mode: online payments aren't switched on yet. No payment is taken and no card details are collected."}
                </span>
              </p>
            </form>
          )}

          <aside className="fundraising-side">
            <section className="fh-card fundraising-uses" aria-label="Where your money goes">
              <h2>Where it goes</h2>
              <ul>
                {USES.map(([Icon, title, text]) => (
                  <li key={title}>
                    <Icon className="use-icon" aria-hidden="true" />
                    <div>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {live && mine.length > 0 && (
              <section className="fh-card fundraising-history" aria-label="Your contributions">
                <h2>Your contributions</h2>
                <ul>
                  {mine.map((p) => (
                    <li key={p.id}>
                      <strong>{inr(p.amount)}</strong>
                      <span>{day(p.paid_at || p.created_at)}</span>
                      <span className={`status-pill ${p.status === "paid" ? "delivered" : p.status === "failed" ? "cancelled" : "available"}`}>
                        {p.status === "paid" ? "Paid" : p.status === "failed" ? "Failed" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FundraisingPage;
