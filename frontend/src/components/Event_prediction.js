import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./PersonaTheme.css";
import "./Event_prediction.css";
import { apiFetch } from "../api/client";
import { forecast } from "../api/forecast.mjs";
import Illustration from "./Illustration";

const AHEAD = 4;
const label = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// Expected donations for the next weeks, from the platform's own last 12 weeks, so NGOs can plan
// kitchen staff and storage.
function Event_prediction() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/stats").then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="fh-theme theme-organization event-prediction"><p className="fh-page" role="alert">{error}</p></div>;
  if (!stats) return <div className="fh-theme theme-organization event-prediction"><p className="loading">Loading forecast…</p></div>;

  const history = stats.weekly.map((w) => ({ week: label(w.week), donations: w.donations, forecast: false }));
  const lastMonday = new Date(`${stats.weekly.at(-1).week}T00:00:00`);
  const projected = forecast(stats.weekly.map((w) => w.donations), AHEAD).map((value, i) => {
    const d = new Date(lastMonday);
    d.setDate(d.getDate() + 7 * (i + 1));
    return { week: label(d.toISOString().slice(0, 10)), donations: value, forecast: true };
  });
  const data = [...history, ...projected];
  const nextWeek = projected[0].donations;
  const recentAvg = history.slice(-4).reduce((a, w) => a + w.donations, 0) / 4;

  return (
    <div className="fh-theme theme-organization event-prediction">
      <div className="fh-blob" aria-hidden="true" />
      <div className="app-container fh-page">
        <Illustration name="planner-person" className="fh-hero-art" />
        <h1 className="fh-title">Donation forecast</h1>

        <div className="stats-container">
          <div className="fh-card"><p className="fh-label">Expected next week</p><h2>{nextWeek}</h2></div>
          <div className="fh-card"><p className="fh-label">Average, last 4 weeks</p><h2>{recentAvg.toFixed(1)}</h2></div>
          <div className="fh-card"><p className="fh-label">Delivered so far</p><h2>{stats.totals.delivered}</h2></div>
        </div>

        <div className="chart-container fh-card">
          <div className="forecast-scroll" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="#ebe5fb" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#5d5672", fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8a8499", fontSize: 12 }} />
                <Tooltip formatter={(v, _n, p) => [v, p.payload.forecast ? "Forecast" : "Donations"]} />
                <Bar dataKey="donations" radius={[8, 8, 0, 0]} maxBarSize={34}>
                  {data.map((d, i) => <Cell key={i} fill={d.forecast ? "var(--pop)" : "var(--accent)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="footer">
          <p className="fh-label">Purple: actual donations per week · Pink: forecast from the 12-week trend</p>
        </div>
      </div>
    </div>
  );
}

export default Event_prediction;
