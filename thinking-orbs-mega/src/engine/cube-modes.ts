// Cube remesh of the original nine verbs (cubed fork).
// Selected by `shape="cube"` — a substrate, not a tenth state.

import { fibDir, frac, hashD, lerp, radiusScale, vnoise } from './core';
import {
  CUBE_EDGE_COUNT,
  cubeDepth,
  cubeEdgePoint,
  cubeFaceGrid,
  cubeRadius,
  cubeSurface,
  cubeSurfaceSamples,
  cubeWirePoints,
  makeCubeProj
} from './cube';
import type { ModeBuild } from './adapt';

export const buildCubeOrbits: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.98);
  const pt = makeCubeProj(Math.sin(t * 0.15) * 0.07, Math.sin(t * 0.11) * 0.035, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const edgeDots = Math.max(2, Math.round(o.edgeDots ?? 10));

  for (let edge = 0; edge < CUBE_EDGE_COUNT; edge++) {
    for (let i = 0; i < edgeDots; i++) {
      const p = cubeEdgePoint(edge, i / (edgeDots - 1), half);
      const [x, y, z] = pt(p[0], p[1], p[2]);
      const depth = cubeDepth(z, half);
      out.add(x, y, z, (o.trailR ?? 0.75) * (0.72 + depth * 0.38) * rs, 0.76 - depth * 0.12, (o.trailA ?? 0.48) * (0.45 + depth * 0.55));
    }
  }

  const particles = Math.max(1, Math.round(o.particleCount ?? 5));
  const trailDots = Math.max(0, Math.round(o.trailDots ?? 3));
  for (let i = 0; i < particles; i++) {
    const edge = Math.floor(hashD(i, 3.7) * CUBE_EDGE_COUNT);
    const forward = edge % 2 === 0;
    const phase = frac(t * (0.22 + hashD(i, 8.1) * 0.13) + hashD(i, 1.9));
    const travel = forward ? phase : 1 - phase;
    for (let trail = trailDots; trail >= 0; trail--) {
      const f = travel + (forward ? -1 : 1) * trail * 0.065;
      if (f < 0 || f > 1) continue;
      const p = cubeEdgePoint(edge, f, half);
      const [x, y, z] = pt(p[0], p[1], p[2]);
      const depth = cubeDepth(z, half);
      const strength = 1 - trail / Math.max(1, trailDots + 1);
      out.add(
        x,
        y,
        z + trail * 0.001,
        ((o.particleR ?? 1.45) + (o.particleDepthR ?? 1.2) * depth) * (0.55 + strength * 0.45) * rs,
        0.34 - depth * 0.27,
        0.3 + strength * 0.7
      );
    }
  }
};

export const buildCubeGlobe: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size);
  const pt = makeCubeProj(Math.sin(t * 0.18) * 0.06, Math.sin(t * 0.13) * 0.03, center, center, half);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const scan = Math.sin(t * (o.scanRate ?? 1.35));
  const scanWidth = o.scanWidth ?? 0.16;
  const dimBase = o.dimBase ?? 0.48;

  for (const p of cubeFaceGrid(o.faceGrid ?? 9)) {
    const [x, y, z] = pt(p[0], p[1], p[2]);
    const depth = cubeDepth(z, half);
    const distance = p[0] - scan;
    const boost = Math.exp(-(distance * distance) / scanWidth) * (0.35 + depth * 0.65);
    out.add(
      x,
      y,
      z,
      ((o.rBase ?? 0.62) + (o.rDepth ?? 1.65) * depth + (o.rBoost ?? 0.9) * boost) * rs,
      (o.inkFar ?? 0.64) - (o.inkSpan ?? 0.54) * depth,
      dimBase + (1 - dimBase) * Math.min(1, boost)
    );
  }
};

interface Move {
  axis: 0 | 1 | 2;
  lo: number;
  hi: number;
  ang: number;
}

function solveCycle(time: number, count: number, slotDuration: number, rest: number) {
  const cycle = 2 * count * slotDuration + rest;
  const cycleTime = time % cycle;
  const amount = new Array<number>(count).fill(0);
  let active = -1;
  if (cycleTime < 2 * count * slotDuration) {
    const slot = Math.floor(cycleTime / slotDuration);
    const progress = (cycleTime - slot * slotDuration) / slotDuration;
    const clamped = Math.min(1, progress / 0.7);
    const eased = 1 - (1 - clamped) ** 3;
    if (slot < count) {
      for (let i = 0; i < slot; i++) amount[i] = 1;
      amount[slot] = eased;
      active = slot;
    } else {
      const reverse = 2 * count - 1 - slot;
      for (let i = 0; i < reverse; i++) amount[i] = 1;
      amount[reverse] = 1 - eased;
      active = reverse;
    }
  }
  return { amount, active };
}

