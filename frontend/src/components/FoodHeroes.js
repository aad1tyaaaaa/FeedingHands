import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Building2, Crown, Flame, HandHeart, Medal, Trophy, Users } from "lucide-react";
import WorkspaceMetric from "./WorkspaceMetric";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import "./PersonaTheme.css";
import "./FoodHeroes.css";
import Illustration from "./Illustration";

const PLACES = [
  { label: "1st", icon: Crown, tone: "gold" },
  { label: "2nd", icon: Medal, tone: "silver" },
  { label: "3rd", icon: Medal, tone: "bronze" },
];

// Leaderboard by Puniya points (first names only), earned when a donor's food is delivered.
const FoodHeroes = () => {
  const { user, refresh } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
    apiFetch("/api/stats").then(setStats).catch((err) => setError(err.message));
  }, [refresh]);

  const heroes = stats?.top_donors || [];
  const top = heroes[0]?.points || 1;
  const points = user.points || 0;
  // Rank among the top ten by points (ties share a place); outside it, no rank to show.
  const rank = points > 0 && heroes.some((h) => h.points <= points) ? heroes.filter((h) => h.points > points).length + 1 : null;
  const podium = heroes.slice(0, 3);
  const rest = heroes.slice(3);
  const totals = stats?.totals;

  return (
    <div className="heroes-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Food heroes</h1>
          <p>Donors whose food reached people in need. Every delivered donation earns 10 Puniya points.</p>
        </div>
        <Illustration name="hero-leaderboard" className="workspace-heading-art" />
        <Link className="workspace-primary" to="/Donate"><HandHeart size={17} /> Donate food</Link>
      </section>

      {error && <p className="workspace-panel" role="alert">{error}</p>}

      <section className="workspace-metrics" aria-label="Your standing">
        <WorkspaceMetric hero index={0} icon={Award} pose="peeking" label="Your points" value={points} hint="10 per delivered donation" />
        <WorkspaceMetric index={1} icon={Trophy} label="Your rank" value={rank ?? 0} hint={rank ? `of the top ${heroes.length} heroes` : "Get a donation delivered to join the board"} />
        <WorkspaceMetric index={2} icon={Flame} pose="chin-wave" label="Delivered on FeedingHands" value={totals?.delivered ?? 0} hint="donations that reached a kitchen" />
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-heading"><h2>Leaderboard</h2></div>
        {!stats ? (
          <p className="workspace-empty" role="status">Loading…</p>
        ) : heroes.length === 0 ? (
          <div className="workspace-empty">
            <Illustration name="team-banner" className="workspace-empty-art" />
            <p>No deliveries yet. Be the first food hero!</p>
            <Link className="workspace-secondary" to="/Donate">Make a donation</Link>
          </div>
        ) : (
          <>
            <ol className="heroes-podium">
              {podium.map((h, i) => {
                const { label, icon: Icon, tone } = PLACES[i];
                return (
                  <li key={`${h.name}-${i}`} className={`heroes-place ${tone}`}>
                    <span className="heroes-place-badge"><Icon size={16} /> {label}</span>
                    <span className="heroes-avatar" aria-hidden="true">{h.name.charAt(0).toUpperCase()}</span>
                    <strong className="heroes-name">{h.name}</strong>
                    <span className="heroes-points">{h.points} points</span>
                    <span className="heroes-step" aria-hidden="true" />
                  </li>
                );
              })}
            </ol>

            {rest.length > 0 && (
              <ol className="heroes-list" start={4}>
                {rest.map((h, i) => (
                  <li key={`${h.name}-${i}`}>
                    <span className="heroes-rank">{i + 4}</span>
                    <span className="heroes-avatar small" aria-hidden="true">{h.name.charAt(0).toUpperCase()}</span>
                    <strong>{h.name}</strong>
                    <span className="heroes-bar" aria-hidden="true"><span style={{ width: `${(h.points / top) * 100}%` }} /></span>
                    <span className="heroes-list-points">{h.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>

      {totals && (
        <section className="workspace-panel">
          <div className="workspace-panel-heading"><h2>Community impact</h2></div>
          <div className="heroes-impact">
            <div><HandHeart size={20} /><strong>{totals.delivered}</strong><span>donations delivered</span></div>
            <div><Users size={20} /><strong>{totals.volunteers}</strong><span>volunteers</span></div>
            <div><Building2 size={20} /><strong>{totals.organizations}</strong><span>partner NGOs</span></div>
            <div><Flame size={20} /><strong>{totals.biogas_collected}</strong><span>waste pickups turned into biogas</span></div>
          </div>
        </section>
      )}
    </div>
  );
};

export default FoodHeroes;
