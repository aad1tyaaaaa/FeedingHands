import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import LoaderRedirect from "./LoaderRedirect";
import SignIn from "./Signin";
import SignUp from "./SignUp";
import ForgotPassword from "./ForgotPassword";
import RoleSelection from "./RoleSelection";
import Privacy from "./Privacy";
import Terms from "./Terms";
import Register from "./Register";
import PersonaDashboardShell from "./PersonaDashboardShell";
import Dashboard from "./Dashboard";
import Donate from "./Donate";
import Tracking from "./Tracking";
import NgoDashboard from "./NgoDashboard";
import VolunteerDashboard from "./VolunteerDashboard";
import VolunteerMap from "./VolunteerMap";
import VolunteerForm from "./VolunteerForm";
import DeliveryTrackingPage from "./DeliveryTrackingPage";
import Route_Optimization from "./Route_Optimization";
import Event_prediction from "./Event_prediction";
import BiogasDonation from "./BiogasDonation";
import DonationOptions from "./DonationOptions";
import FundraisingPage from "./FundraisingPage";
import GiftCard from "./GiftCard";
import LearnerCorner from "./LearnerCorner";
import FoodHeroes from "./FoodHeroes";
import KnowYourVolunteer from "./KnowYourVolunteer";
import KnowYourNgo from "./KnowYourNgo";
import ImageRecognition from "./ImageRecognition";
import FoodSpoiledPage from "./FoodSpoiledPage";
import Settings from "./Settings";
import AdminDashboard from "./AdminDashboard";

// Old CamelCase addresses (bookmarks, emails already sent) keep working. Routes match case-insensitively,
// so /Donate already reaches /donate; only renamed pages need an entry here.
const MOVED = {
  "/RoleSelection": "/role-selection",
  "/persona-login": "/sign-in",
  "/NgoDashboard": "/ngo",
  "/NgoTracking": "/ngo/tracking",
  "/Register": "/ngo/profile",
  "/Event_prediction": "/ngo/forecast",
  "/VolunteerDashboard": "/volunteer",
  "/VolunteerMap": "/volunteer/map",
  "/VolunteerForm": "/volunteer/profile",
  "/DeliveryTrackingPage": "/volunteer/deliveries",
  "/Route_Optimization": "/routes",
  "/BiogasDonation": "/biogas",
  "/DonationOptions": "/donation-options",
  "/FundraisingPage": "/fundraising",
  "/GiftCard": "/rewards",
  "/LearnerCorner": "/learn",
  "/FoodHeroes": "/food-heroes",
  "/KnowYourVolunteer": "/volunteers",
  "/KnowYourNgo": "/ngos",
  "/ImageRecognition": "/freshness",
  "/ArDetection": "/freshness",
  "/FoodSpoiledPage": "/food-spoiled",
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoaderRedirect />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {Object.entries(MOVED).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          {/* Every in-app page shares the workspace sidebar, which also enforces sign-in and role. */}
          <Route element={<PersonaDashboardShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/ngo" element={<NgoDashboard />} />
            <Route path="/ngo/tracking" element={<Tracking />} />
            <Route path="/ngo/forecast" element={<Event_prediction />} />
            <Route path="/ngo/profile" element={<Register />} />
            <Route path="/volunteer" element={<VolunteerDashboard />} />
            <Route path="/volunteer/map" element={<VolunteerMap />} />
            <Route path="/volunteer/profile" element={<VolunteerForm />} />
            <Route path="/volunteer/deliveries" element={<DeliveryTrackingPage />} />
            <Route path="/routes" element={<Route_Optimization />} />
            <Route path="/biogas" element={<BiogasDonation />} />
            <Route path="/donation-options" element={<DonationOptions />} />
            <Route path="/fundraising" element={<FundraisingPage />} />
            <Route path="/rewards" element={<GiftCard />} />
            <Route path="/learn" element={<LearnerCorner />} />
            <Route path="/food-heroes" element={<FoodHeroes />} />
            <Route path="/volunteers" element={<KnowYourVolunteer />} />
            <Route path="/ngos" element={<KnowYourNgo />} />
            <Route path="/freshness" element={<ImageRecognition />} />
            <Route path="/food-spoiled" element={<FoodSpoiledPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
