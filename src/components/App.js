import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// Import components
import Header from "./Header";
import { DonationProvider } from "./DonationContext";
import SignIn from "./Signin";
import SignUp from "./SignUp";
import Donate from "./Donate";
import Register from "./Register";
import Dashboard from "./Dashboard";
import LearnerCorner from "./LearnerCorner";
import DonateFood from "./DonateFood";
import VolunteerForm from "./VolunteerForm";
import FundraisingPage from "./FundraisingPage";
import BiogasDonation from "./BiogasDonation";
import NgoDashboard from "./NgoDashboard";
import Note from "./Note";
import Contact from "./Contact";
import VolunteerDashboard from "./VolunteerDashboard";
import Tracking from "./Tracking";
import { FoodTrackingProvider } from "./FoodTrackingContext";
import { NgoFoodTrackingProvider } from "./NgoFoodTrackingContext";
import NgoTracking from "./NgoTracking";
import DeliveryTrackingPage from "./DeliveryTrackingPage";
import LoaderRedirect from "./LoaderRedirect"; // New loader redirect component
import RoleSelection from "./RoleSelection";
import VolunteerMap from "./VolunteerMap";
import DonationOptions from "./DonationOptions";
import FoodHeroes from "./FoodHeroes";
import KnowYourVolunteer from "./KnowYourVolunteer";
import KnowYourNgo from "./KnowYourNgo";
import GiftCard from "./GiftCard";
import ImageRecognition from "./ImageRecognition";
import FoodSpoiledPage from "./FoodSpoiledPage";
import ArDetection from "./ArDetection";
import Event_prediction from "./Event_prediction";
import Route_Optimization from "./Route_Optimization";
function AppContent() {
  // Initialize location so we can conditionally render elements if needed
  const location = useLocation();

  return (
    <div>
      {/* Optionally render the Header if not on the "/" route */}
      {location.pathname !== "/" }
      
      <NgoFoodTrackingProvider>
        <FoodTrackingProvider>
          <DonationProvider>
            <Routes>
              {/* Replace the home page with the loading screen */}
              <Route path="/" element={<LoaderRedirect />} />
              <Route path="/Donate" element={<Donate />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/Register" element={<Register />} />
              <Route path="/VolunteerMap" element={<VolunteerMap />} />
              <Route path="/DonationOptions" element={<DonationOptions />} />
              <Route path="/donateFood" element={<DonateFood />} />
              <Route path="/VolunteerForm" element={<VolunteerForm />} />
              <Route path="/FundraisingPage" element={<FundraisingPage />} />
              <Route path="/BiogasDonation" element={<BiogasDonation />} />
              <Route path="/RoleSelection" element={<RoleSelection />} />
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/LearnerCorner" element={<LearnerCorner />} />
              <Route path="/NgoDashboard" element={<NgoDashboard />} />
              <Route path="/VolunteerDashboard" element={<VolunteerDashboard />} />
              <Route path="/NgoTracking" element={<NgoTracking />} />
              <Route path="/Tracking" element={<Tracking />} />
              <Route path="/DeliveryTrackingPage" element={<DeliveryTrackingPage />} />
              <Route path="/FoodHeroes" element={<FoodHeroes />} />
              <Route path="/KnowYourVolunteer" element={<KnowYourVolunteer />} />
              <Route path="/KnowYourNgo" element={<KnowYourNgo />} />
              <Route path="/GiftCard" element={<GiftCard />} />
              <Route path="/ImageRecognition" element={<ImageRecognition />} />
              <Route path="/FoodSpoiledPage" element={<FoodSpoiledPage />} />
              <Route path="/ArDetection" element={<ArDetection />} />
              <Route path="/Event_prediction" element={<Event_prediction />} />
              <Route path="/Route_Optimization" element={<Route_Optimization />} />
            </Routes>
          </DonationProvider>
        </FoodTrackingProvider>
      </NgoFoodTrackingProvider>
      
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
