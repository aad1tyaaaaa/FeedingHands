import React from "react";
import "./Contact.css";
import { Link, useNavigate } from "react-router-dom";
import { FaChartBar, FaLeaf, FaHandsHelping } from "react-icons/fa"; // Import icons
import "./VolunteerForm";
import "./FundraisingPage";
import "./BiogasDonation";

function Contact() {
  return (
    <div className="activity">
      <h1 className="activity-title">OUR ACTIVITY</h1>
      <p className="activity-subtitle">
        INCREASE IN THE AWARENESS AMONG PEOPLE ABOUT VARIOUS ISSUES
      </p>

      <div className="activity-container">
        <div className="activity-card">
          <FaChartBar className="activity-icon" />
          <h2>Fundraising</h2>
          <p>
            Support our mission by organizing events or donating! Every
            contribution helps provide meals, improve food distribution, and
            create a sustainable system to fight hunger in our communities.
          </p>
          <Link to="/FundraisingPage ">
            <button className="activity-button">➜</button>
          </Link>
        </div>

        <div className="activity-card">
          <FaLeaf className="activity-icon" />
          <h2>Volunteering</h2>
          <p>
            Make an impact by donating your time! Help distribute food, assist
            in events, and spread awareness to fight hunger, reduce waste, and
            create a healthier, kinder world.
          </p>
          <Link to="/VolunteerForm">
            <button className="activity-button">➜</button>
          </Link>
        </div>

        <div className="activity-card">
          <FaHandsHelping className="activity-icon" />
          <h2>Food to Biogas</h2>
          <p>
            Convert food waste into renewable energy! Join the green revolution
            by turning leftover food into biogas for a cleaner, sustainable
            future.
          </p>
          <Link to="/BiogasDonation">
            <button className="activity-button">➜</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Contact;
