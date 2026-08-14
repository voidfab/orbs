/**
 * A recording stand-in for CanvasRenderingContext2D.
 *
 * The `thinking-orbs` engine paints exclusively through 2D-context calls
 * (set fillStyle → beginPath → arc → fill for dots; set strokeStyle/lineWidth
 * → beginPath → moveTo → lineTo → stroke for edges). Feeding its exported
 * MODE_DRAWS a recorder instead of a real context captures every primitive —
 * same math, same colors, same paint order — as data an SVG layer can render.
 *
 * Exactness tripwire: any context member the engine touches that this
 * recorder does not model logs once (dev only) instead of silently dropping
 * ink — if a library update starts using a new primitive, we hear about it.
 */

export type RecordedOp =
  | { kind: "circle"; x: number; y: number; r: number; fill: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; w: number };

const warned = new Set<string>();
const warnOnce = (name: string) => {
  if (warned.has(name)) return;
  warned.add(name);
  if (typeof console !== "undefined") {
    console.warn(`morphing-orbs: unrecorded canvas op "${name}" — engine drift, output may differ`);
  }
};

class Recorder {
  ops: RecordedOp[] = [];
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  private arcs: Array<{ x: number; y: number; r: number }> = [];
  private points: Array<{ x: number; y: number }> = [];

  reset() {
    this.ops.length = 0;
  }
  // Frame plumbing the component does around draw(); nothing to record.
  setTransform() {}
  clearRect() {
    // The engine clears once per frame before drawing.
    this.ops.length = 0;
  }
  save() {}
  restore() {}

  beginPath() {
    this.arcs.length = 0;
    this.points.length = 0;
  }
  arc(x: number, y: number, r: number) {
    this.arcs.push({ x, y, r });
  }
  moveTo(x: number, y: number) {
    this.points.push({ x, y });
  }
  lineTo(x: number, y: number) {
    this.points.push({ x, y });
  }
  fill() {
    for (const a of this.arcs) {
      this.ops.push({ kind: "circle", x: a.x, y: a.y, r: a.r, fill: this.fillStyle });
    }
  }
  stroke() {
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i - 1]!;
      const q = this.points[i]!;
      this.ops.push({
        kind: "line", x1: p.x, y1: p.y, x2: q.x, y2: q.y,
        stroke: this.strokeStyle, w: this.lineWidth,
      });
    }
  }
}

/**
 * The engine receives this as a CanvasRenderingContext2D. The Proxy layer is
 * the tripwire: unknown method lookups return a warn-once no-op, so engine
 * drift degrades loudly in dev instead of crashing or vanishing silently.
 */
export function createRecorder(): { ctx: CanvasRenderingContext2D; ops: () => RecordedOp[] } {
  const rec = new Recorder();
  const proxy = new Proxy(rec, {
    get(target, prop: string | symbol) {
      if (prop in target) return Reflect.get(target, prop);
      if (typeof prop === "string") {
        warnOnce(prop);
        return () => undefined;
      }
      return undefined;
    },
    set(target, prop, value) {
      Reflect.set(target, prop, value);
      return true;
    },
  });
  return { ctx: proxy as unknown as CanvasRenderingContext2D, ops: () => rec.ops };
}
