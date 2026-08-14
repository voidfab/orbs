// Extra states from solid-thinking-orbs (Mvkweb): tumbling wire cube,
// undulating face-grid "hypercube", spiral tetrahedron, assembling cube.

import { fibDir, finalizeFrame, hashD, makeProj, radiusScale, type Dot } from './core';
import type { ModeFrame } from './types';

const CUBE_EDGES: Array<[number, number, number, number, number, number]> = [
  [1, 1, 1, -1, 1, 1],
  [-1, 1, 1, -1, -1, 1],
  [-1, -1, 1, 1, -1, 1],
  [1, -1, 1, 1, 1, 1],
  [1, 1, -1, -1, 1, -1],
  [-1, 1, -1, -1, -1, -1],
  [-1, -1, -1, 1, -1, -1],
  [1, -1, -1, 1, 1, -1],
  [1, 1, 1, 1, 1, -1],
  [-1, 1, 1, -1, 1, -1],
  [-1, -1, 1, -1, -1, -1],
  [1, -1, 1, 1, -1, -1]
];

export const frameBuilding: ModeFrame = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.55;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.2 * spin, t * 0.15 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const dotsPerEdge = Math.max(2, Math.floor(o.ghostN ?? 12));
  for (const [x1, y1, z1, x2, y2, z2] of CUBE_EDGES) {
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const [px, py, pz] = pt(
        (x1 + (x2 - x1) * f) * R,
        (y1 + (y2 - y1) * f) * R,
        (z1 + (z2 - z1) * f) * R
      );
      const depth = (pz / (R * 1.732) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) * rs,
        white: 0.52 - 0.44 * depth,
        a: 0.4 + 0.6 * depth
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};

