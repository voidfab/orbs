/**
 * State-to-state morphing over recorded frames.
 *
 * Both modes render their real frame each tick; this module builds the
 * displayed frame by pairing primitives and interpolating. Dots pair
 * index-wise (emission order is deterministic per mode); when counts differ,
 * the longer side wraps onto the shorter, so surplus dots visibly converge
 * into (or emerge out of) their partners instead of popping. Lines carry no
 * stable identity across modes, so they crossfade: outgoing fades through the
 * first half, incoming through the second.
 */
import type { RecordedOp } from "./record.js";

type Circle = Extract<RecordedOp, { kind: "circle" }>;
type Line = Extract<RecordedOp, { kind: "line" }>;

export const easeInOutCubic = (f: number): number =>
  f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2;

const RGBA = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/;

function parseInk(color: string): { g: number; a: number } {
  const m = RGBA.exec(color);
  return m ? { g: Number(m[1]), a: Number(m[4]) } : { g: 0, a: 1 };
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

function lerpInk(ca: string, cb: string, f: number): string {
  const a = parseInk(ca);
  const b = parseInk(cb);
  const g = Math.round(lerp(a.g, b.g, f));
  return `rgba(${g},${g},${g},${lerp(a.a, b.a, f)})`;
}

/** Blend two recorded frames at eased progress `f` ∈ [0, 1]. */
export function morphOps(from: RecordedOp[], to: RecordedOp[], f: number): RecordedOp[] {
  if (f <= 0) return from;
  if (f >= 1) return to;

  const fromC = from.filter((o): o is Circle => o.kind === "circle");
  const toC = to.filter((o): o is Circle => o.kind === "circle");
  const fromL = from.filter((o): o is Line => o.kind === "line");
  const toL = to.filter((o): o is Line => o.kind === "line");

  const out: RecordedOp[] = [];

  // Outgoing lines die in the first half, incoming are born in the second —
  // the mid-morph frame is lineless on purpose, reading as dissolution.
  const fadeOut = Math.max(0, 1 - f * 2);
  const fadeIn = Math.max(0, f * 2 - 1);
  for (const l of fromL) {
    if (fadeOut <= 0.02) break;
    const ink = parseInk(l.stroke);
    out.push({ ...l, stroke: `rgba(${ink.g},${ink.g},${ink.g},${ink.a * fadeOut})` });
  }
  for (const l of toL) {
    if (fadeIn <= 0.02) break;
    const ink = parseInk(l.stroke);
    out.push({ ...l, stroke: `rgba(${ink.g},${ink.g},${ink.g},${ink.a * fadeIn})` });
  }

  const n = Math.max(fromC.length, toC.length);
  for (let i = 0; i < n; i++) {
    // Wrap the shorter list: every dot always has a partner to travel to.
    const a = fromC.length ? fromC[i % fromC.length]! : undefined;
    const b = toC.length ? toC[i % toC.length]! : undefined;
    if (a && b) {
      out.push({
        kind: "circle",
        x: lerp(a.x, b.x, f),
        y: lerp(a.y, b.y, f),
        r: lerp(a.r, b.r, f),
        fill: lerpInk(a.fill, b.fill, f),
      });
    } else if (a) {
      const ink = parseInk(a.fill);
      out.push({ ...a, fill: `rgba(${ink.g},${ink.g},${ink.g},${ink.a * (1 - f)})` });
    } else if (b) {
      const ink = parseInk(b.fill);
      out.push({ ...b, fill: `rgba(${ink.g},${ink.g},${ink.g},${ink.a * f})` });
    }
  }
  return out;
}
