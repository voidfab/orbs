// Dot-level morphing between two captured frames (animated fork).
// Modes have wildly different dot counts, so a cross-fade reads as two
// overlapping animations. Instead every outgoing dot travels to an incoming
// one in polar space, with a per-dot stagger that sweeps around the orb.

import type { Dot } from './core';
import type { DotBuffer } from './buffer';

function ease(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * c * (c * (c * 6 - 15) + 10);
}

interface Keyed {
  k: number;
  d: Dot;
}

function byAngle(dots: Dot[], n: number, c: number): Dot[] {
  const keyed: Keyed[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const d = dots[i];
    keyed[i] = { k: Math.atan2(d.y - c, d.x - c), d };
  }
  keyed.sort((a, b) => a.k - b.k);
  return keyed.map((k) => k.d);
}

const STAGGER = 0.3;

/**
 * Morph `from` into `to` at linear progress `m` (0..1), writing into `out`.
 * Pixel-identical to `from` at 0 and `to` at 1.
 */
export function blendInto(out: DotBuffer, from: DotBuffer, to: DotBuffer, m: number, size: number): void {
  out.reset();
  if (m <= 0 || to.n === 0) {
    copyBuffer(out, from);
    return;
  }
  if (m >= 1 || from.n === 0) {
    copyBuffer(out, to);
    return;
  }

  const c = size / 2;
  const a = byAngle(from.dots, from.n, c);
  const b = byAngle(to.dots, to.n, c);
  const na = a.length;
  const nb = b.length;
  const n = Math.max(na, nb);

  let lastA = -1;
  let lastB = -1;
  for (let i = 0; i < n; i++) {
    const ia = Math.floor((i * na) / n);
    const ib = Math.floor((i * nb) / n);
    const u = n > 1 ? i / (n - 1) : 0;
    const e = ease(m * (1 + STAGGER) - STAGGER * u);
    let rScale = 1;
    if (ia === lastA) rScale = Math.sqrt(e);
    else if (ib === lastB) rScale = Math.sqrt(1 - e);
    lastA = ia;
    lastB = ib;

    const p = a[ia];
    const q = b[ib];
    const px = p.x - c;
    const py = p.y - c;
    const rp = Math.hypot(px, py);
    const rq = Math.hypot(q.x - c, q.y - c);
    const ap = Math.atan2(py, px);
    const aq = Math.atan2(q.y - c, q.x - c);
    const da = Math.atan2(Math.sin(aq - ap), Math.cos(aq - ap));
    const ang = ap + da * e;
    const rad = rp + (rq - rp) * e;
    const pa = p.a ?? 1;
    const qa = q.a ?? 1;
    out.add(
      c + Math.cos(ang) * rad,
      c + Math.sin(ang) * rad,
      p.z + (q.z - p.z) * e,
      (p.r + (q.r - p.r) * e) * rScale,
      p.white + (q.white - p.white) * e,
      pa + (qa - pa) * e
    );
  }
}

export function copyBuffer(out: DotBuffer, src: DotBuffer): void {
  out.reset();
  for (let i = 0; i < src.n; i++) {
    const d = src.dots[i];
    out.add(d.x, d.y, d.z, d.r, d.white, d.a ?? 1);
  }
  for (let i = 0; i < src.lineN; i++) {
    const l = src.lines[i];
    out.addLine(l.x1, l.y1, l.x2, l.y2, l.white, l.w, l.a ?? 1);
  }
}
