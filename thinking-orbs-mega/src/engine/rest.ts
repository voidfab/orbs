// Resting and GPUI-ported concept modes.
//
// `rest` — dedicated idle from the animated fork: a Fibonacci shell that
// turns lazily, nods, and lets each dot creep on its own tiny circle.
// `focus` / `gyro` / `echo` — ported from gpui-thinking-orbs (focusing,
// gyroscope reasoning, memory echoes).

import { fibDir, frac, hashD, makeProj, radiusScale } from './core';
import type { ModeBuild } from './adapt';

const TAU = Math.PI * 2;

export const buildRest: ModeBuild = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.82;
  const pt = makeProj(t * (o.spin ?? 0.34), 0.34 + 0.08 * Math.sin(t * 0.17), cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  const n = Math.max(8, Math.round(o.dotN ?? 170));
  const breath = o.breath ?? 0.018;
  const drift = o.drift ?? 0.022;
  const aFar = o.aFar ?? 0.72;

  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = fibDir(i, n);
    const h1 = hashD(i, 3.1);
    const h2 = hashD(i, 7.7);

    const ax = Math.abs(dz) > 0.9 ? 1 : 0;
    const az = Math.abs(dz) > 0.9 ? 0 : 1;
    let ux = dy * az;
    let uy = dz * ax - dx * az;
    let uz = -dy * ax;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;

    const ph = h2 * TAU + t * (o.driftRate ?? 0.31);
    const cp = Math.cos(ph) * drift;
    const sp = Math.sin(ph) * drift;
    const rr = R * (1 + breath * Math.sin(t * (o.breathRate ?? 0.53) + h1 * TAU));

    const [px, py, z] = pt(
      (dx + ux * cp + vx * sp) * rr,
      (dy + uy * cp + vy * sp) * rr,
      (dz + uz * cp + vz * sp) * rr
    );
    const depth = Math.min(1, Math.max(0, (z / R + 1) / 2));
    out.add(
      px,
      py,
      z,
      ((o.rBase ?? 0.7) + (o.rDepth ?? 2) * depth) * rs,
      (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
      aFar + (1 - aFar) * depth
    );
  }
};

function unitCircle(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
}

/** Iris-like streams converge on a small focal core (GPUI `focusing`). */
export const buildFocus: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const extent = size * 0.38 * (o.spread ?? 1);
  const lanes = Math.max(1, Math.round(o.lanes ?? 6));
  const segs = Math.max(1, Math.round(o.segs ?? 12));
  const coreN = Math.max(1, Math.round(o.particles ?? 5));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.9;
  const rDepth = o.rDepth ?? 1.25;
  const openness = 0.5 + 0.5 * Math.sin(t * 0.9);
  const inner = 0.12 + 0.2 * openness;
  const rotation = t * 0.11;
  const dirs = unitCircle(lanes);

  for (let lane = 0; lane < lanes; lane++) {
    const [dx0, dy0] = dirs[lane];
    for (let i = 0; i < segs; i++) {
      const u = (i + 0.5) / segs;
      const radial = inner + (1 - inner) * u;
      const curl = (0.88 - 0.24 * openness) * (1 - u) ** 1.25;
      const twist = rotation + curl;
      const st = Math.sin(twist);
      const ct = Math.cos(twist);
      const dx = dx0 * ct - dy0 * st;
      const dy = dx0 * st + dy0 * ct;
      const innerWeight = 1 - u;
      const shimmer = 0.96 + 0.05 * Math.sin(t * 1.4 + lane * 0.8);
      out.add(
        center + dx * extent * radial,
        center + dy * extent * radial,
        0,
        (rBase + rDepth * innerWeight) * shimmer * rs,
        0.12 + 0.52 * u,
        0.48 + 0.52 * Math.sin(Math.PI * u)
      );
    }
  }

  const coreRadius = size * (0.035 + 0.004 * Math.sin(t * 1.5));
  for (const [px, py] of unitCircle(coreN)) {
    out.add(center + px * coreRadius, center + py * coreRadius, 0, (rBase + rDepth * 1.15) * rs, 0.08);
  }
};

