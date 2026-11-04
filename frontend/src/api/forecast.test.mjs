import test from "node:test";
import assert from "node:assert/strict";
import { forecast } from "./forecast.mjs";

test("continues a straight trend", () => {
  assert.deepEqual(forecast([1, 2, 3, 4], 2), [5, 6]);
});

test("flat series stays flat", () => {
  assert.deepEqual(forecast([3, 3, 3], 3), [3, 3, 3]);
});

test("never forecasts negative donations", () => {
  assert.deepEqual(forecast([4, 2, 0], 2), [0, 0]);
});

test("empty history forecasts zero", () => {
  assert.deepEqual(forecast([], 2), [0, 0]);
});
