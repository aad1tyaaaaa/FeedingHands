import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignInClick = () => {
    navigate("/signin");
  };

  return (
    <div>
      <div className="top_nav">
        <p>+91 093-120-525-9162</p>
        <p>info@gmail.com</p>
        <button className="join">Join us Now</button>
      </div>
      <header className="header">
        <div className="logo">
          <h2>FeedingHands</h2>
        </div>

        <div className="hamburger" onClick={toggleMenu}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>

        <nav className={`nav-links ${isMenuOpen ? "nav-active" : ""}`}>
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/about" className="nav-link">
            About
          </Link>
          <Link to="/donate" className="nav-link">
            Donate
          </Link>
          <Link to="/contacts" className="nav-link">
            Contacts
          </Link>
          <div className="buttons">
            <Link to="/sign-in">
              <button className="signin-btn" onClick={handleSignInClick}>
                Sign In
              </button>
            </Link>
            <Link to="/sign-up">
              <button className="signup-btn">Sign Up</button>
            </Link>
          </div>
        </nav>
      </header>
    </div>
  );
}

export default Header;
