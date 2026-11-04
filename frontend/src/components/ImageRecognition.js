import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import {
  AlertTriangle, ArrowRight, Camera, CameraOff, CheckCircle2, HelpCircle, ImageUp, Lightbulb, Loader2, RefreshCw, XCircle,
} from "lucide-react";
import "./PersonaTheme.css";
import "./ImageRecognition.css";
import Illustration from "./Illustration";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LIVE_INTERVAL_MS = 300; // camera predictions per second ≈ 3: smooth enough, light on battery
const MIN_CONFIDENCE = 0.6; // below this the top label is a coin toss, so say so

// What each model label means for the user, and what to do next.
const VERDICTS = {
  Fresh: {
    tone: "fresh", icon: CheckCircle2, title: "Looks fresh",
    advice: "Good to donate. Pack it covered and note when it was cooked.",
    action: { to: "/Donate", label: "Donate this food" },
  },
  "Semi-Fresh": {
    tone: "semi", icon: AlertTriangle, title: "Eat or donate today",
    advice: "Still safe if it's picked up soon. Mention the timing in your donation notes.",
    action: { to: "/Donate", label: "Donate it now" },
  },
  Spoiled: {
    tone: "spoiled", icon: XCircle, title: "Not safe to eat",
    advice: "Please don't donate this as food. It can still become clean energy.",
    action: { to: "/BiogasDonation", label: "Schedule a biogas pickup" },
  },
  unsure: {
    tone: "unsure", icon: HelpCircle, title: "Not sure",
    advice: "The model can't tell from this photo. Try daylight and a closer shot of one dish, or check by smell and look.",
    action: null,
  },
};

// Loads the Teachable Machine export (a plain Keras model) with TF.js itself, then runs one throwaway
// prediction: on WebGL the first run after loading returned garbage, so every user's first check was wrong.
async function loadModel() {
  const [net, meta] = await Promise.all([tf.loadLayersModel("/model.json"), fetch("/metadata.json").then((r) => r.json())]);
  const size = meta.imageSize || 224;
  const warm = net.predict(tf.zeros([1, size, size, 3]));
  await warm.data();
  warm.dispose();
  return { net, labels: meta.labels, size };
}

// Center-crops an image, video or canvas to the model's input size and classifies it
// (Teachable Machine's preprocessing: RGB scaled to -1..1).
async function classify(model, source) {
  const size = model.size;
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  const scale = size / Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
  const pixels = ctx.getImageData(0, 0, size, size);

  const probs = tf.tidy(() =>
    model.net.predict(tf.browser.fromPixels(pixels).expandDims(0).toFloat().div(127).sub(1)),
  );
  const values = await probs.data();
  probs.dispose();

  const scores = model.labels.map((label, i) => ({ label, value: values[i] }));
  const best = scores.reduce((a, b) => (b.value > a.value ? b : a));
  return { label: best.label, confidence: best.value, scores };
}

