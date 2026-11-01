import React from "react";
import { Link } from "react-router-dom";
import "./Note.css";
import "./VolunteerForm";

function Note() {
  console.log("Note component is being rendered");
  return (
    <div className="note">
      <div className="content">
        <div className="bg-img">
          <div className="hero-content">
            <h1>
              Share Food, Share Love, <br /> Share Hope
            </h1>
            <p>
              Join our mission to fight hunger and reduce food waste. Every{" "}
              <br /> donation makes a difference in someone's life.
            </p>

            <Link to="/sign-in">
              <button className="heroDonate-btn" aria-label="Donate Now">
                Donate Now
              </button>
            </Link>

            <Link to="/Register">
              <button
                className="heroRegister-btn"
                aria-label="Register your organisation"
              >
                Register Your Organization
              </button>
            </Link>
          </div>
        </div>
      </div>
      <div className="info-section">
        <h2>How Can You Help</h2>
        <div className="help-options">
          <div className="help-option">
            <h3>Donate Non-Perishable Food</h3>
            <p>
              Provide canned goods, rice, pasta, and other non-perishable items
              that can help feed those in need.
            </p>
          </div>

          <div className="help-option">
            <h3>Donate Fresh Produce</h3>
            <p>
              Fruits and vegetables are essential for a balanced diet. Help
              provide fresh, nutritious food to the community.
            </p>
          </div>

          <div className="help-option">
            <h3>Donate Prepared Meals</h3>
            <p>
              If you have prepared meals that are still safe to consume, share
              them with those who may be unable to cook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Note;
