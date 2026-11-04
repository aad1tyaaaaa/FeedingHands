import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Flame,
  Gift,
  HandHeart,
  HeartHandshake,
  Recycle,
  UserRound,
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
import { RequireAuth, useAuth } from "./AuthContext";

const WORKSPACES = {
  donor: {
    label: "Food donor",
    home: "/dashboard",
    links: [
      { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
      { label: "Donate food", to: "/Donate", icon: HandHeart },
      { label: "Donation tracking", to: "/Tracking", icon: ClipboardList },
      { label: "Biogas pickup", to: "/BiogasDonation", icon: Recycle },
      { label: "Freshness check", to: "/ImageRecognition", icon: ScanSearch },
      { label: "Fundraising", to: "/FundraisingPage", icon: HeartHandshake },
      { label: "Gift cards", to: "/GiftCard", icon: Gift },
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
      { label: "My profile", to: "/VolunteerForm", icon: UserRound },
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
      { label: "Organization profile", to: "/Register", icon: Building2 },
      { label: "NGO directory", to: "/KnowYourNgo", icon: Activity },
    ],
  },
  biogas: {
    label: "Biogas partner",
    home: "/BiogasDonation",
    links: [
      { label: "Pickups", to: "/BiogasDonation", icon: Flame },
      { label: "Freshness check", to: "/ImageRecognition", icon: ScanSearch },
      { label: "Food learning", to: "/LearnerCorner", icon: BookOpen },
    ],
  },
};

const CHATBOT_ID = process.env.NEXT_PUBLIC_CHATBASE_ID ?? "yjdpcsT5vE7OpzrkI5BYv";

// Pages that act on one role's data; anything else in the shell is open to every signed-in user.
const ROLE_PAGES = {
  "/dashboard": ["donor"],
  "/donate": ["donor"],
  "/volunteerdashboard": ["volunteer"],
  "/volunteermap": ["volunteer"],
  "/deliverytrackingpage": ["volunteer"],
  "/volunteerform": ["volunteer"],
  "/ngodashboard": ["organization"],
  "/ngotracking": ["organization"],
  "/route_optimization": ["organization", "volunteer"],
  "/event_prediction": ["organization"],
  "/register": ["organization"],
};

// Layout route: every in-app page renders inside this shell via <Outlet />, behind the sign-in guard.
function PersonaDashboardShell() {
  const { pathname } = useLocation();
  return (
    <RequireAuth roles={ROLE_PAGES[pathname.toLowerCase()]}>
      <Workspace pathname={pathname} />
    </RequireAuth>
  );
}

function Workspace({ pathname }) {
  const { user, logout: endSession } = useAuth();
  const role = WORKSPACES[user.role] ? user.role : "donor"; // admin browses with the donor menu
  const workspace = WORKSPACES[role];
  const displayName = user.fullName || workspace.label;
  const title = workspace.links.find((link) => link.to.toLowerCase() === pathname.toLowerCase())?.label
    || pathname.replace(/^\//, "").replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  const logout = () => {
    endSession();
    navigate("/sign-in", { replace: true });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // The help chatbot loads only inside the workspace: on the auth pages its greeting covered the submit buttons.
  useEffect(() => {
    if (!CHATBOT_ID || document.getElementById(CHATBOT_ID)) return;
    const script = document.createElement("script");
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = CHATBOT_ID;
    script.setAttribute("domain", "www.chatbase.co");
    document.body.appendChild(script);
  }, []);

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
          <img src="/logo/logo-wordmark.png" alt="FeedingHands" />
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