import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Route,
  ScanSearch,
  Truck,
  X,
} from "lucide-react";
import "./PersonaDashboardShell.css";

const WORKSPACES = {
  donor: {
    label: "Food donor",
    home: "/dashboard",
    links: [
      { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
      { label: "Donate food", to: "/Donate", icon: HandHeart },
      { label: "Donation tracking", to: "/Tracking", icon: ClipboardList },
      { label: "Freshness check", to: "/ImageRecognition", icon: ScanSearch },
      { label: "Food learning", to: "/LearnerCorner", icon: BookOpen },
      { label: "Food heroes", to: "/FoodHeroes", icon: Award },
    ],
  },
  volunteer: {
    label: "Volunteer",
    home: "/VolunteerDashboard",
    links: [
      { label: "Overview", to: "/VolunteerDashboard", icon: LayoutDashboard },
      { label: "Volunteer map", to: "/VolunteerMap", icon: Map },
      { label: "Delivery progress", to: "/DeliveryTrackingPage", icon: Truck },
      { label: "Donation tracking", to: "/Tracking", icon: ClipboardList },
      { label: "Food learning", to: "/LearnerCorner", icon: BookOpen },
    ],
  },
  organization: {
    label: "Organization",
    home: "/NgoDashboard",
    links: [
      { label: "Overview", to: "/NgoDashboard", icon: LayoutDashboard },
      { label: "Donation tracking", to: "/NgoTracking", icon: ClipboardList },
      { label: "Route planning", to: "/Route_Optimization", icon: Route },
      { label: "Event forecast", to: "/Event_prediction", icon: CalendarDays },
      { label: "Organization profile", to: "/KnowYourNgo", icon: Building2 },
      { label: "Community activity", to: "/Tracking", icon: Activity },
    ],
  },
};

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("fh_user") || "null");
  } catch {
    return null;
  }
}

const hasPath = (role, path) => WORKSPACES[role].links.some((link) => link.to.toLowerCase() === path.toLowerCase());

// Layout route: every in-app page renders inside this shell via <Outlet />.
// Role = signed-in persona when it owns this page, else the workspace that owns it, else donor.
function PersonaDashboardShell() {
  const { pathname } = useLocation();
  const user = readUser();
  const role = WORKSPACES[user?.role] && (hasPath(user.role, pathname) || !Object.keys(WORKSPACES).some((r) => hasPath(r, pathname)))
    ? user.role
    : Object.keys(WORKSPACES).find((r) => hasPath(r, pathname)) || "donor";
  const workspace = WORKSPACES[role];
  const displayName = user?.fullName || user?.name || workspace.label;
  const title = workspace.links.find((link) => link.to.toLowerCase() === pathname.toLowerCase())?.label
    || pathname.replace(/^\//, "").replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("fh_user");
    navigate("/persona-login", { replace: true });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // One shared pill that glides to whichever link is active.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector(".is-active");
    if (!nav) return;
    nav.style.setProperty("--pill-y", `${active ? active.offsetTop : 0}px`);
    nav.style.setProperty("--pill-h", `${active ? active.offsetHeight : 0}px`);
    nav.classList.toggle("has-active", Boolean(active));
  }, [pathname, role]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  return (
    <div className={`fh-theme fh-workspace theme-${role}`}>
      <aside className={`workspace-sidebar${mobileOpen ? " is-open" : ""}`} aria-label="Workspace navigation">
        <Link className="workspace-brand" to={workspace.home} onClick={() => setMobileOpen(false)}>
          <img src="/logo/logo-with-text.png" alt="FeedingHands" />
        </Link>

        <p className="workspace-nav-label">Workspace</p>
        <nav className="workspace-nav" ref={navRef}>
          {workspace.links.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={`${label}-${to}`}
              to={to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `workspace-nav-link${isActive ? " is-active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="workspace-sidebar-foot">
          <span className="workspace-status-dot" aria-hidden="true" />
          <div>
            <strong>FeedingHands</strong>
            <span>{workspace.label} workspace</span>
          </div>
        </div>

        <button className="workspace-logout" type="button" onClick={logout}>
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </aside>

      {mobileOpen && (
        <button
          className="workspace-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-start">
            <button
              className="workspace-menu-toggle"
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="workspace-page-name">{title}</span>
          </div>
          <div className="workspace-identity">
            <div className="workspace-identity-copy">
              <strong>{displayName}</strong>
              <span>{workspace.label}</span>
            </div>
            <span className="workspace-avatar" aria-hidden="true">
              {displayName.trim().charAt(0).toUpperCase() || "F"}
            </span>
          </div>
        </header>

        <main className="workspace-content">
          {/* keyed so the entrance transition replays on every navigation */}
          <div className="workspace-page" key={pathname}><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

export default PersonaDashboardShell;