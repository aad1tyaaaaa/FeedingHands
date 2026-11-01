import { useState, useRef, useEffect } from "react";
import * as tmImage from "@teachablemachine/image";
import "./ImageRecognition.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function ImageRecognition() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  const [webcamMode, setWebcamMode] = useState(false);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const webcamRef = useRef(null);
  const webcamInstance = useRef(null);

  // Load Teachable Machine model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        const modelURL = "./model.json";
        const metadataURL = "./metadata.json";
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        console.log("Model loaded successfully!");
      } catch (err) {
        console.error("Error loading model:", err);
        setError("Failed to load AI model. Please refresh.");
      }
    };
    loadModel();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      resetFileInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      resetFileInput();
      return;
    }

    setImage(file);
    const imgURL = URL.createObjectURL(file);
    setImagePreview(imgURL);
    setResult(null);
    setError(null);
    stopWebcam();
  };

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!image || !model) {
      setError("Please upload an image and ensure model is loaded.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      imageRef.current.src = imagePreview;
      await new Promise((resolve) => {
        imageRef.current.onload = resolve;
      });

      const prediction = await model.predict(imageRef.current);

      let highestProb = 0;
      let predictedClass = "";
      prediction.forEach((p) => {
        if (p.probability > highestProb) {
          highestProb = p.probability;
          predictedClass = p.className;
        }
      });

      setResult({
        class: predictedClass,
        confidence: (highestProb * 100).toFixed(1),
      });
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startWebcam = async () => {
    if (!model) {
      setError("Model not loaded yet.");
      return;
    }
    stopWebcam();

    const webcam = new tmImage.Webcam(300, 300, true); // width, height, flip
    webcamRef.current.innerHTML = "";
    await webcam.setup();
    await webcam.play();
    webcamRef.current.appendChild(webcam.canvas);
    webcamInstance.current = webcam;
    setWebcamMode(true);

    window.requestAnimationFrame(loopWebcam);
  };

  const loopWebcam = async () => {
    if (webcamInstance.current && webcamMode) {
      webcamInstance.current.update();
      const prediction = await model.predict(webcamInstance.current.canvas);

      let highestProb = 0;
      let predictedClass = "";
      prediction.forEach((p) => {
        if (p.probability > highestProb) {
          highestProb = p.probability;
          predictedClass = p.className;
        }
      });

      setResult({
        class: predictedClass,
        confidence: (highestProb * 100).toFixed(1),
      });

      window.requestAnimationFrame(loopWebcam);
    }
  };

  const stopWebcam = () => {
    if (webcamInstance.current) {
      webcamInstance.current.stop();
      webcamInstance.current = null;
      setWebcamMode(false);
    }
  };

  const getFreshnessColor = (score) => {
    if (score >= 80) return "#4CAF50";
    if (score >= 50) return "#FFC107";
    return "#F44336";
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Food Freshness Detector</h1>
        <p className="subtitle">Upload an image or use your webcam for live freshness detection</p>
      </div>

      <div className="main-content">
        <div className="upload-section">
          {!webcamMode && (
            <>
              <div
                className="upload-area"
                onClick={() => fileInputRef.current.click()}
                style={{ cursor: loading ? "wait" : "pointer" }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="image-preview"
                    ref={imageRef}
                  />
                ) : (
                  <div className="upload-placeholder">
                    <i className="upload-icon">📷</i>
                    <p>
                      {loading ? "Processing..." : "Click to select an image"}
                      <br />
                      {!loading && "or drag and drop"}
                    </p>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                style={{ display: "none" }}
                disabled={loading}
              />

              <button
                className={`analyze-button ${loading ? "disabled" : ""}`}
                onClick={handleAnalyze}
                disabled={loading || !image}
              >
                {loading ? "Analyzing..." : "Analyze Food"}
              </button>
            </>
          )}

          

          {error && <div className="error-message">⚠️ {error}</div>}
        </div>

        {webcamMode && <div ref={webcamRef}></div>}

        {result && (
          <div className="result-section">
            <h2>Analysis Results</h2>
            <div
              className="result-card"
              style={{ borderLeft: `8px solid ${getFreshnessColor(result.confidence)}` }}
            >
              <p><b>Status:</b> {result.class}</p>
              <p><b>Confidence:</b> {result.confidence}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageRecognition;
