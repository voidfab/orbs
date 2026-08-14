// Cube space helpers from the cubed fork, plus a dedicated `cubing` painter.

import { fibDir, makeProj, radiusScale } from './core';
import type { ModeBuild } from './adapt';

export type Vec3 = [number, number, number];

const YAW = Math.PI / 4;
const TILT = Math.PI / 6;
const DEPTH_EXTENT = Math.sqrt(3);

const VERTICES: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1]
];

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7]
];

export const CUBE_EDGE_COUNT = EDGES.length;

export function cubeRadius(size: number, scale = 1): number {
  return (size / 2) * 0.52 * scale;
}

export function cubeDepth(z: number, halfExtent = 1): number {
  return Math.max(0, Math.min(1, (z / (halfExtent * DEPTH_EXTENT) + 1) / 2));
}

export function cubeSurfaceSamples(count: number, halfExtent = 1): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < count; i++) points.push(cubeSurface(fibDir(i, count), halfExtent));
  return points;
}

export function makeCubeProj(
  yawOffset: number,
  tiltOffset: number,
  cx: number,
  cy: number,
  scale: number
) {
  return makeProj(YAW + yawOffset, TILT + tiltOffset, cx, cy, scale);
}

export function cubeSurface(point: readonly [number, number, number], halfExtent = 1): Vec3 {
  const m = Math.max(Math.abs(point[0]), Math.abs(point[1]), Math.abs(point[2]));
  if (m < 1e-6) return [0, 0, 0];
  const scale = halfExtent / m;
  return [point[0] * scale, point[1] * scale, point[2] * scale];
}

export function cubeFaceGrid(divisions: number): Vec3[] {
  const n = Math.max(2, Math.round(divisions));
  const samples: Vec3[] = [];
  for (let face = 0; face < 6; face++) {
    for (let yi = 0; yi < n; yi++) {
      const v = -1 + (yi / (n - 1)) * 2;
      for (let xi = 0; xi < n; xi++) {
        const u = -1 + (xi / (n - 1)) * 2;
        let point: Vec3;
        if (face === 0) point = [1, u, v];
        else if (face === 1) point = [-1, u, v];
        else if (face === 2) point = [u, 1, v];
        else if (face === 3) point = [u, -1, v];
        else if (face === 4) point = [u, v, 1];
        else point = [u, v, -1];
        samples.push(point);
      }
    }
  }
  return samples;
}

export function cubeEdgePoint(edgeIndex: number, f: number, halfExtent = 1): Vec3 {
  const edge = EDGES[((edgeIndex % EDGES.length) + EDGES.length) % EDGES.length];
  const a = VERTICES[edge[0]];
  const b = VERTICES[edge[1]];
  const t = Math.max(0, Math.min(1, f));
  return [
    (a[0] + (b[0] - a[0]) * t) * halfExtent,
    (a[1] + (b[1] - a[1]) * t) * halfExtent,
    (a[2] + (b[2] - a[2]) * t) * halfExtent
  ];
}

export function cubeWirePoints(perEdge: number, halfExtent = 1): Vec3[] {
  const n = Math.max(2, Math.round(perEdge));
  const points: Vec3[] = [];
  for (let edge = 0; edge < EDGES.length; edge++) {
    for (let i = 0; i < n; i++) points.push(cubeEdgePoint(edge, i / (n - 1), halfExtent));
  }
  return points;
}

/** Dedicated cube painter: face lattice + bright wire, slowly tumbling. */
export const buildCube: ModeBuild = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = cubeRadius(size, o.spread ?? 1);
  const pt = makeCubeProj(t * 0.28, 0.06 * Math.sin(t * 0.35), cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.7;
  const rDepth = o.rDepth ?? 1.4;

  const faces = cubeFaceGrid(o.divs ?? 5);
  for (const p of faces) {
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(
      px,
      py,
      z,
      (rBase + rDepth * depth) * rs,
      0.62 - 0.4 * depth,
      0.28 + 0.55 * depth
    );
  }

  const perEdge = Math.max(3, Math.round(o.edgeN ?? 7));
  const wires = cubeWirePoints(perEdge);
  for (const p of wires) {
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z + 0.01, (rBase + rDepth * 0.35 + 0.6 * depth) * rs, 0.18, 0.55 + 0.4 * depth);
  }

  // A few packets travel the edges so the cube never reads as a static die.
  const packets = Math.max(1, Math.round(o.particles ?? 3));
  for (let s = 0; s < packets; s++) {
    const u = (t * 0.35 + s / packets) % 1;
    const edge = Math.floor((u * EDGES.length + s * 3) % EDGES.length);
    const f = (u * EDGES.length) % 1;
    const p = cubeEdgePoint(edge, f);
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z + 0.02, (rBase + rDepth * depth + 1.2) * rs, 0.08, 0.7 + 0.3 * depth);
  }

  // Keep a fibonacci ghost so cube ↔ orb morphs have something to pair with.
  const ghostN = o.ghostN ?? 24;
  for (let i = 0; i < ghostN; i++) {
    const d = cubeSurface(fibDir(i, ghostN), 0.92);
    const [px, py, z] = pt(d[0], d[1], d[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z, 0.55 * rs, 0.78, 0.08 + 0.16 * depth);
  }
};