/** Counter-rotating great circles (GPUI gyroscope `reasoning`). */
export const buildGyro: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const radius = size * 0.385 * (o.spread ?? 1);
  const rings = Math.min(6, Math.max(1, Math.round(o.lanes ?? 3)));
  const segs = Math.max(3, Math.round(o.segs ?? 24));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.8;
  const rDepth = o.rDepth ?? 1.5;
  const proj = makeProj(t * 0.055, 0.18, center, center, radius);
  const circle = unitCircle(segs);

  for (let ring = 0; ring < rings; ring++) {
    const spread = rings > 1 ? ring / (rings - 1) - 0.5 : 0;
    const tiltX = spread * 1.55 + 0.12 * Math.sin(t * 0.16 + ring);
    const tiltY = (ring * Math.PI) / rings + 0.32;
    const sx = Math.sin(tiltX);
    const cx = Math.cos(tiltX);
    const sy = Math.sin(tiltY);
    const cy = Math.cos(tiltY);
    const direction = ring % 2 === 0 ? 1 : -1;
    const orient = (ca: number, sa: number): [number, number, number] => {
      const y1 = sa * cx;
      const z1 = sa * sx;
      return [ca * cy + z1 * sy, y1, -ca * sy + z1 * cy];
    };

    for (const [ca, sa] of circle) {
      const [x, y, z] = orient(ca, sa);
      const [px, py, depthZ] = proj(x, y, z);
      const depth = (depthZ + 1) * 0.5;
      out.add(
        px,
        py,
        depthZ,
        (rBase * 0.9 + rDepth * 0.5 * depth) * rs,
        0.62 - 0.34 * depth,
        0.34 + 0.4 * depth
      );
    }

    const travel = t * (0.72 + ring * 0.08) * direction + (ring * 2 * Math.PI) / rings;
    for (const [trail, offset] of [
      [0, 0],
      [1, -0.22 * direction]
    ] as const) {
      const [x, y, z] = orient(Math.cos(travel + offset), Math.sin(travel + offset));
      const [px, py, depthZ] = proj(x, y, z);
      const depth = (depthZ + 1) * 0.5;
      const strength = trail === 0 ? 1 : 0.48;
      out.add(
        px,
        py,
        depthZ + 0.002,
        (rBase + rDepth * depth + 1.65 * strength) * rs,
        0.44 - 0.42 * depth - 0.2 * strength,
        (0.55 + 0.45 * depth) * strength
      );
    }
  }
};

/** Concentric echoes dissolve at the boundary (GPUI `recalling`). */
export const buildEcho: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const extent = size * 0.4 * (o.spread ?? 1);
  const rings = Math.max(1, Math.round(o.lanes ?? 4));
  const segs = Math.max(3, Math.round(o.segs ?? 18));
  const coreN = Math.max(1, Math.round(o.particles ?? 3));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.85;
  const rDepth = o.rDepth ?? 1.05;
  const circle = unitCircle(segs);

  for (let ring = 0; ring < rings; ring++) {
    const phase = frac(t * 0.14 + ring / rings);
    const radius = extent * (0.13 + 0.87 * phase);
    const life = Math.max(0, Math.sin(Math.PI * phase));
    const turn = ring * 0.37 - t * 0.1;
    const st = Math.sin(turn);
    const ct = Math.cos(turn);
    for (const [px, py] of circle) {
      const x = px * ct - py * st;
      const y = px * st + py * ct;
      out.add(
        center + x * radius,
        center + y * radius,
        0,
        (rBase + rDepth * (1 - phase)) * rs,
        0.18 + 0.52 * phase,
        life ** 0.58
      );
    }
  }

  const coreRadius = size * 0.025;
  for (const [px, py] of unitCircle(coreN)) {
    out.add(center + px * coreRadius, center + py * coreRadius, 0, (rBase + rDepth * 1.4) * rs, 0.06);
  }
};
