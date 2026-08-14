import assert from "node:assert/strict";
import test from "node:test";
import { renderOrbFrame } from "../src/renderer.ts";
import type { OrbVisualState } from "../src/activity.ts";

const STATES: OrbVisualState[] = [
  "working",
  "searching",
  "solving",
  "listening",
  "composing",
  "shaping",
];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("renders every upstream mode as a valid 64x64 RGBA PNG", () => {
  for (const state of STATES) {
    const frame = renderOrbFrame(state, 1.25, true);
    const png = Buffer.from(frame.base64, "base64");

    assert.equal(frame.widthPx, 64, state);
    assert.equal(frame.heightPx, 64, state);
    assert.deepEqual(png.subarray(0, 8), PNG_SIGNATURE, state);
    assert.equal(png.readUInt32BE(16), 64, state);
    assert.equal(png.readUInt32BE(20), 64, state);
    assert.equal(png[25], 6, `${state} must use RGBA color`);
  }
});
