import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ORB_CONFIG, chooseRenderMode } from "../src/render-policy.ts";

test("uses 64px images only when the interactive terminal supports them", () => {
  assert.deepEqual(DEFAULT_ORB_CONFIG, {
    size: 64,
    editorPollMs: 100,
  });
  assert.equal(chooseRenderMode({ interactive: true, imageProtocol: "kitty" }), "image");
  assert.equal(chooseRenderMode({ interactive: true, imageProtocol: null }), "spinner");
  assert.equal(chooseRenderMode({ interactive: false, imageProtocol: "kitty" }), "off");
});
