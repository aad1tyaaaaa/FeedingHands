// import React from "react";
// import {
//   BrowserRouter as Router,
//   Routes,
//   Route,
//   useLocation,
// } from "react-router-dom";

// // Import components
// import Header from "./components/Header";
// import { DonationProvider } from "./components/DonationContext";
// import SignIn from "./components/Signin";
// import SignUp from "./components/SignUp";
// import Donate from "./components/Donate";
// import Register from "./components/Register";
// import Dashboard from "./components/Dashboard";
// import LearnerCorner from "./components/LearnerCorner";
// import DonateFood from "./components/DonateFood";
// import VolunteerForm from "./components/VolunteerForm";
// import FundraisingPage from "./components/FundraisingPage";
// import BiogasDonation from "./components/BiogasDonation";
// import NgoDashboard from "./components/NgoDashboard";
// import Note from "./components/Note";
// import Contact from "./components/Contact";
// import VolunteerDashboard from "./components/VolunteerDashboard";
// import Tracking from "./components/Tracking";
// import { FoodTrackingProvider } from "./components/FoodTrackingContext";
// import { NgoFoodTrackingProvider } from "./components/NgoFoodTrackingContext";
// import NgoTracking from "./components/NgoTracking";
// import DeliveryTrackingPage from "./components/DeliveryTrackingPage";
// import LoaderRedirect from "./components/LoaderRedirect"; // New loader redirect component
// import RoleSelection from "./components/RoleSelection";
// import VolunteerMap from "./components/VolunteerMap";
// import DonationOptions from "./components/DonationOptions";
// import FoodHeroes from "./components/FoodHeroes";
// import KnowYourVolunteer from "./components/KnowYourVolunteer";
// import KnowYourNgo from "./components/KnowYourNgo";
// import GiftCard from "./components/GiftCard";
// import ImageRecognition from "./components/ImageRecognition";
// import FoodSpoiledPage from "./components/FoodSpoiledPage";
// import ArDetection from "./components/ArDetection";
// import Event_prediction from "./components/Event_prediction";
// import Route_Optimization from "./components/Route_Optimization";
// function AppContent() {
//   // Initialize location so we can conditionally render elements if needed
//   const location = useLocation();

//   return (
//     <div>
//       {/* Optionally render the Header if not on the "/" route */}
//       {location.pathname !== "/" }
      
//       <NgoFoodTrackingProvider>
//         <FoodTrackingProvider>
//           <DonationProvider>
//             <Routes>
//               {/* Replace the home page with the loading screen */}
//               <Route path="/" element={<LoaderRedirect />} />
//               <Route path="/Donate" element={<Donate />} />
//               <Route path="/dashboard" element={<Dashboard />} />
//               <Route path="/sign-in" element={<SignIn />} />
//               <Route path="/sign-up" element={<SignUp />} />
//               <Route path="/Register" element={<Register />} />
//               <Route path="/VolunteerMap" element={<VolunteerMap />} />
//               <Route path="/DonationOptions" element={<DonationOptions />} />
//               <Route path="/donateFood" element={<DonateFood />} />
//               <Route path="/VolunteerForm" element={<VolunteerForm />} />
//               <Route path="/FundraisingPage" element={<FundraisingPage />} />
//               <Route path="/BiogasDonation" element={<BiogasDonation />} />
//               <Route path="/RoleSelection" element={<RoleSelection />} />
//               <Route path="/LearnerCorner" element={<LearnerCorner />} />
//               <Route path="/NgoDashboard" element={<NgoDashboard />} />
//               <Route path="/VolunteerDashboard" element={<VolunteerDashboard />} />
//               <Route path="/NgoTracking" element={<NgoTracking />} />
//               <Route path="/Tracking" element={<Tracking />} />
//               <Route path="/DeliveryTrackingPage" element={<DeliveryTrackingPage />} />
//               <Route path="/FoodHeroes" element={<FoodHeroes />} />
//               <Route path="/KnowYourVolunteer" element={<KnowYourVolunteer />} />
//               <Route path="/KnowYourNgo" element={<KnowYourNgo />} />
//               <Route path="/GiftCard" element={<GiftCard />} />
//               <Route path="/ImageRecognition" element={<ImageRecognition />} />
//               <Route path="/FoodSpoiledPage" element={<FoodSpoiledPage />} />
//               <Route path="/ArDetection" element={<ArDetection />} />
//               <Route path="/Event_prediction" element={<Event_prediction />} />
//               <Route path="/Route_Optimization" element={<Route_Optimization />} />
//             </Routes>
//           </DonationProvider>
//         </FoodTrackingProvider>
//       </NgoFoodTrackingProvider>
      
//     </div>
//   );
// }

// function App() {
//   return (
//     <Router>
//       <AppContent />
//     </Router>
//   );
// }

// export default App;
