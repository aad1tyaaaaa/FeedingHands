import "./PersonaTheme.css";
import "./ImageRecognition.css";
import Illustration from "./Illustration";
import FreshnessCheck from "./FreshnessCheck";

// /ImageRecognition (and /ArDetection): the one freshness page.
function ImageRecognition() {
  return (
    <div className="freshness-dashboard">
      <section className="workspace-heading">
        <div>
          <h1>Freshness check</h1>
          <p>Snap or upload a photo of the food. Our model rates it fresh, semi-fresh or spoiled before you donate.</p>
        </div>
        <Illustration name="hero-freshness" className="workspace-heading-art" />
      </section>
      <FreshnessCheck />
    </div>
  );
}

export default ImageRecognition;
