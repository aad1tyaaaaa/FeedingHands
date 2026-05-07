// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import "./SignUp.css";
// import { useState } from "react";

// // Replace with the correct API base URL for production or testing
// const API_BASE_URL = "http://localhost:5500/api";

// function SignUp() {
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     password: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     // Basic form validation
//     if (!formData.email.match(/\S+@\S+\.\S+/)) {
//       alert("Please enter a valid email address.");
//       setLoading(false);
//       return;
//     }
//     if (!formData.phone.match(/^\d{10}$/)) {
//       alert("Please enter a valid phone number.");
//       setLoading(false);
//       return;
//     }
//     if (formData.password.length < 6) {
//       alert("Password must be at least 6 characters long.");
//       setLoading(false);
//       return;
//     }

//     try {
//       const response = await axios.post("${API_BASE_URL}/signup", {
//         name: formData.name,
//         email: formData.email,
//         phone: formData.phone,
//         password: formData.password,
//       });

//       // Check if the status is 200 OK or 201 Created
//       if (response.status === 200 || response.status === 201) {
//         alert("Sign-up successful!");
//         navigate("/sign-in");
//       } else {
//         console.warn("Unexpected response status:", response.status);
//       }
//     } catch (error) {
//       console.error(
//         "Error during sign-up:",
//         error.response?.data || error.message
//       );
//       if (error.response?.status === 409) {
//         alert("User already exists. Please log in.");
//       } else {
//         alert(`Sign-up failed. Error: ${error.message || "Please try again."}`);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="signup-container">
//       <h2>Sign Up</h2>
//       <form onSubmit={handleSubmit}>
//         <input
//           type="text"
//           name="name"
//           placeholder="Name"
//           value={formData.name}
//           onChange={handleInputChange}
//           required
//         />
//         <input
//           type="email"
//           name="email"
//           placeholder="Email"
//           value={formData.email}
//           onChange={handleInputChange}
//           required
//         />
//         <input
//           type="text"
//           name="phone"
//           placeholder="Phone Number"
//           value={formData.phone}
//           onChange={handleInputChange}
//           required
//         />
//         <input
//           type="password"
//           name="password"
//           placeholder="Password"
//           value={formData.password}
//           onChange={handleInputChange}
//           required
//         />
//         <button type="submit" disabled={loading}>
//           {loading ? "Signing Up..." : "Sign Up"}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default SignUp;

// supabase working code
// import { useState } from "react";
// import "./SignUp.css";

// // Replace these with your Supabase project details
// const SUPABASE_URL = "https://rbwlmdamzvmtfqyhnocj.supabase.co";
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xtZGFtenZtdGZxeWhub2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODk2MzUsImV4cCI6MjA1NDY2NTYzNX0.LL-Zv5aoV_iuRMQK_90n6cPGwtHoG5QmiMRuJ2MQba0";

// function SignUp() {
//   const [formData, setFormData] = useState({
//     phone: "",
//     password: "",

//     confirmPassword: "",
//     fullName: "",
//   });
//   const [verificationCode, setVerificationCode] = useState("");
//   const [showVerification, setShowVerification] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const validateForm = () => {
//     if (
//       !formData.phone ||
//       !formData.password ||
//       !formData.confirmPassword ||
//       !formData.fullName
//     ) {
//       setError("All fields are required");
//       return false;
//     }

//     if (formData.password !== formData.confirmPassword) {
//       setError("Passwords do not match");
//       return false;
//     }
//     if (formData.password.length < 6) {
//       setError("Password must be at least 6 characters");
//       return false;
//     }
//     // Basic phone number validation
//     const phoneRegex = /^\+[1-9]\d{1,14}$/;
//     if (!phoneRegex.test(formData.phone)) {
//       setError(
//         "Please enter a valid phone number in international format (e.g., +1234567890)"
//       );
//       return false;
//     }
//     return true;
//   };

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSignUp = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     setError("");

//     try {
//       // Sign up user using Supabase Phone Auth
//       const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           apikey: SUPABASE_ANON_KEY,
//         },
//         body: JSON.stringify({
//           phone: formData.phone,

//           password: formData.password,
//           data: {
//             full_name: formData.fullName,
//           },
//         }),
//       });

//       const data = await signUpResponse.json();

//       if (!signUpResponse.ok) {
//         throw new Error(
//           data.msg || data.message || data.error_description || "Signup failed"
//         );
//       }

//       setShowVerification(true);
//       alert("Please enter the verification code sent to your phone.");
//     } catch (error) {
//       console.error("Sign-up error:", error);
//       if (error.message.includes("already registered")) {
//         setError("This phone number is already registered. Please sign in.");
//       } else {
//         setError(error.message || "Sign-up failed. Please try again later.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerification = async (e) => {
//     e.preventDefault();
//     if (!verificationCode) {
//       setError("Please enter the verification code");
//       return;
//     }

