// LoaderRedirect.js
import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

const LoaderRedirect = () => {
  const navigate = useNavigate();

  const handleLoaded = () => {
    navigate("/sign-in"); // Redirect to sign-in after loading is complete
  };

  return <LoadingScreen onLoaded={handleLoaded} />;
};

export default LoaderRedirect;
