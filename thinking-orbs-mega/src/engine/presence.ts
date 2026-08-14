// Aesthetic extract from alainux Orb + VoiceOrb, in dotted ModeFrame language.
// No WebGL, no ctx.filter — Fibonacci lattice + value noise + a longitude sweep.

import { fibDir, finalizeFrame, makeProj, radiusScale, vnoise, type Dot } from './core';
import type { ModeFrame } from './types';

function fieldDots(
  size: number,
  t: number,
  o: { [k: string]: number | undefined },
  kind: 'presence' | 'cognition' | 'speaking'
): Dot[] {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.78;
  const n = Math.max(24, Math.round(o.dotN ?? 160));
  const energy = o.energy ?? 0;
  const pt = makeProj(t * 0.07, 0.32 + 0.04 * Math.sin(t * 0.21), cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const breath = 0.018 * Math.sin(t * 0.48) + energy * 0.04;

  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = fibDir(i, n);
    const edge =
      0.035 * vnoise(dx * 2.1 + t * 0.11, dy * 2.1 - t * 0.09) +
      0.018 * vnoise(dx * 4.2 - t * 0.17, dz * 4.2 + t * 0.13);
    let rr = R * (1 + breath + edge);
    if (kind === 'speaking') {
      const lat = Math.acos(Math.max(-1, Math.min(1, dy)));
      rr *= 1 + 0.055 * Math.sin(lat * 8 - t * 3.4) * (0.45 + energy);
    }
    const [px, py, z] = pt(dx * rr, dy * rr, dz * rr);
    const depth = Math.min(1, Math.max(0, (z / R + 1) / 2));
    const kd = Math.max(0, dx * -0.45 + dy * 0.55 + dz * 0.7);
    let white = 0.62 - 0.42 * depth - 0.12 * kd;
    let a = 0.22 + 0.62 * depth;
    if (kind === 'cognition') {
      const lon = Math.atan2(dz, dx);
      const sweep = ((t * 1.15) % (Math.PI * 2)) - Math.PI;
      const dLon = Math.atan2(Math.sin(lon - sweep), Math.cos(lon - sweep));
      const band = Math.exp(-(dLon * dLon) / 0.18);
      white -= band * 0.28;
      a += band * 0.22;
    }
    if (kind === 'presence') {
      a *= 0.72 + 0.18 * depth;
    }
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.75) + (o.rDepth ?? 1.7) * depth) * rs,
      white,
      a
    });
  }

  if (energy > 0.35) {
    const halo = Math.round(n * 0.12);
    for (let i = 0; i < halo; i++) {
      const [dx, dy, dz] = fibDir(i * 3 + 1, halo * 3);
      const [px, py, z] = pt(dx * R * 1.14, dy * R * 1.14, dz * R * 1.14);
      const depth = (z / R + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z,
        r: 0.55 * rs,
        white: 0.2,
        a: 0.12 + 0.25 * energy * Math.max(0, depth)
      });
    }
  }
  return dots;
}

export const framePresence: ModeFrame = (size, t, o) =>
  finalizeFrame(fieldDots(size, t, o, 'presence'), [], o.rMin);

export const frameCognition: ModeFrame = (size, t, o) =>
  finalizeFrame(fieldDots(size, t, o, 'cognition'), [], o.rMin);

export const frameSpeaking: ModeFrame = (size, t, o) =>
  finalizeFrame(fieldDots(size, t, o, 'speaking'), [], o.rMin);
