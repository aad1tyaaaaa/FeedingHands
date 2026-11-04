import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, RequireAuth } from "./AuthContext";
import LoaderRedirect from "./LoaderRedirect";
import SignIn from "./Signin";
import SignUp from "./SignUp";
import RoleSelection from "./RoleSelection";
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
import ArDetection from "./ArDetection";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoaderRedirect />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/RoleSelection" element={<Navigate to="/role-selection" replace />} />
          <Route path="/persona-login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/Register" element={<RequireAuth roles={["organization"]}><Register /></RequireAuth>} />
          {/* Every in-app page shares the workspace sidebar, which also enforces sign-in and role. */}
          <Route element={<PersonaDashboardShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/Donate" element={<Donate />} />
            <Route path="/Tracking" element={<Tracking />} />
            <Route path="/NgoTracking" element={<Tracking />} />
            <Route path="/NgoDashboard" element={<NgoDashboard />} />
            <Route path="/VolunteerDashboard" element={<VolunteerDashboard />} />
            <Route path="/VolunteerMap" element={<VolunteerMap />} />
            <Route path="/VolunteerForm" element={<VolunteerForm />} />
            <Route path="/DeliveryTrackingPage" element={<DeliveryTrackingPage />} />
            <Route path="/Route_Optimization" element={<Route_Optimization />} />
            <Route path="/Event_prediction" element={<Event_prediction />} />
            <Route path="/BiogasDonation" element={<BiogasDonation />} />
            <Route path="/DonationOptions" element={<DonationOptions />} />
            <Route path="/FundraisingPage" element={<FundraisingPage />} />
            <Route path="/GiftCard" element={<GiftCard />} />
            <Route path="/LearnerCorner" element={<LearnerCorner />} />
            <Route path="/FoodHeroes" element={<FoodHeroes />} />
            <Route path="/KnowYourVolunteer" element={<KnowYourVolunteer />} />
            <Route path="/KnowYourNgo" element={<KnowYourNgo />} />
            <Route path="/ImageRecognition" element={<ImageRecognition />} />
            <Route path="/FoodSpoiledPage" element={<FoodSpoiledPage />} />
            <Route path="/ArDetection" element={<ArDetection />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
