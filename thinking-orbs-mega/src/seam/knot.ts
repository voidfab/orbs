/**
 * Closed (2,3) trefoil for Seam v2's external domain.
 *
 * A torus knot T(p,q) is a loop iff p and q are integers. Fractional p/q
 * (the earlier speak/listen lean) left a visible seam — the first and last
 * samples sat in different places. Topology stays integer; phase lives in
 * tube, speed, and colour.
 *
 * Samples are projected onto a sphere after the knot is built. That is the
 * compact sigil look from the first v2 cut, not a retopology.
 */

export interface Topology {
  p: number;
  q: number;
  tube: number;
}

export interface PhaseWeights {
  idle: number;
  listening: number;
  thinking: number;
  speaking: number;
}

export interface VariantLayout {
  knotScale: number;
  tube: number;
  hollow: number;
  fold: number;
  internalScale: number;
}

const TAU = Math.PI * 2;

/** Integer home. Tube may breathe; p and q do not. */
export function v2Topology(w: PhaseWeights): Topology {
  return {
    p: 2,
    q: 3,
    tube: 0.34 + w.speaking * 0.05 + w.thinking * 0.02
  };
}

export function variantLayout(variant: 'halo' | 'conduit' | 'well'): VariantLayout {
  if (variant === 'halo') {
    return { knotScale: 1.16, tube: 0.26, hollow: 0.4, fold: 1, internalScale: 0.34 };
  }
  if (variant === 'well') {
    return { knotScale: 0.9, tube: 0.36, hollow: 0.2, fold: 1.7, internalScale: 0.26 };
  }
  return { knotScale: 1, tube: 0.34, hollow: 0.22, fold: 1.15, internalScale: 0.28 };
}

/** Internal energy never includes output. External never includes input. */
export function domainEnergy(input: number, output: number, w: PhaseWeights) {
  return {
    internal: Math.min(1, 0.75 * input + 0.25 * w.listening),
    external: Math.min(1, 0.75 * output + 0.25 * w.speaking)
  };
}

export function wrapTau(u: number): number {
  let v = u % TAU;
  if (v < 0) v += TAU;
  return v;
}

export function wrapPi(d: number): number {
  let v = ((d + Math.PI) % TAU) + TAU;
  v = (v % TAU) - Math.PI;
  return v;
}

/** Raw torus knot. `phi` walks the tube cross-section — distinct rails. */
export function torusKnotRaw(
  t: number,
  p: number,
  q: number,
  R = 1,
  r = 0.34,
  phi = 0
): [number, number, number] {
  const cq = Math.cos(q * t + phi);
  const rad = R + r * cq;
  return [rad * Math.cos(p * t), r * Math.sin(q * t + phi) * 1.15, rad * Math.sin(p * t)];
}

/** First-cut v2 look: knot, then project onto a sphere. Closed when p,q ∈ ℤ. */
export function torusKnot(
  t: number,
  p: number,
  q: number,
  R = 1,
  r = 0.34
): [number, number, number] {
  const [x, y, z] = torusKnotRaw(t, p, q, R, r, 0);
  const len = Math.hypot(x, y, z) || 1;
  return [(x / len) * 1.05, (y / len) * 1.05, (z / len) * 1.05];
}

/**
 * Parallel rail: offset in the Frenet frame *after* sphere projection,
 * otherwise tube-phase offsets collapse back onto the same point.
 */
export function torusKnotRail(
  t: number,
  p: number,
  q: number,
  phi: number,
  spread = 0.07,
  R = 1,
  r = 0.34
): [number, number, number] {
  const a = torusKnot(t, p, q, R, r);
  const b = torusKnot(t + 0.02, p, q, R, r);
  const tx = b[0] - a[0];
  const ty = b[1] - a[1];
  const tz = b[2] - a[2];
  const tl = Math.hypot(tx, ty, tz) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const uz = tz / tl;
  let nx = a[1] * uz - a[2] * uy;
  let ny = a[2] * ux - a[0] * uz;
  let nz = a[0] * uy - a[1] * ux;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  const bx = uy * nz - uz * ny;
  const by = uz * nx - ux * nz;
  const bz = ux * ny - uy * nx;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [a[0] + spread * (c * nx + s * bx), a[1] + spread * (c * ny + s * by), a[2] + spread * (c * nz + s * bz)];
}

/** Radial waveform: displace a knot sample along its radius. `amount` is 0–1. */
export function waveDisplace(
  x: number,
  y: number,
  z: number,
  u: number,
  t: number,
  amount: number
): [number, number, number] {
  if (amount <= 0.001) return [x, y, z];
  const w = Math.sin(u * 8 - t * 9) * amount;
  const s = 1 + w * 0.26;
  return [x * s, y * s, z * s];
}

export function knotFit(R: number, r: number): number {
  return 1 / Math.max(0.2, R + r);
}

/** Scale-to-fit without sphere projection — kept for tests / hosts that want the raw silhouette. */
export function torusKnotFitted(
  t: number,
  p: number,
  q: number,
  R = 1,
  r = 0.34
): [number, number, number] {
  const s = knotFit(R, r);
  const [x, y, z] = torusKnotRaw(t, p, q, R, r);
  return [x * s, y * s, z * s];
}

/**
 * Closed ribbon: n+1 samples on [0, 2π] so the last point is the first.
 * p and q are rounded to integers before sampling.
 */
export class KnotRibbon {
  p = 2;
  q = 3;
  tube = 0.34;
  n = 0;
  xs = new Float32Array(0);
  ys = new Float32Array(0);
  zs = new Float32Array(0);

  ensure(p: number, q: number, tube: number, n: number): void {
    const pi = Math.round(p);
    const qi = Math.round(q);
    if (
      this.n === n &&
      this.p === pi &&
      this.q === qi &&
      Math.abs(this.tube - tube) < 1e-3
    ) {
      return;
    }
    this.p = pi;
    this.q = qi;
    this.tube = tube;
    this.n = n;
    const count = n + 1;
    if (this.xs.length !== count) {
      this.xs = new Float32Array(count);
      this.ys = new Float32Array(count);
      this.zs = new Float32Array(count);
    }
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = torusKnot((i / n) * TAU, pi, qi, 1, tube);
      this.xs[i] = x;
      this.ys[i] = y;
      this.zs[i] = z;
    }
    // Exact close — last byte equals first, even if float drift creeps in.
    this.xs[n] = this.xs[0];
    this.ys[n] = this.ys[0];
    this.zs[n] = this.zs[0];
  }

  at(u: number): [number, number, number] {
    return torusKnot(u, this.p, this.q, 1, this.tube);
  }

  get closed(): boolean {
    if (this.n < 1) return false;
    const i = this.n;
    return Math.hypot(this.xs[i] - this.xs[0], this.ys[i] - this.ys[0], this.zs[i] - this.zs[0]) < 1e-9;
  }
}
