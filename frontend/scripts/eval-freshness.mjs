// Grades the freshness model on your own labelled photos before it ships.
//
//   node scripts/eval-freshness.mjs <photos-dir> [model-dir=public]
//
// <photos-dir> holds one folder per true label, named exactly like a model label (Fresh, Semi-Fresh,
// Spoiled, ...). Any other folder name (e.g. NotFood) means "the app should answer Not sure".
// Preprocessing matches classify() in src/components/FreshnessCheck.js. Exits 1 below PASS accuracy.
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp"; // installed with next
import fs from "node:fs";
import path from "node:path";

const MIN_CONFIDENCE = 0.6; // keep in sync with FreshnessCheck.js
const PASS = 0.8;

const [photosDir, modelDir = "public"] = process.argv.slice(2);
if (!photosDir) {
  console.error("usage: node scripts/eval-freshness.mjs <photos-dir> [model-dir]");
  process.exit(2);
}

const topology = JSON.parse(fs.readFileSync(path.join(modelDir, "model.json")));
const meta = JSON.parse(fs.readFileSync(path.join(modelDir, "metadata.json")));
const weights = fs.readFileSync(path.join(modelDir, "weights.bin"));
const net = await tf.loadLayersModel(tf.io.fromMemory({
  modelTopology: topology.modelTopology,
  weightSpecs: topology.weightsManifest.flatMap((g) => g.weights),
  weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.length),
}));
const size = meta.imageSize || 224;

let right = 0;
let total = 0;
let worst = 1;
for (const folder of fs.readdirSync(photosDir).filter((d) => fs.statSync(path.join(photosDir, d)).isDirectory())) {
  const expected = meta.labels.includes(folder) ? folder : "Not sure";
  const shown = {};
  let ok = 0;
  let n = 0;
  for (const file of fs.readdirSync(path.join(photosDir, folder))) {
    let pixels;
    try {
      pixels = await sharp(path.join(photosDir, folder, file)).rotate().removeAlpha().resize(size, size, { fit: "cover" }).raw().toBuffer();
    } catch {
      continue; // not an image
    }
    const probs = tf.tidy(() => net.predict(tf.tensor3d(pixels, [size, size, 3], "int32").toFloat().div(127).sub(1).expandDims(0)).dataSync());
    const best = probs.indexOf(Math.max(...probs));
    const answer = probs[best] < MIN_CONFIDENCE ? "Not sure" : meta.labels[best];
    shown[answer] = (shown[answer] || 0) + 1;
    if (answer === expected) ok += 1;
    n += 1;
  }
  if (!n) continue;
  right += ok;
  total += n;
  worst = Math.min(worst, ok / n);
  console.log(`${folder.padEnd(12)} ${ok}/${n} right (${Math.round((100 * ok) / n)}%)  app showed: ${JSON.stringify(shown)}`);
}

if (!total) {
  console.error("No photos found.");
  process.exit(2);
}
const pass = right / total >= PASS && worst >= PASS;
console.log(`\noverall ${Math.round((100 * right) / total)}%, worst folder ${Math.round(100 * worst)}% -> ${pass ? "PASS" : `FAIL (needs ${PASS * 100}% overall and per folder)`}`);
process.exit(pass ? 0 : 1);
