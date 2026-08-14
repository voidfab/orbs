import { describe, expect, it } from "vitest";
import { MODE_DRAWS, resolvePreset } from "thinking-orbs";
import { morphOps } from "./morph.js";
import { createRecorder, type RecordedOp } from "./record.js";

function renderFrame(state: "working" | "connecting", t: number): RecordedOp[] {
  const { mode, opts } = resolvePreset(state, 64);
  const { ctx, ops } = createRecorder();
  MODE_DRAWS[mode](ctx, 64, t, false, opts);
  return [...ops()];
}

describe("morphOps", () => {
  const from = renderFrame("connecting", 1.7);
  const to = renderFrame("working", 1.7);

  it("returns the endpoint frames untouched at f=0 and f=1", () => {
    expect(morphOps(from, to, 0)).toBe(from);
    expect(morphOps(from, to, 1)).toBe(to);
  });

  it("blends every dot with a partner mid-morph — nothing pops", () => {
    const mid = morphOps(from, to, 0.5);
    const circles = mid.filter((o) => o.kind === "circle");
    const fromN = from.filter((o) => o.kind === "circle").length;
    const toN = to.filter((o) => o.kind === "circle").length;
    // Wrapped pairing: exactly max(nA, nB) travelling dots, no orphans.
    expect(circles.length).toBe(Math.max(fromN, toN));
    for (const c of mid) {
      if (c.kind === "circle") {
        expect(Number.isFinite(c.x + c.y + c.r)).toBe(true);
        expect(c.fill).toMatch(/^rgba\(/);
      } else {
        expect(c.stroke).toMatch(/^rgba\(/);
      }
    }
  });

  it("dissolves outgoing lines by mid-morph and births incoming after", () => {
    const early = morphOps(from, to, 0.25).filter((o) => o.kind === "line");
    const late = morphOps(from, to, 0.75).filter((o) => o.kind === "line");
    // connecting has lines, working has none: they exist early, are gone late.
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBe(0);
    const mid = morphOps(from, to, 0.5).filter((o) => o.kind === "line");
    expect(mid.length).toBe(0);
  });

  it("interpolates positions monotonically toward the target", () => {
    const a = morphOps(from, to, 0.2).find((o) => o.kind === "circle")!;
    const b = morphOps(from, to, 0.8).find((o) => o.kind === "circle")!;
    const src = from.find((o) => o.kind === "circle")!;
    const dst = to.find((o) => o.kind === "circle")!;
    if (src.kind === "circle" && dst.kind === "circle" && a.kind === "circle" && b.kind === "circle") {
      const dA = Math.hypot(a.x - dst.x, a.y - dst.y);
      const dB = Math.hypot(b.x - dst.x, b.y - dst.y);
      const total = Math.hypot(src.x - dst.x, src.y - dst.y);
      expect(dB).toBeLessThanOrEqual(dA + 1e-9);
      expect(dA).toBeLessThanOrEqual(total + 1e-9);
    }
  });
});
