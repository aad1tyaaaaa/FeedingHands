// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import axios from "axios";
// import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
// import "./SignIn.css";

// const API_BASE_URL = "http://localhost:5500"; // Base URL for your API
// const GOOGLE_CLIENT_ID =
//   "2098173142-7q170jn9tetjsh7709cga5nuqvg3qr5g.apps.googleusercontent.com";

// // These defaults help when using ngrok and for sending credentials.
// axios.defaults.headers.common["ngrok-skip-browser-warning"] = "true";
// axios.defaults.withCredentials = true;

// function SignIn() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     if (!email || !password) {
//       setError("Email and password are required.");
//       return;
//     }

//     try {
//       // Updated endpoint: now sending the request to /api/login/signin
//       const response = await axios.post(
//         `${API_BASE_URL}/api/login/signin`,
//         { email, password },
//         { timeout: 10000 }
//       );

//       if (response.data && response.data.user) {
//         localStorage.setItem("userId", response.data.user.id);
//         localStorage.setItem("userName", response.data.user.name);
//         localStorage.setItem("userEmail", response.data.user.email);
//         localStorage.setItem("token", response.data.token);
//         navigate("/dashboard");
//       } else {
//         setError("Invalid response from server");
//       }
//     } catch (error) {
//       console.error("Error during sign-in:", error);
//       if (error.code === "ECONNABORTED") {
//         setError("Request timed out. Please try again.");
//       } else if (error.code === "ERR_NETWORK") {
//         setError("Network error. Please check your internet connection.");
//       } else if (error.response) {
//         setError(error.response.data.message || "Authentication failed");
//       } else {
//         setError("An unexpected error occurred. Please try again.");
//       }
//     }
//   };

//   const handleGoogleLoginSuccess = async (credentialResponse) => {
//     try {
//       // Note: Adjust this endpoint if your Google login route differs on the server.
//       const response = await axios.post(`${API_BASE_URL}/login`, {
//         token: credentialResponse.credential,
//       });

//       if (response.data && response.data.user) {
//         localStorage.setItem("userId", response.data.user.id);
//         localStorage.setItem("userName", response.data.user.name);
//         localStorage.setItem("userEmail", response.data.user.email);
//         localStorage.setItem("token", response.data.token);
//         navigate("/dashboard");
//       } else {
//         setError("Invalid response from server during Google sign-in");
//       }
//     } catch (error) {
//       console.error("Error during Google login:", error);
//       setError("Google login failed. Please try again.");
//     }
//   };

//   return (
//     <div className="signin-container">
//       <h2>Sign In</h2>
//       {error && <div className="error-message">{error}</div>}
//       <form onSubmit={handleSubmit}>
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />
//         <p>
//           Not registered yet?{" "}
//           <Link to="/sign-up">
//             <span> Sign-Up</span>
//           </Link>
//         </p>
//         <button type="submit">Sign In</button>
//       </form>

//       <div className="google-login">
//         <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
//           <GoogleLogin
//             onSuccess={handleGoogleLoginSuccess}
//             onError={() => setError("Google login failed. Please try again.")}
//           />
//         </GoogleOAuthProvider>
//       </div>
//     </div>
//   );
// }

// export default SignIn;

// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import axios from "axios";
// import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
// import "./SignIn.css";

// const API_BASE_URL = "http://localhost:5500/api"; // Adjust for deployment
// const GOOGLE_CLIENT_ID =
//   "2098173142-7q170jn9tetjsh7709cga5nuqvg3qr5g.apps.googleusercontent.com";

// axios.defaults.withCredentials = true;

// function SignIn() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     if (!email || !password) {
//       setError("Email and password are required.");
//       setLoading(false);
//       return;
//     }

//     try {
//       const response = await axios.post(
//         `${API_BASE_URL}/login/signin`,
//         { email, password },
//         { timeout: 10000 }
//       );

//       if (response.data?.user) {
//         localStorage.setItem("userId", response.data.user.id);
//         localStorage.setItem("userName", response.data.user.name);
//         localStorage.setItem("userEmail", response.data.user.email);
//         localStorage.setItem("token", response.data.token);
//         navigate("/dashboard");
//       } else {
//         setError("Invalid response from server.");
//       }
//     } catch (error) {
//       console.error("Sign-in error:", error);
//       if (error.code === "ECONNABORTED") {
//         setError("Request timed out. Try again.");
//       } else if (error.code === "ERR_NETWORK") {
//         setError("Network issue. Check your connection.");
//       } else {
//         setError(error.response?.data?.message || "Sign-in failed. Try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleLoginSuccess = async (credentialResponse) => {
//     try {
//       const response = await axios.post(`${API_BASE_URL}/login/google`, {
//         token: credentialResponse.credential,
//       });