function ImageRecognition() {
  const [model, setModel] = useState(null);
  const [mode, setMode] = useState("upload");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadModel()
      .then((m) => alive && setModel(m))
      .catch(() => alive && setError("Couldn't load the freshness model. Check your connection and refresh."));
    return () => {
      alive = false;
    };
  }, []);

  // Free the previous preview's memory whenever it changes.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image (JPEG, PNG or WebP).");
    if (file.size > MAX_FILE_SIZE) return setError("That image is over 5 MB. Try a smaller photo.");
    setError("");
    setResult(null);
    setPreview(URL.createObjectURL(file));
  };

  // Runs when the preview <img> has decoded, so prediction never races the image load.
  const analyze = useCallback(async () => {
    if (!model || !imageRef.current) return;
    setBusy(true);
    try {
      setResult(await classify(model, imageRef.current));
    } catch {
      setError("Analysis failed. Please try another photo.");
    } finally {
      setBusy(false);
    }
  }, [model]);

  // Model finished loading after a photo was already chosen.
  useEffect(() => {
    if (model && preview && !result && imageRef.current?.complete) analyze();
  }, [model, preview, result, analyze]);

  // Live camera: open while in camera mode, classify a few frames a second, release on leave.
  useEffect(() => {
    if (mode !== "camera" || !model) return undefined;
    let stream;
    let timer;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setCameraLive(true);
        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2) {
            const next = await classify(model, video);
            if (stopped) return; // camera closed mid-prediction: don't overwrite the upload's result
            setResult(next);
          }
          timer = setTimeout(tick, LIVE_INTERVAL_MS);
        };
        tick();
      } catch {
        if (stopped) return;
        setError("Camera unavailable. Allow camera access in your browser, or upload a photo instead.");
        setMode("upload");
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      setCameraLive(false);
    };
  }, [mode, model]);

  const switchMode = (next) => {
    setMode(next);
    setResult(null);
    setError("");
  };

  const verdict = result && (result.confidence < MIN_CONFIDENCE ? VERDICTS.unsure : VERDICTS[result.label]);
  const Icon = verdict?.icon;

  return (
    <div className="freshness-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Freshness check</h1>
          <p>Snap or upload a photo of the food. Our model rates it fresh, semi-fresh or spoiled before you donate.</p>
        </div>
        <Illustration name="hero-freshness" className="workspace-heading-art" />
        <span className={`freshness-model ${model ? "ready" : ""}`} role="status">
          {model ? <><span className="freshness-dot" /> Model ready</> : <><Loader2 size={15} className="spin" /> Loading model…</>}
        </span>
      </section>

      {error && <p className="freshness-error" role="alert">{error}</p>}

      <div className="freshness-layout">
        <section className="workspace-panel freshness-input">
          <div className="freshness-tabs" role="tablist" aria-label="Photo source">
            <button type="button" role="tab" aria-selected={mode === "upload"} onClick={() => switchMode("upload")}>
              <ImageUp size={16} /> Upload
            </button>
            <button type="button" role="tab" aria-selected={mode === "camera"} onClick={() => switchMode("camera")} disabled={!model}>
              <Camera size={16} /> Live camera
            </button>
          </div>

          {mode === "upload" ? (
            <>
              <div
                className={`freshness-drop${dragging ? " is-dragging" : ""}${preview ? " has-image" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={preview ? "Choose a different photo" : "Choose a photo"}
                onClick={() => fileInputRef.current.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fileInputRef.current.click())}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
              >
                {preview ? (
                  <>
                    <img ref={imageRef} src={preview} alt="Food to check" onLoad={analyze} />
                    {busy && <span className="freshness-scan" aria-hidden="true" />}
                  </>
                ) : (
                  <div className="freshness-placeholder">
                    <span className="freshness-placeholder-icon"><ImageUp size={28} /></span>
                    <strong>Drop a photo here</strong>
                    <span>or click to choose · JPEG, PNG or WebP up to 5 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {preview && (
                <div className="freshness-row">
                  <button type="button" className="workspace-secondary" onClick={() => fileInputRef.current.click()}>
                    <RefreshCw size={15} /> Try another photo
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="freshness-camera" aria-label="Live camera">
                <video className="freshness-camera-feed" ref={videoRef} muted playsInline />
                {!cameraLive && <span className="freshness-camera-wait"><Loader2 size={20} className="spin" /> Starting camera…</span>}
              </div>
              <div className="freshness-row">
                <span className="workspace-muted">Point the camera at one dish. The result updates live.</span>
                <button type="button" className="workspace-secondary" onClick={() => switchMode("upload")}>
                  <CameraOff size={15} /> Stop camera
                </button>
              </div>
            </>
          )}
        </section>

        <section className="workspace-panel freshness-result" aria-live="polite">
          <div className="workspace-panel-heading"><h2>Result</h2></div>
          {result && verdict ? (
            <>
              <div className={`freshness-verdict ${verdict.tone}`}>
                <Icon size={30} aria-hidden="true" />
                <div>
                  <strong>{verdict.title}</strong>
                  <span>{result.label} · {Math.round(result.confidence * 100)}% confident</span>
                </div>
              </div>
              <p className="freshness-advice">{verdict.advice}</p>

              <ul className="freshness-scores" aria-label="Model scores">
                {result.scores.map((s) => (
                  <li key={s.label} className={VERDICTS[s.label]?.tone}>
                    <span>{s.label}</span>
                    <span className="freshness-bar"><span style={{ width: `${s.value * 100}%` }} /></span>
                    <span className="freshness-pct">{Math.round(s.value * 100)}%</span>
                  </li>
                ))}
              </ul>

              {verdict.action && (
                <Link className="workspace-primary" to={verdict.action.to}>
                  {verdict.action.label} <ArrowRight size={16} />
                </Link>
              )}
            </>
          ) : (
            <div className="workspace-empty">
              <Illustration name="scan-tomato" className="workspace-empty-art" />
              <p>{busy ? "Checking the photo…" : "Your result appears here as soon as you add a photo."}</p>
            </div>
          )}

          <div className="freshness-tips">
            <Lightbulb size={17} aria-hidden="true" />
            <p>For the best result, use daylight, fill the frame with one dish, and avoid heavy filters. The model is a guide; trust your nose too.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ImageRecognition;