function applyMoves(
  point: [number, number, number],
  moves: Move[],
  cycle: { amount: number[]; active: number }
): [number, number, number, boolean] {
  let [x, y, z] = point;
  let inActive = false;
  for (let i = 0; i < moves.length; i++) {
    if (cycle.amount[i] <= 0) continue;
    const move = moves[i];
    const coord = move.axis === 0 ? x : move.axis === 1 ? y : z;
    if (coord < move.lo || coord >= move.hi) continue;
    if (i === cycle.active) inActive = true;
    const angle = move.ang * cycle.amount[i];
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    if (move.axis === 0) {
      const y2 = y * cosine - z * sine;
      z = y * sine + z * cosine;
      y = y2;
    } else if (move.axis === 1) {
      const x2 = x * cosine + z * sine;
      z = -x * sine + z * cosine;
      x = x2;
    } else {
      const x2 = x * cosine - y * sine;
      y = x * sine + y * cosine;
      x = x2;
    }
  }
  return [x, y, z, inActive];
}

function makeMoves(count: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3)) as 0 | 1 | 2;
    const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
    const direction = hashD(i, 7.7) < 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi: lo + 0.5, ang: (direction * Math.PI) / 2 });
  }
  return moves;
}

export const buildCubeRubik: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.96);
  const pt = makeCubeProj(Math.sin(t * 0.14) * 0.055, Math.sin(t * 0.19) * 0.025, center, center, half);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const moveCount = Math.max(1, Math.round(o.moveCount ?? 12));
  const moves = makeMoves(moveCount);
  const cycle = solveCycle(t, moveCount, 0.42, 1.2);

  for (const sample of cubeFaceGrid(o.faceGrid ?? 8)) {
    const [px, py, pz, active] = applyMoves(sample, moves, cycle);
    const [x, y, z] = pt(px, py, pz);
    const depth = cubeDepth(z, half);
    out.add(
      x,
      y,
      z,
      ((o.rBase ?? 0.62) + (o.rDepth ?? 1.7) * depth + (active ? (o.rActive ?? 0.38) : 0)) * rs,
      (o.inkFar ?? 0.64) - (o.inkSpan ?? 0.54) * depth - (active ? 0.14 : 0)
    );
  }
};

export const buildCubeWave: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.97);
  const pt = makeCubeProj(Math.sin(t * 0.1) * 0.045, Math.sin(t * 0.16) * 0.025, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);

  for (const p of cubeFaceGrid(o.faceGrid ?? 8)) {
    const wave = 0.62 * Math.sin(t * 2.05 - p[1] * 3.8) + 0.38 * Math.sin(t * 1.27 + p[1] * 5.2 + p[0]);
    const radial = half * (0.95 + wave * (o.waveAmp ?? 0.055));
    const [x, y, z] = pt(p[0] * radial, p[1] * radial, p[2] * radial);
    const depth = cubeDepth(z, half);
    const crest = Math.max(0, wave);
    out.add(x, y, z, ((o.rBase ?? 0.62) + (o.rDepth ?? 1.68) * depth) * (1 + crest * 0.35) * rs, 0.66 - depth * 0.55 - crest * 0.09);
  }
};

