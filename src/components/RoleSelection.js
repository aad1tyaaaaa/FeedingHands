// components/RoleSelection.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RoleSelection.css";
import { apiFetch, setToken } from "../api/client";

const RoleSelection = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function verifyUser() {
      try {
        const data = await apiFetch("/api/auth/me");
        const role = data.user?.role;
        if (role && role !== "pending") {
          if (role === "volunteer") navigate("/VolunteerDashboard");
          else if (role === "organization") navigate("/NgoDashboard");
          else navigate("/dashboard");
        }
      } catch (error) {
        navigate("/sign-in");
      }
    }
    verifyUser();
  }, [navigate]);

  const handleRoleSelect = async (role) => {
    setMessage("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/role", {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (data.access_token) {
        setToken(data.access_token);
      }
      if (data.user) {
        localStorage.setItem("fh_user", JSON.stringify(data.user));
      }
      if (role === "volunteer") {
        navigate("/VolunteerDashboard");
      } else if (role === "organization") {
        navigate("/NgoDashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setMessage(error.message || "Unable to update role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-selection-container">
      <h1 className="welcome-title">Join the Food Revolution</h1>
      <p className="welcome-subtitle">Select your role to continue</p>
      {message && <div className="role-error">{message}</div>}
      <div className="role-cards">
        <div className="role-card donor-card">
          <div className="card-icon">🍲</div>
          <h2>Food Donor</h2>
          <p>Individuals or businesses who want to donate meals, ingredients, or supplies.</p>
          <button
            className="role-button"
            onClick={() => handleRoleSelect("donor")}
            disabled={loading}
          >
            I Want to Donate
          </button>
        </div>

        <div className="role-card volunteer-card">
          <div className="card-icon">🤝</div>
          <h2>Volunteer</h2>
          <p>Help with collection, sorting, delivery, and community outreach.</p>
          <button
            className="role-button"
            onClick={() => handleRoleSelect("volunteer")}
            disabled={loading}
          >
            Become a Volunteer
          </button>
        </div>

        <div className="role-card organization-card">
          <div className="card-icon">🏢</div>
          <h2>Organization</h2>
          <p>Teams, NGOs, or community groups coordinating food distribution.</p>
          <button
            className="role-button"
            onClick={() => handleRoleSelect("organization")}
            disabled={loading}
          >
            Register Organization
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
