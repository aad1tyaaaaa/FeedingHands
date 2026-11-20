import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PHOTO_BYTES, fitWithin, photoError } from "./photos.mjs";

const file = (type, size = 1000, name = "food.jpg") => ({ type, size, name });

test("accepts PNG, JPEG and WebP up to 2 MB", () => {
  assert.equal(photoError(file("image/png")), "");
  assert.equal(photoError(file("image/jpeg", MAX_PHOTO_BYTES)), "");
  assert.equal(photoError(file("image/webp"), 2), "");
});

test("rejects other types", () => {
  assert.match(photoError(file("image/gif")), /PNG, JPEG or WebP/);
  assert.match(photoError(file("application/pdf")), /PNG, JPEG or WebP/);
});

test("rejects files over 2 MB", () => {
  assert.match(photoError(file("image/png", MAX_PHOTO_BYTES + 1)), /over 2 MB/);
});

test("rejects a fourth photo", () => {
  assert.match(photoError(file("image/png"), 3), /up to 3/);
});

test("shrinks the longest side to 1280 px, keeps proportions, never enlarges", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1280, height: 960 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 960, height: 1280 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
});