export const buildCubeWeb: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.98 * (o.cubeScale ?? 1));
  const pt = makeCubeProj(Math.sin(t * 0.12) * 0.06, Math.sin(t * 0.09) * 0.03, center, center, half);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const nodeCount = Math.max(4, Math.round(o.nodeCount ?? 30));
  const linkDistance = o.linkDistance ?? 0.82;
  const nodeR = o.nodeR ?? 1.35;
  const nodeDepthR = o.nodeDepthR ?? 1.75;
  const nodes: Array<[number, number, number]> = [];

  for (let i = 0; i < nodeCount; i++) {
    const direction = fibDir(i, nodeCount);
    nodes.push(
      cubeSurface([
        direction[0] + 0.24 * (vnoise(i * 0.31 + 9, t * 0.24) - 0.5) * 2,
        direction[1] + 0.24 * (vnoise(i * 0.53 + 27, t * 0.21) - 0.5) * 2,
        direction[2] + 0.24 * (vnoise(i * 0.77 + 55, t * 0.27) - 0.5) * 2
      ])
    );
  }

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      const dz = nodes[i][2] - nodes[j][2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance >= linkDistance) continue;
      const [x1, y1, z1] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
      const [x2, y2, z2] = pt(nodes[j][0], nodes[j][1], nodes[j][2]);
      const depth = cubeDepth((z1 + z2) / 2, half);
      out.addLine(x1, y1, x2, y2, 0.42, Math.max(0.55, (o.lineW ?? 0.8) * rs), (1 - distance / linkDistance) * (0.28 + 0.58 * depth));
    }
  }

  for (let i = 0; i < nodeCount; i++) {
    const [x, y, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
    const depth = cubeDepth(z, half);
    const pulse = 1 + 0.22 * Math.sin(t * 1.4 + i * 2.7);
    out.add(x, y, z, (nodeR + nodeDepthR * depth) * pulse * rs, 0.55 - 0.45 * depth);
  }

  const signalCount = Math.max(1, Math.round(o.signalCount ?? 5));
  for (let signal = 0; signal < signalCount; signal++) {
    const segment = Math.floor(t * 0.55 + signal * 7.31);
    const a = Math.floor(hashD(segment, signal * 3.1 + 1.7) * nodeCount);
    const b = Math.floor(hashD(segment, signal * 5.7 + 4.2) * nodeCount);
    if (a === b) continue;
    const f = frac(t * 0.55 + signal * 7.31);
    const point = cubeSurface([
      lerp(nodes[a][0], nodes[b][0], f),
      lerp(nodes[a][1], nodes[b][1], f),
      lerp(nodes[a][2], nodes[b][2], f)
    ]);
    const [x, y, z] = pt(point[0], point[1], point[2]);
    const depth = cubeDepth(z, half);
    out.add(x, y, z, (nodeR * 1.5 + nodeDepthR * depth) * rs, 0.05, 0.5 + 0.5 * depth);
  }
};

export const buildCubeBraid: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.96);
  const pt = makeCubeProj(Math.sin(t * 0.16) * 0.065, Math.sin(t * 0.12) * 0.03, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const surfaceDots = Math.max(0, Math.round(o.surfaceDots ?? 100));

  for (const point of cubeSurfaceSamples(surfaceDots, half)) {
    const [x, y, z] = pt(point[0], point[1], point[2]);
    const depth = cubeDepth(z, half);
    out.add(x, y, z, (o.surfaceR ?? 0.72) * rs, 0.79, 0.08 + 0.2 * depth);
  }

  const strandDots = Math.max(4, Math.round(o.strandDots ?? 52));
  const turns = o.turns ?? 3;
  for (let strand = 0; strand < 3; strand++) {
    const phase = (strand / 3) * Math.PI * 2;
    for (let i = 0; i < strandDots; i++) {
      const u = (frac(i / strandDots + t * 0.045) * 2 - 1) * 0.96;
      const surface = Math.sqrt(Math.max(0, 1 - u * u));
      const endFade = Math.min(1, (1 - Math.abs(u)) / 0.1);
      const angle = u * Math.PI * turns + phase;
      const weave = 1 + 0.055 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * 0.8);
      const point = cubeSurface([Math.cos(angle) * surface, u, Math.sin(angle) * surface], half * weave);
      const [x, y, z] = pt(point[0], point[1], point[2]);
      const depth = cubeDepth(z, half);
      out.add(x, y, z, ((o.rBase ?? 1.15) + (o.rDepth ?? 1.75) * depth) * rs, 0.55 - 0.45 * depth, endFade * (0.42 + 0.58 * depth));
    }
  }
};

