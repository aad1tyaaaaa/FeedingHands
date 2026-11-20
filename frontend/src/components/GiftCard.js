import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Copy, Gift, Lock, Sparkles } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../api/client";
import "./PersonaTheme.css";
import "./GiftCard.css";
import Illustration from "./Illustration";

// Rewards unlock as Puniya points grow (10 points per delivered donation).
const TIERS = [
  { points: 10, name: "Seedling", reward: "₹100 off groceries", partner: "Local kirana partners", tone: "seedling" },
  { points: 50, name: "Sprout", reward: "₹500 bulk grocery voucher", partner: "Wholesale partners", tone: "sprout" },
  { points: 100, name: "Harvest", reward: "₹1,000 kitchen supplies", partner: "Kitchenware partners", tone: "harvest" },
];

// reward is the server's row for this tier ({code, unlocked, redeemed_at}); codes are issued by the API.
function RewardCard({ tier, points, reward }) {
  const unlocked = reward ? reward.unlocked : points >= tier.points;
  const code = reward?.code;
  const redeemed = Boolean(reward?.redeemed_at);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked: the code is on screen to copy by hand
    }
  };

  return (
    <article className={`reward ${tier.tone}${unlocked ? "" : " is-locked"}${redeemed ? " is-redeemed" : ""}`}>
      <div className={`reward-card${flipped ? " is-flipped" : ""}`}>
        <div className="reward-face reward-front" aria-hidden={flipped}>
          <div className="reward-top">
            <span className="reward-brand"><Gift size={16} /> FeedingHands</span>
            <span className="reward-tier">{tier.name}</span>
          </div>
          <span className="reward-chip" aria-hidden="true" />
          <div className="reward-bottom">
            <strong>{tier.reward}</strong>
            <span>{tier.partner}</span>
          </div>
          {!unlocked && (
            <div className="reward-lock">
              <Lock size={22} />
              <span>{tier.points - points} more points</span>
            </div>
          )}
        </div>
        <div className="reward-face reward-back" aria-hidden={!flipped}>
          <span className="reward-back-label">Your code</span>
          <code className="reward-code">{code || "Issuing…"}</code>
          {code && !redeemed && (
            <button type="button" className="reward-copy" onClick={copy} tabIndex={flipped ? 0 : -1}>
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
            </button>
          )}
          <span className="reward-demo">
            {redeemed ? `Redeemed on ${new Date(reward.redeemed_at).toLocaleDateString()}` : "Show this code at a partner store"}
          </span>
        </div>
      </div>

      <div className="reward-meta">
        <div>
          <strong>{tier.points} points</strong>
          <span>{redeemed ? "Redeemed" : unlocked ? "Unlocked" : `${Math.min(100, Math.round((points / tier.points) * 100))}% there`}</span>
        </div>
        {unlocked ? (
          <button type="button" className="workspace-secondary" onClick={() => setFlipped((f) => !f)}>
            {flipped ? "Hide code" : <><Sparkles size={15} /> Reveal</>}
          </button>
        ) : (
          <span className="reward-progress" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (points / tier.points) * 100)}%` }} />
          </span>
        )}
      </div>
    </article>
  );
}

const GiftCard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null); // {points, rewards}
  const [error, setError] = useState("");

  // The server is the source of truth for points and codes (it issues a code when a tier unlocks).
  useEffect(() => {
    apiFetch("/api/rewards")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const points = data?.points ?? user.points ?? 0;
  const rewardFor = (tier) => data?.rewards?.find((r) => r.tier === tier.points || r.name === tier.name);
  const next = TIERS.find((t) => points < t.points);
  const unlocked = TIERS.filter((t) => points >= t.points).length;

  return (
    <div className="giftcard-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Gift cards</h1>
          <p>Every delivered donation earns 10 Puniya points. Collect enough and partner stores say thank you too.</p>
        </div>
        <Illustration name="hero-gift" className="workspace-heading-art" />
        <Link className="workspace-primary" to="/donate"><Gift size={17} /> Earn more points</Link>
      </section>

      <section className="workspace-metrics" aria-label="Your rewards">
        <WorkspaceMetric hero index={0} icon={Award} pose="donor-wave" label="Puniya points" value={points} hint="10 per delivered donation" />
        <WorkspaceMetric index={1} icon={Gift} pose="pull-up" label="Rewards unlocked" value={unlocked} share={unlocked / TIERS.length} shareOf={`${TIERS.length} rewards`} />
        <WorkspaceMetric
          index={2}
          icon={Sparkles}
          label="Next reward"
          value={next ? next.points - points : 0}
          hint={next ? `points to ${next.name}: ${next.reward}` : "Every reward unlocked. Thank you!"}
        />
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-heading">
          <h2>Your rewards</h2>
          <span className="reward-note">Partner stores confirm each code with the FeedingHands team</span>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="reward-grid">
          {TIERS.map((tier) => (
            <RewardCard key={tier.name} tier={tier} points={points} reward={rewardFor(tier)} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default GiftCard;
