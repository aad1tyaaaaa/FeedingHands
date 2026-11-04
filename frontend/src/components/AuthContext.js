import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch, getToken, setToken, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

// Where each role lands after signing in.
export const ROLE_HOME = {
  donor: "/dashboard",
  volunteer: "/VolunteerDashboard",
  organization: "/NgoDashboard",
  biogas: "/BiogasDonation",
  admin: "/dashboard",
};

export const homeFor = (user) =>
  !user ? "/sign-in" : user.role === "pending" ? "/role-selection" : ROLE_HOME[user.role] || "/dashboard";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True after the user pressed "Log out" (vs. a session that expired mid-visit), so the guard
  // doesn't remember the page and send the next person who signs in back to it.
  const loggedOut = useRef(false);

  const logout = useCallback(() => {
    loggedOut.current = true;
    setToken(null);
    setUser(null);
  }, []);

  const expire = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // A session is the server's answer to /me, never a cached copy, so a revoked token can't linger.
  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const data = await apiFetch("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch (err) {
      if (err.status === 401) expire();
      return null;
    }
  }, [expire]);

  // Signin, OTP verification and role choice all answer with {access_token, user}.
  const startSession = useCallback((data) => {
    loggedOut.current = false;
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(expire);
    refresh().finally(() => setLoading(false));
  }, [expire, refresh]);

  const value = useMemo(
    () => ({ user, loading, startSession, refresh, logout, loggedOut }),
    [user, loading, startSession, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// RequireAuth renders children only for a signed-in user with a chosen role (and one of roles, if given).
export function RequireAuth({ roles, children }) {
  const { user, loading, loggedOut } = useAuth();
  const location = useLocation();
  if (loading) return <div className="fh-auth-loading" role="status">Loading…</div>;
  if (!user) {
    const from = loggedOut.current ? undefined : { from: location.pathname + location.search };
    return <Navigate to="/sign-in" replace state={from} />;
  }
  if (user.role === "pending") return <Navigate to="/role-selection" replace />;
  if (roles && user.role !== "admin" && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}
