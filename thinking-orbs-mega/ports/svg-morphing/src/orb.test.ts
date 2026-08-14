import { describe, expect, it, vi } from "vitest";
import { MODE_DRAWS, resolvePreset, STATE_TO_MODE, type OrbSize, type OrbState } from "thinking-orbs";
import { createRecorder } from "./record.js";

const STATES = Object.keys(STATE_TO_MODE) as OrbState[];
const SIZES: OrbSize[] = [64, 20];

/**
 * The exactness contract: the recorder must capture EVERY primitive the
 * engine emits, for every state, size, theme, and a spread of clock values.
 * An unrecorded canvas op means the SVG output silently diverges from the
 * canvas original — that is the one failure mode this package must not have.
 */
describe("recording context covers the full engine surface", () => {
  for (const state of STATES) {
    for (const size of SIZES) {
      it(`${state} @ ${size}`, () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
          const { mode, opts } = resolvePreset(state, size);
          const draw = MODE_DRAWS[mode];
          const { ctx, ops } = createRecorder();
          for (const t of [0, 0.6, 1.7, 9.3, 42.1]) {
            for (const dark of [false, true]) {
              (ctx as unknown as { clearRect(): void }).clearRect();
              draw(ctx, size, t, dark, opts);
              const frame = ops();
              // Every state paints a real frame — an empty frame means the
              // recorder missed the ink path entirely.
              expect(frame.length).toBeGreaterThan(0);
              for (const op of frame) {
                if (op.kind === "circle") {
                  expect(Number.isFinite(op.x + op.y + op.r)).toBe(true);
                  expect(op.fill).toMatch(/^rgba\(/);
                } else {
                  expect(Number.isFinite(op.x1 + op.y1 + op.x2 + op.y2 + op.w)).toBe(true);
                  expect(op.stroke).toMatch(/^rgba\(/);
                }
              }
            }
          }
          const drift = warn.mock.calls.filter(
            (c) => typeof c[0] === "string" && c[0].includes("unrecorded canvas op"),
          );
          expect(drift).toEqual([]);
        } finally {
          warn.mockRestore();
        }
      });
    }
  }
});