//       if (response.data?.user) {
//         localStorage.setItem("userId", response.data.user.id);
//         localStorage.setItem("userName", response.data.user.name);
//         localStorage.setItem("userEmail", response.data.user.email);
//         localStorage.setItem("token", response.data.token);
//         navigate("/dashboard");
//       } else {
//         setError("Google sign-in failed.");
//       }
//     } catch (error) {
//       console.error("Google login error:", error);
//       setError("Google login failed. Try again.");
//     }
//   };

//   return (
//     <div className="signin-container">
//       <h2>Sign In</h2>
//       {error && <div className="error-message">{error}</div>}
//       <form onSubmit={handleSubmit}>
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />
//         <p>
//           Not registered yet?{" "}
//           <Link to="/sign-up">
//             <span> Sign-Up</span>
//           </Link>
//         </p>
//         <button type="submit" disabled={loading}>
//           {loading ? "Signing In..." : "Sign In"}
//         </button>
//       </form>

//       <div className="google-login">
//         <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
//           <GoogleLogin
//             onSuccess={handleGoogleLoginSuccess}
//             onError={() => setError("Google login failed. Try again.")}
//           />
//         </GoogleOAuthProvider>
//       </div>
//     </div>
//   );
// }

// export default SignIn;

//new sign in supabase

// import { useState } from "react";
// import { createClient } from "@supabase/supabase-js";
// import { useNavigate } from "react-router-dom";

// import "./SignIn.css";

// // Supabase credentials
// const SUPABASE_URL = "https://evrxtwxxwptqjhecthdv.supabase.co";
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cnh0d3h4d3B0cWpoZWN0aGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODIzMDgsImV4cCI6MjA1NDY1ODMwOH0.QKuD5Wz8HxibrI_zpM-7BRq8KX7MHlYTZ9Yis_REmI0";

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// function SignIn() {
//   const navigate = useNavigate();

//   const [formData, setFormData] = useState({
//     phone: "",
//     password: "",
//   });

//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSignIn = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         phone: phone,
//         password: password,
//       });

//       if (error) {
//         throw error;
//       }

//       // Store session or navigate to dashboard/home page
//       alert("Login successful!");
//       navigate("/dashboard");
//       // Change to your dashboard page
//     } catch (error) {
//       setError(error.message || "Login failed. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="signin-container">
//       <h2>Sign In</h2>
//       <form onSubmit={handleSignIn}>
//         {error && <div className="error-message">{error}</div>}

//         <div className="form-group">
//           <label htmlFor="phone">Phone Number</label>
//           <input
//             type="tel"
//             id="phone"
//             name="phone"
//             placeholder="+1234567890"
//             value={formData.phone}
//             onChange={handleChange}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label htmlFor="password">Password</label>
//           <input
//             type="password"
//             id="password"
//             name="password"
//             value={formData.password}
//             onChange={handleChange}
//             required
//           />
//         </div>

//         <button type="submit" disabled={loading}>
//           {loading ? "Signing in..." : "Sign In"}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default SignIn;

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./SignIn.css";

const GATEWAY_CREDENTIALS = {
  username: "demo",
  password: "feedinghands",
};

function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { username, password } = formData;
      if (
        username !== GATEWAY_CREDENTIALS.username ||
        password !== GATEWAY_CREDENTIALS.password
      ) {
        throw new Error("Invalid demo credentials");
      } else {
        navigate("/persona-login");
      }
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
    <div className="signin-panel">
    <div className="signin-container">
      <img
        className="signin-logo"
        src="/logo/logo-with-text.png"
        alt="FeedingHands"
      />
      <h2>Sign In</h2>
      <p className="signin-subtitle">Welcome back! Sign in to keep feeding hands.</p>
      <form onSubmit={handleSignIn}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="demo"
            autoComplete="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <p className="signin-footer">
          Demo login: <strong>demo / feedinghands</strong>
        </p>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="signin-switch">
        New to FeedingHands? <Link to="/sign-up">Create an account</Link>
      </p>
    </div>
    </div>
    <video
      className="signin-video"
      src="/FeedingHands_personas_brand.mp4"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    />
    </div>
  );
}

export default SignIn;