export const buildCubeRibbon: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.96);
  const spin = o.spin ?? 0;
  const pt = makeCubeProj(t * 0.08 * spin + Math.sin(t * 0.12) * 0.045, Math.sin(t * 0.1) * 0.025, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const surfaceDots = Math.max(0, Math.round(o.surfaceDots ?? 90));

  for (const point of cubeSurfaceSamples(surfaceDots, half)) {
    const [x, y, z] = pt(point[0], point[1], point[2]);
    const depth = cubeDepth(z, half);
    out.add(x, y, z, (o.surfaceR ?? 0.7) * rs, 0.79, 0.07 + 0.19 * depth);
  }

  const planeYaw = t * 0.18 * spin;
  const planeTilt = 0.55 + 0.12 * Math.sin(t * 0.18);
  const ux = Math.cos(planeYaw);
  const uy = 0;
  const uz = Math.sin(planeYaw);
  const vx = -uz * Math.sin(planeTilt);
  const vy = Math.cos(planeTilt);
  const vz = ux * Math.sin(planeTilt);
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const lanes = Math.max(1, Math.round((o.lanes ?? 5) * (o.bandMul ?? 1)));
  const segments = Math.max(8, Math.round(o.segments ?? 72));

  for (let lane = 0; lane < lanes; lane++) {
    const laneOffset = (lane - (lanes - 1) / 2) * 0.07;
    const edge = Math.abs(lane - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const wave =
        (0.15 * Math.sin(angle * 3 - t * 1.7 + lane * 0.22) + 0.07 * Math.sin(angle * 5 + t * 1.1)) * (o.waveMul ?? 1);
      const point = cubeSurface(
        [
          ux * Math.cos(angle) + vx * Math.sin(angle) + nx * (laneOffset + wave),
          uy * Math.cos(angle) + vy * Math.sin(angle) + ny * (laneOffset + wave),
          uz * Math.cos(angle) + vz * Math.sin(angle) + nz * (laneOffset + wave)
        ],
        half * (1 + wave * 0.025)
      );
      const [x, y, z] = pt(point[0], point[1], point[2]);
      const depth = cubeDepth(z, half);
      out.add(
        x,
        y,
        z,
        ((o.rBase ?? 1.05) + (o.rDepth ?? 1.65) * depth) * (1 - 0.24 * edge) * rs,
        0.52 - 0.44 * depth + 0.18 * edge,
        0.38 + 0.62 * depth
      );
    }
  }
};

export const buildCubeBreathing: ModeBuild = (out, size, t, o) => {
  const center = size / 2;
  const half = cubeRadius(size, 0.91);
  const pt = makeCubeProj(Math.sin(t * 0.16) * 0.045, Math.sin(t * 0.12) * 0.025, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const edgeDots = Math.max(2, Math.round(o.edgeDots ?? 9));
  const shells = Math.max(1, Math.round(o.shells ?? 3));
  const pulse = 1 + (o.breathAmp ?? 0.075) * (0.65 * Math.sin(t * 1.25) + 0.35 * Math.sin(t * 0.72 + 1.1));

  for (let shell = 0; shell < shells; shell++) {
    const offset = (shell - (shells - 1) / 2) * 0.038;
    for (const point of cubeWirePoints(edgeDots, half * (pulse + offset))) {
      const [x, y, z] = pt(point[0], point[1], point[2]);
      const depth = cubeDepth(z, half * 1.12);
      out.add(
        x,
        y,
        z,
        ((o.rBase ?? 0.95) + (o.rDepth ?? 1.55) * depth) * rs,
        0.57 - 0.47 * depth + Math.abs(offset) * 2,
        0.38 + 0.62 * depth
      );
    }
  }
};

const SHAPES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 1],
  [0.78, 1.16, 0.9],
  [1.15, 0.82, 1]
];

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

export const buildCubeMorph: ModeBuild = (out, size, t, o) => {
  const hold = 1.35;
  const transition = 0.9;
  const segment = hold + transition;
  const cycleTime = t % (segment * SHAPES.length);
  const shapeIndex = Math.floor(cycleTime / segment);
  const local = cycleTime - shapeIndex * segment;
  const blend = local > hold ? smooth((local - hold) / transition) : 0;
  const from = SHAPES[shapeIndex];
  const to = SHAPES[(shapeIndex + 1) % SHAPES.length];
  const scales = [
    from[0] + (to[0] - from[0]) * blend,
    from[1] + (to[1] - from[1]) * blend,
    from[2] + (to[2] - from[2]) * blend
  ];
  const center = size / 2;
  const half = cubeRadius(size, 0.86 * (o.shapeScale ?? 1));
  const pt = makeCubeProj(Math.sin(t * 0.15) * 0.055, Math.sin(t * 0.1) * 0.025, center, center, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pulse = 1 + 0.018 * Math.sin(local * 3.1);

  for (const point of cubeWirePoints(o.edgeDots ?? 10, half)) {
    const [x, y, z] = pt(point[0] * scales[0] * pulse, point[1] * scales[1] * pulse, point[2] * scales[2] * pulse);
    const depth = cubeDepth(z, half * 1.2);
    out.add(x, y, z, ((o.dotR ?? 1.25) + depth * (o.dotDepthR ?? 0.9)) * rs, 0.58 - depth * 0.48, 0.42 + depth * 0.58);
  }
};
