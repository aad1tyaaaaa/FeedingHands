// LoaderRedirect.js
import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

const LoaderRedirect = () => {
  const navigate = useNavigate();

  const handleLoaded = () => {
    navigate("/sign-in");
  };

  return <LoadingScreen onLoaded={handleLoaded} />;
};

export default LoaderRedirect;
