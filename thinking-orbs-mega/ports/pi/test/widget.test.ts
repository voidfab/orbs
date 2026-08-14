import assert from "node:assert/strict";
import test from "node:test";
import type { TUI } from "@earendil-works/pi-tui";
import { OrbImageWidget, OrbSpinnerWidget } from "../src/widget.ts";

const tui = {
  requestRender() {},
} as unknown as TUI;

test("fallback spinner never renders beyond the available terminal width", () => {
  const widget = new OrbSpinnerWidget(tui, (text) => text, "listening");
  const [line] = widget.render(5);

  assert.equal(Array.from(line).length, 5);
  assert.equal(line, "⠋ lis");
});

test("image widget uses the injected renderer and current appearance", () => {
  const calls: Array<{ state: string; timeSeconds: number; dark: boolean }> = [];
  const widget = new OrbImageWidget(
    tui,
    (text) => text,
    "working",
    (state, timeSeconds, dark) => {
      calls.push({ state, timeSeconds, dark });
      return { base64: "", widthPx: 64, heightPx: 64 };
    },
    false,
  );

  widget.tick(1.25);
  widget.render(80);
  assert.deepEqual(calls, [
    { state: "working", timeSeconds: 1.25, dark: false },
  ]);
});

test("image widget reports a renderer failure only once", () => {
  const errors: Error[] = [];
  const failure = new Error("canvas failed");
  const widget = new OrbImageWidget(
    tui,
    (text) => text,
    "working",
    () => {
      throw failure;
    },
    true,
    (error) => errors.push(error),
  );

  assert.deepEqual(widget.render(8), ["Orb rend"]);
  assert.deepEqual(widget.render(80), ["Orb renderer unavailable"]);
  assert.deepEqual(errors, [failure]);
});
