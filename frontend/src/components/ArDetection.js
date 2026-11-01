import React, { useState, useEffect, useRef } from 'react';
import * as tmImage from '@teachablemachine/image';
import CameraConnectionUI from './CameraConnectionUI';
import WebcamContainer from './WebcamContainer';
import ResultContainer from './ResultContainer';
import './ArDetection.css';

const ArDetection = () => {
  const [model, setModel] = useState(null);
  const [maxPredictions, setMaxPredictions] = useState(0);
  const [imageCapture, setImageCapture] = useState(null);
  const [freshnessStatus, setFreshnessStatus] = useState(null);
  const [expiryEstimate, setExpiryEstimate] = useState(null);
  const [confidenceLevel, setConfidenceLevel] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize the Teachable Machine model
  useEffect(() => {
    const initModel = async () => {
      try {
        const modelURL = "./model.json";
        const metadataURL = "./metadata.json";
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        setMaxPredictions(loadedModel.getTotalClasses());
      } catch (error) {
        console.error("Error initializing model:", error);
      }
    };

    initModel();
  }, []);

  // Capture and predict function
  const captureAndPredict = async () => {
    if (!model || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    const prediction = await model.predict(canvas);
    let highestProbability = 0;
    let predictedClass = "";

    prediction.forEach((item) => {
      if (item.probability > highestProbability) {
        highestProbability = item.probability;
        predictedClass = item.className;
      }
    });

    setFreshnessStatus(predictedClass);
    setConfidenceLevel((highestProbability * 100).toFixed(1));
    setExpiryEstimate(calculateExpiryDate(predictedClass));
  };

  // Calculate expiry date based on freshness category
  const calculateExpiryDate = (freshnessCategory) => {
    const today = new Date();
    const category = freshnessCategories[freshnessCategory];

    if (!category) return "Unknown";
    if (category.maxDays === 0) return "Expired";

    const avgDays = (category.minDays + category.maxDays) / 2;
    const expiryDate = new Date(today.getTime() + avgDays * 24 * 60 * 60 * 1000);
    return expiryDate.toLocaleDateString();
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imageRef.current.src = e.target.result;
        imageRef.current.style.display = 'block';
        setIsConnected(true);
        setImageCapture(imageRef.current);
      };
      reader.readAsDataURL(file);
    }
  };

  // Freshness categories
  const freshnessCategories = {
    "Fresh": { minDays: 3, maxDays: 5, color: "#4CAF50" },
    "Semi-Fresh": { minDays: 1, maxDays: 2, color: "#FFC107" },
    "Spoiled": { minDays: 0, maxDays: 0, color: "#F44336" }
  };

  return (
    <div className="App">
      <h1>Food Freshness Detector</h1>
      <CameraConnectionUI 
        setImageCapture={setImageCapture} 
        setIsConnected={setIsConnected} 
        imageRef={imageRef}
        handleImageUpload={handleImageUpload}
      />
      <WebcamContainer 
        imageRef={imageRef} 
        canvasRef={canvasRef} 
        isConnected={isConnected}
      />
      <ResultContainer 
        freshnessStatus={freshnessStatus} 
        expiryEstimate={expiryEstimate} 
        confidenceLevel={confidenceLevel} 
        captureAndPredict={captureAndPredict}
      />
    </div>
  );
};

export default ArDetection;