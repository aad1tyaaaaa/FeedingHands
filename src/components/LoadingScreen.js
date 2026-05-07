import React, { useEffect } from "react";
import "./LoadingScreen.css";

function LoadingScreen({ onLoaded }) {
  useEffect(() => {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const loadingComplete = document.getElementById("loadingComplete");
    const particlesContainer = document.getElementById("particles");
    const flyingFoodsContainer = document.getElementById("flying-foods");
    const heartBitsContainer = document.getElementById("heart-bits");

    // Create particle elements
    function createParticles() {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");
        const size = Math.random() * 10 + 5;
        const posX = Math.random() * 100;
        const delay = Math.random() * 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.animationDelay = `${delay}s`;
        particlesContainer.appendChild(particle);
      }
    }

    // Create flying food elements
    function createFlyingFoods() {
      const foodTypes = [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Cpath d='M25,10 C30,2 40,5 40,15 C40,30 25,45 25,45 C25,45 10,30 10,15 C10,5 20,2 25,10 Z' fill='%23e74c3c'/%3E%3Cpath d='M25,5 L27,10 L25,12 L23,10 Z' fill='%2327ae60'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Cpath d='M5,15 Q25,5 45,15 L45,30 Q25,40 5,30 Z' fill='%23e67e22'/%3E%3Cpath d='M10,18 Q25,10 40,18 L40,27 Q25,35 10,27 Z' fill='%23f39c12'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Cpath d='M25,5 L30,10 L30,40 Q27,45 25,45 Q23,45 20,40 L20,10 Z' fill='%23e67e22'/%3E%3Cpath d='M20,10 L30,10 L25,5 Z' fill='%23d35400'/%3E%3Cpath d='M25,5 L23,0 L21,2 M25,5 L27,0 L29,2 M25,5 L25,0 L25,2' stroke='%232ecc71' stroke-width='2'/%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Cpath d='M15,10 L35,10 L38,20 L38,45 L12,45 L12,20 Z' fill='%23ecf0f1'/%3E%3Cpath d='M12,20 L38,20 L35,10 L15,10 Z' fill='%23bdc3c7'/%3E%3Cpath d='M20,5 L30,5 L35,10 L15,10 Z' fill='%2395a5a6'/%3E%3C/svg%3E",
      ];

      for (let i = 0; i < 12; i++) {
        const food = document.createElement("div");
        food.classList.add("flying-food");
        const foodType =
          foodTypes[Math.floor(Math.random() * foodTypes.length)];
        const posX = 10 + Math.random() * 80;
        const delay = Math.random() * 10;
        const duration = 5 + Math.random() * 5;
        food.style.backgroundImage = `url("${foodType}")`;
        food.style.left = `${posX}%`;
        food.style.animationDelay = `${delay}s`;
        food.style.animationDuration = `${duration}s`;
        flyingFoodsContainer.appendChild(food);
      }
    }

    // Create heart bit elements
    function createHeartBits() {
      for (let i = 0; i < 12; i++) {
        const heart = document.createElement("div");
        heart.classList.add("heart-bit");
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        heart.style.setProperty("--tx", `${tx}px`);
        heart.style.setProperty("--ty", `${ty}px`);
        heart.style.animationDelay = `${i * 0.3}s`;
        heartBitsContainer.appendChild(heart);
      }
    }

    // Simulate loading progress with natural variation and integer percentage values
    function simulateLoading() {
      let count = 0;
      const finalDelay = 500; // Delay after reaching 100%
      const interval = setInterval(() => {
        const increment = Math.floor(Math.random() * 3) + 1;
        count = Math.min(100, count + increment);
        if (count >= 100) {
          count = 100;
          clearInterval(interval);
          progressText.textContent = "Ready!";
          setTimeout(() => {
            loadingComplete.classList.add("show");
            if (typeof onLoaded === "function") {
              onLoaded();
            }
          }, finalDelay);
        } else {
          progressText.textContent = `Loading... ${count}%`;
        }
        progressBar.style.width = `${count}%`;
      }, 100);
    }

    createParticles();
    createFlyingFoods();
    createHeartBits();
    simulateLoading();
  }, [onLoaded]);

  return (
    <div className="container">
      {/* Background Effects */}
      <div className="donation-effect"></div>
      <div className="donation-effect"></div>
      <div className="donation-effect"></div>

      <div className="particles-container" id="particles"></div>

      {/* Header Text */}
      <div className="hero-text">
        <h1>Nourishing Together</h1>
        <p>Connecting food with hope, one donation at a time</p>
      </div>

      {/* Main Animation */}
      <div className="animation-container">
        <div className="globe"></div>
        <div className="orbit">
          <div className="food-item apple"></div>
          <div className="food-item bread"></div>
          <div className="food-item carrot"></div>
          <div className="food-item milk"></div>
        </div>
      </div>

      {/* Hand Animations */}
      <div className="hands-container">
        <div className="hand hand-left"></div>
        <div className="hand hand-right"></div>
      </div>

      {/* Flying Food Elements */}
      <div className="flying-food-container" id="flying-foods"></div>

      {/* Heart Bits Animation */}
      <div className="heart-bits-container" id="heart-bits"></div>

      {/* Progress Tracker */}
      <div className="progress-container">
        <div className="progress-track">
          <div className="progress-bar" id="progressBar"></div>
        </div>
        <div className="progress-text" id="progressText">
          Loading... 0%
        </div>
      </div>

      {/* Loading Complete Overlay */}
      <div className="loading-complete" id="loadingComplete">
        <div className="check-icon">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#27ae60"
              strokeWidth="8"
            />
            <path
              id="check"
              d="M30,50 L45,65 L70,35"
              fill="none"
              stroke="#27ae60"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
