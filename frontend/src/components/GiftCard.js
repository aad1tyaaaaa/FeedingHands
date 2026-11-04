import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Copy, Gift, Lock, Sparkles } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { useAuth } from "./AuthContext";
import "./PersonaTheme.css";
import "./GiftCard.css";
import Illustration from "./Illustration";

// Rewards unlock as Puniya points grow (10 points per delivered donation).
const TIERS = [
  { points: 10, name: "Seedling", reward: "₹100 off groceries", partner: "Local kirana partners", tone: "seedling" },
  { points: 50, name: "Sprout", reward: "₹500 bulk grocery voucher", partner: "Wholesale partners", tone: "sprout" },
  { points: 100, name: "Harvest", reward: "₹1,000 kitchen supplies", partner: "Kitchenware partners", tone: "harvest" },
];

// A stable demo code per user and tier, so the same card always shows the same code.
function demoCode(userId, tier) {
  let h = 2166136261;
  for (const ch of `${userId}:${tier.points}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const s = (h >>> 0).toString(36).toUpperCase().padStart(7, "0");
  return `FH-${tier.name.slice(0, 3).toUpperCase()}-${s.slice(0, 4)}-${s.slice(4, 7)}`;
}

function RewardCard({ tier, points, userId }) {
  const unlocked = points >= tier.points;
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = demoCode(userId, tier);

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
    <article className={`reward ${tier.tone}${unlocked ? "" : " is-locked"}`}>
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
          <code className="reward-code">{code}</code>
          <button type="button" className="reward-copy" onClick={copy} tabIndex={flipped ? 0 : -1}>
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
          </button>
          <span className="reward-demo">Demo code: not redeemable yet</span>
        </div>
      </div>

      <div className="reward-meta">
        <div>
          <strong>{tier.points} points</strong>
          <span>{unlocked ? "Unlocked" : `${Math.min(100, Math.round((points / tier.points) * 100))}% there`}</span>
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
  const { user, refresh } = useAuth();

  useEffect(() => {
    refresh(); // points change when a volunteer delivers
  }, [refresh]);

  const points = user.points || 0;
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
        <Link className="workspace-primary" to="/Donate"><Gift size={17} /> Earn more points</Link>
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
          <span className="reward-note">Demo: codes aren't redeemable yet</span>
        </div>
        <div className="reward-grid">
          {TIERS.map((tier) => (
            <RewardCard key={tier.name} tier={tier} points={points} userId={user.id} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default GiftCard;