export const frameHypercube: ModeFrame = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.52;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.18 * spin, t * 0.14 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const gridN = Math.max(4, Math.floor(o.ghostN ?? 7));
  const faces: Array<{ axis: 'x' | 'y' | 'z'; val: number; normal: [number, number, number] }> = [
    { axis: 'z', val: 1, normal: [0, 0, 1] },
    { axis: 'z', val: -1, normal: [0, 0, -1] },
    { axis: 'x', val: 1, normal: [1, 0, 0] },
    { axis: 'x', val: -1, normal: [-1, 0, 0] },
    { axis: 'y', val: 1, normal: [0, 1, 0] },
    { axis: 'y', val: -1, normal: [0, -1, 0] }
  ];
  for (const { axis, val, normal } of faces) {
    for (let i = 0; i < gridN; i++) {
      const u = -1 + (2 * i) / (gridN - 1);
      for (let j = 0; j < gridN; j++) {
        const v = -1 + (2 * j) / (gridN - 1);
        let lx = 0;
        let ly = 0;
        let lz = 0;
        if (axis === 'z') {
          lx = u;
          ly = v;
          lz = val;
        } else if (axis === 'x') {
          lx = val;
          ly = u;
          lz = v;
        } else {
          lx = u;
          ly = val;
          lz = v;
        }
        const wave = 0.06 * Math.sin(t * 2.2 + lx * 1.5 + ly * 1.5 + lz * 1.5);
        const [px, py, pz] = pt(
          (lx + normal[0] * wave) * R,
          (ly + normal[1] * wave) * R,
          (lz + normal[2] * wave) * R
        );
        const depth = (pz / (R * 1.732) + 1) / 2;
        dots.push({
          x: px,
          y: py,
          z: pz,
          r: ((o.rBase ?? 0.8) + (o.rDepth ?? 1.5) * depth) * rs,
          white: 0.55 - 0.45 * depth,
          a: 0.35 + 0.65 * depth
        });
      }
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};

export const frameConjuring: ModeFrame = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.55;
  const spin = o.spin ?? 1;
  const isStatic = spin === 0;
  const yaw = isStatic ? 0.25 : t * 0.35 * spin;
  const tilt = isStatic ? 0.38 : 0.45 + 0.25 * Math.sin(t * 0.6 * spin);
  const roll = isStatic ? 0 : t * 0.2 * spin;
  const baseRotSpeed = isStatic ? 1 : 0.8;
  const baseAngleOffset = t * baseRotSpeed;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const basePt = makeProj(yaw, tilt, cx, cy, 1);
  const pt = (x: number, y: number, z: number): [number, number, number] => {
    const rx = x * cr - y * sr;
    const ry = x * sr + y * cr;
    return basePt(rx, ry, z);
  };
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const dotsPerEdge = Math.max(4, Math.floor(o.ghostN ?? 16));
  const apexY = 0.9;
  const baseY = -0.6;

  for (let b = 0; b < 3; b++) {
    const initialAngle = (b * 2 * Math.PI) / 3 + baseAngleOffset;
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const y = baseY + (apexY - baseY) * f;
      const currentRadius = 1 - f;
      const twistAngle = initialAngle + f * Math.PI * 1.2;
      const [px, py, pz] = pt(Math.cos(twistAngle) * currentRadius * R, y * R, Math.sin(twistAngle) * currentRadius * R);
      const depth = (pz / (R * 1.5) + 1) / 2;
      const wave = 0.5 + 0.5 * Math.cos(t * 2.8 - f * Math.PI * 4);
      const pulse = wave ** 2.5;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1) + (o.rDepth ?? 1.6) * depth + pulse * 0.9) * rs,
        white: 0.65 - 0.45 * depth - pulse * 0.2,
        a: 0.4 + 0.6 * depth
      });
    }
  }

  const baseEdgeDots = Math.floor(dotsPerEdge * 0.8);
  for (let b = 0; b < 3; b++) {
    const a1 = (b * 2 * Math.PI) / 3 + baseAngleOffset;
    const a2 = ((b + 1) * 2 * Math.PI) / 3 + baseAngleOffset;
    for (let i = 0; i < baseEdgeDots; i++) {
      const f = i / (baseEdgeDots - 1);
      const ang = a1 + (a2 - a1) * f;
      const arcRadius = 1 + 0.12 * Math.sin(f * Math.PI);
      const [px, py, pz] = pt(Math.cos(ang) * arcRadius * R, (baseY + 0.06 * Math.sin(f * Math.PI)) * R, Math.sin(ang) * arcRadius * R);
      const depth = (pz / (R * 1.5) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 0.9) + (o.rDepth ?? 1.5) * depth) * rs,
        white: 0.58 - 0.4 * depth,
        a: 0.35 + 0.65 * depth
      });
    }
  }

  for (let p = 0; p < 18; p++) {
    const ang = (p / 18) * Math.PI * 2 - baseAngleOffset * 1.5;
    const rad = 1.15 * (1 + 0.05 * Math.sin(t * 3 + p));
    const [px, py, pz] = pt(Math.cos(ang) * rad * R, (baseY - 0.08) * R, Math.sin(ang) * rad * R);
    const depth = (pz / R + 1) / 2;
    dots.push({ x: px, y: py, z: pz, r: (0.7 + 1.1 * depth) * rs, white: 0.5 - 0.35 * depth, a: 0.3 + 0.5 * depth });
  }

  for (let c = 0; c < 10; c++) {
    const cf = c / 9;
    const cang = -t * 2.5 + cf * 3;
    const cr_ = 0.08 * Math.sin(cf * Math.PI) * (1 + 0.3 * Math.sin(t * 3 + cf * 5));
    const [px, py, pz] = pt(Math.cos(cang) * cr_ * R, (baseY + 0.2 + cf * 1.1) * R, Math.sin(cang) * cr_ * R);
    const depth = (pz / R + 1) / 2;
    dots.push({ x: px, y: py, z: pz, r: (1.4 + 1.2 * depth) * rs, white: 0.75 - 0.45 * depth, a: 0.7 + 0.3 * depth });
  }

  return finalizeFrame(dots, [], o.rMin);
};

