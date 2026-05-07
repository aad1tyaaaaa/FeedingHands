import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google"; // Import GoogleOAuthProvider
import 'fast-text-encoding';

import App from "./components/App.js";

const clientId =
  "2098173142-7q170jn9tetjsh7709cga5nuqvg3qr5g.apps.googleusercontent.com"; // Replace with your actual Google Client ID

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={clientId}>
    {" "}
    {/* Wrap your app with GoogleOAuthProvider */}
    <App />
  </GoogleOAuthProvider>
);