//     setLoading(true);
//     setError("");

//     try {
//       // Verify the phone number using Supabase
//       const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           apikey: SUPABASE_ANON_KEY,
//         },
//         body: JSON.stringify({
//           phone: formData.phone,
//           token: verificationCode,
//           type: "sms",
//         }),
//       });

//       const data = await verifyResponse.json();

//       if (!verifyResponse.ok) {
//         throw new Error(
//           data.msg ||
//             data.message ||
//             data.error_description ||
//             "Verification failed"
//         );
//       }

//       // If verification successful, create profile in profiles table
//       if (data.user?.id) {
//         const profileResponse = await fetch(
//           `${SUPABASE_URL}/rest/v1/profiles`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               apikey: SUPABASE_ANON_KEY,
//               Authorization: `Bearer ${data.access_token}`,
//               Prefer: "return=minimal",
//             },
//             body: JSON.stringify({
//               id: data.user.id,
//               full_name: formData.fullName,
//               phone: formData.phone,
//               email: formData.email, // Save email in database
//             }),
//           }
//         );

//         if (!profileResponse.ok) {
//           console.error(
//             "Error creating profile:",
//             await profileResponse.json()
//           );
//         }
//       }

//       alert("Phone number verified successfully!");
//       window.location.href = "/sign-in";
//     } catch (error) {
//       console.error("Verification error:", error);
//       setError(error.message || "Verification failed. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="signup-container">
//       <h2>Create Account</h2>
//       {!showVerification ? (
//         <form onSubmit={handleSignUp}>
//           {error && <div className="error-message">{error}</div>}

//           <div className="form-group">
//             <label htmlFor="fullName">Full Name</label>
//             <input
//               type="text"
//               id="fullName"
//               name="fullName"
//               value={formData.fullName}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="phone">Phone Number</label>
//             <input
//               type="tel"
//               id="phone"
//               name="phone"
//               placeholder=""
//               value={formData.phone}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="password">Password</label>
//             <input
//               type="password"
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="confirmPassword">Confirm Password</label>
//             <input
//               type="password"
//               id="confirmPassword"
//               name="confirmPassword"
//               value={formData.confirmPassword}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <button type="submit" disabled={loading}>
//             {loading ? "Sending code..." : "Sign Up"}
//           </button>
//         </form>
//       ) : (
//         <form onSubmit={handleVerification}>
//           {error && <div className="error-message">{error}</div>}

//           <div className="form-group">
//             <label htmlFor="verificationCode">Enter Verification Code</label>
//             <input
//               type="text"
//               id="verificationCode"
//               value={verificationCode}
//               onChange={(e) => setVerificationCode(e.target.value)}
//               required
//             />
//           </div>

//           <button type="submit" disabled={loading}>
//             {loading ? "Verifying..." : "Verify Code"}
//           </button>
//         </form>
//       )}
//     </div>
//   );
// }

// export default SignUp;

//claude.ai
// import { useState } from "react";
// import "./SignUp.css";

// const SUPABASE_URL = "https://rbwlmdamzvmtfqyhnocj.supabase.co";
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xtZGFtenZtdGZxeWhub2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODk2MzUsImV4cCI6MjA1NDY2NTYzNX0.LL-Zv5aoV_iuRMQK_90n6cPGwtHoG5QmiMRuJ2MQba0";

// function SignUp() {
//   const [formData, setFormData] = useState({
//     phone: "",
//     password: "",
//     confirmPassword: "",
//     fullName: "",
//   });
//   const [verificationCode, setVerificationCode] = useState("");
//   const [showVerification, setShowVerification] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const validateForm = () => {
//     if (
//       !formData.phone ||
//       !formData.password ||
//       !formData.confirmPassword ||
//       !formData.fullName
//     ) {
//       setError("All fields are required");
//       return false;
//     }

//     if (formData.password !== formData.confirmPassword) {
//       setError("Passwords do not match");
//       return false;
//     }

//     if (formData.password.length < 6) {
//       setError("Password must be at least 6 characters");
//       return false;
//     }

//     // Ensure phone number is in E.164 format
//     const phoneRegex = /^\+[1-9]\d{1,14}$/;
//     if (!phoneRegex.test(formData.phone)) {
//       setError(
//         "Please enter a valid phone number in international format (e.g., +1234567890)"
//       );
//       return false;
//     }

//     return true;
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value.trim(),
//     }));
//     if (error) setError("");
//   };

//   const handleSignUp = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     setError("");