export const frameAssembling: ModeFrame = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.52;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.2 * spin, t * 0.15 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const dotsPerEdge = Math.max(2, Math.floor(o.ghostN ?? 14));
  let edgeIdx = 0;
  for (const [x1, y1, z1, x2, y2, z2] of CUBE_EDGES) {
    edgeIdx++;
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const bx = x1 + (x2 - x1) * f;
      const by = y1 + (y2 - y1) * f;
      const bz = z1 + (z2 - z1) * f;
      const seed = hashD(edgeIdx * 100 + i, 3.14);
      const phase = seed * Math.PI * 2;
      const cycleTime = (t * 1.8 + phase) % (Math.PI * 2);
      let displacement = 0;
      let alphaMult = 1;
      let radiusBoost = 0;
      if (cycleTime > Math.PI * 0.8 && cycleTime < Math.PI * 1.7) {
        const ejectProgress = (cycleTime - Math.PI * 0.8) / (Math.PI * 0.9);
        const ejectEnvelope = Math.sin(ejectProgress * Math.PI);
        displacement = 0.5 * ejectEnvelope;
        alphaMult = 1 - 0.4 * ejectEnvelope;
        radiusBoost = 0.4 * ejectEnvelope;
      }
      const norm = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const [px, py, pz] = pt((bx + (bx / norm) * displacement) * R, (by + (by / norm) * displacement) * R, (bz + (bz / norm) * displacement) * R);
      const depth = (pz / (R * 1.732) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth + radiusBoost) * rs,
        white: 0.55 - 0.42 * depth,
        a: (0.4 + 0.6 * depth) * alphaMult
      });
    }
  }
  for (let s = 0; s < 12; s++) {
    const sSeed = hashD(s + 50, 7.12);
    const snapCycle = (t * 2.2 + sSeed * Math.PI * 2) % (Math.PI * 2);
    if (snapCycle <= Math.PI) continue;
    const snapProgress = (snapCycle - Math.PI) / Math.PI;
    const easeSnap = (1 - snapProgress) ** 3;
    const cornerIdx = Math.floor(sSeed * 8);
    const cx_ = cornerIdx & 1 ? 1 : -1;
    const cy_ = cornerIdx & 2 ? 1 : -1;
    const cz_ = cornerIdx & 4 ? 1 : -1;
    const dist = 1.2 * easeSnap;
    const [px, py, pz] = pt(
      (cx_ + Math.sin(sSeed * 15) * dist) * R,
      (cy_ + Math.cos(sSeed * 25) * dist) * R,
      (cz_ + Math.sin(sSeed * 35) * dist) * R
    );
    const depth = (pz / (R * 1.732) + 1) / 2;
    dots.push({
      x: px,
      y: py,
      z: pz,
      r: (1.3 + 1.2 * depth) * rs,
      white: 0.7 - 0.4 * depth,
      a: 0.2 + 0.8 * (1 - easeSnap)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};

/** Schoolees "responding": dense fib body + pulsing ribbon shells. */
export const frameResponding: ModeFrame = (size, t, o) => {
  const center = size / 2;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots: Dot[] = [];
  const bodyCount = Math.max(24, Math.round((o.pulseN ?? 156) * 0.85));
  const bodyProject = makeProj(t * 0.1, 0.34 + 0.055 * Math.sin(t * 0.3), center, center, size * 0.39);
  const nearRadius = ((o.rBase ?? 0.7) + (o.rDepth ?? 1.6) * 0.25) * (o.dotScale ?? 1.65) * rs;
  for (let i = 0; i < bodyCount; i++) {
    const [x, y, z] = bodyProject(...fibDir(i, bodyCount));
    const depth = (z + 1) / 2;
    dots.push({
      x,
      y,
      z,
      r: nearRadius * 0.65 * (0.42 + 0.58 * depth + 0.16 * depth * depth),
      white: 0.64 - 0.4 * depth,
      a: 0.18 + 0.48 * depth
    });
  }
  const shellCount = Math.max(2, Math.round(o.shellCount ?? 3));
  for (let shell = 0; shell < shellCount; shell++) {
    const cycle = t * (o.pulseSpeed ?? 0.17) * Math.PI * 2 + (shell / shellCount) * Math.PI * 2;
    const pulse = (1 - Math.cos(cycle)) / 2;
    const radius = size * (0.32 + 0.07 * pulse);
    const yaw = t * 0.1 + shell * 0.82;
    const tilt = 0.5 + 0.12 * Math.sin(t * 0.25 + shell);
    const ux = Math.cos(yaw);
    const uz = Math.sin(yaw);
    const vx = -uz * Math.sin(tilt);
    const vy = Math.cos(tilt);
    const vz = ux * Math.sin(tilt);
    const segs = size >= 64 ? 28 : 16;
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      const x = (ux * Math.cos(a) + vx * Math.sin(a)) * radius;
      const y = (0 * Math.cos(a) + vy * Math.sin(a)) * radius;
      const z = (uz * Math.cos(a) + vz * Math.sin(a)) * radius;
      const [px, py, pz] = [center + x, center - y, z / radius];
      const depth = (pz + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: nearRadius * (0.7 + 0.5 * pulse) * (0.5 + 0.5 * depth),
        white: 0.5 - 0.35 * depth,
        a: (0.25 + 0.55 * depth) * (0.5 + 0.5 * pulse)
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