//     try {
//       // First, try to send the verification SMS
//       const phoneResponse = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           apikey: SUPABASE_ANON_KEY,
//         },
//         body: JSON.stringify({
//           phone: formData.phone,
//           channel: "sms",
//         }),
//       });

//       const phoneData = await phoneResponse.json();

//       if (!phoneResponse.ok) {
//         throw new Error(
//           phoneData.error?.message ||
//             phoneData.error ||
//             "Failed to send verification code"
//         );
//       }

//       setShowVerification(true);
//       alert("Please enter the verification code sent to your phone.");
//     } catch (error) {
//       console.error("Sign-up error:", error);
//       if (error.message.includes("already")) {
//         setError("This phone number is already registered");
//       } else {
//         setError(error.message || "Failed to start phone verification");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerification = async (e) => {
//     e.preventDefault();
//     if (!verificationCode) {
//       setError("Please enter the verification code");
//       return;
//     }

//     setLoading(true);
//     setError("");

//     try {
//       // First verify the phone number
//       const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           apikey: SUPABASE_ANON_KEY,
//         },
//         body: JSON.stringify({
//           phone: formData.phone,
//           token: verificationCode,
//           type: "sms",
//         }),
//       });

//       const verifyData = await verifyResponse.json();

//       if (!verifyResponse.ok) {
//         throw new Error(
//           verifyData.error?.message || "Invalid verification code"
//         );
//       }

//       // After verification, create the user account
//       const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           apikey: SUPABASE_ANON_KEY,
//         },
//         body: JSON.stringify({
//           email: `${formData.phone.replace("+", "")}@phone.supabase.co`,
//           phone: formData.phone,
//           password: formData.password,
//           data: {
//             full_name: formData.fullName,
//           },
//         }),
//       });

//       const signUpData = await signUpResponse.json();

//       if (!signUpResponse.ok) {
//         throw new Error(
//           signUpData.error?.message || "Failed to create account"
//         );
//       }

//       // If signup successful, redirect to sign in
//       alert("Account created successfully!");
//       window.location.href = "/sign-in";
//     } catch (error) {
//       console.error("Verification error:", error);
//       setError(error.message || "Verification failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="signup-container">
//       <h2>Create Account</h2>
//       {!showVerification ? (
//         <form onSubmit={handleSignUp}>
//           {error && <div className="error-message">{error}</div>}

//           <div className="form-group">
//             <label htmlFor="fullName">Full Name</label>
//             <input
//               type="text"
//               id="fullName"
//               name="fullName"
//               value={formData.fullName}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="phone">Phone Number</label>
//             <input
//               type="tel"
//               id="phone"
//               name="phone"
//               placeholder="+1234567890"
//               value={formData.phone}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="password">Password</label>
//             <input
//               type="password"
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label htmlFor="confirmPassword">Confirm Password</label>
//             <input
//               type="password"
//               id="confirmPassword"
//               name="confirmPassword"
//               value={formData.confirmPassword}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <button type="submit" disabled={loading}>
//             {loading ? "Sending code..." : "Sign Up"}
//           </button>
//         </form>
//       ) : (
//         <form onSubmit={handleVerification}>
//           {error && <div className="error-message">{error}</div>}

//           <div className="form-group">
//             <label htmlFor="verificationCode">Enter Verification Code</label>
//             <input
//               type="text"
//               id="verificationCode"
//               value={verificationCode}
//               onChange={(e) => setVerificationCode(e.target.value)}
//               required
//             />
//           </div>

//           <button type="submit" disabled={loading}>
//             {loading ? "Verifying..." : "Verify Code"}
//           </button>
//         </form>
//       )}
//     </div>
//   );
// }

// export default SignUp;

import { useState } from "react";
import "./SignUp.css";
import { apiFetch } from "../api/client";
function SignUp() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.fullName
    ) {
      setError("All fields are required");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    // Basic phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError(
        "Please enter a valid phone number in international format (e.g., +1234567890)"
      );
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      setShowVerification(true);
      if (data.otp) {
        alert(`Use OTP ${data.otp} for local testing.`);
      } else {
        alert("Please enter the verification code sent to your phone.");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      if (error.message.includes("already registered")) {
        setError("This phone number is already registered. Please sign in.");
      } else {
        setError(error.message || "Sign-up failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          phone: formData.phone,
          token: verificationCode,
        }),
      });

      alert("Phone number verified successfully!");
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h2>Create Account</h2>
      {!showVerification ? (
        <form onSubmit={handleSignUp}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+1234567890"
              value={formData.phone}
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
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Sign Up"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerification}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="verificationCode">Enter Verification Code</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      )}
    </div>
  );
}

export default SignUp;
