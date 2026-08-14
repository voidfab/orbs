// Synapse: a constellation with web edges, spokes into the core, and
// several electrons riding those edges. Extracted from akari (traveling
// electrons) and the bigkijimon voiceorb field (web + spoke polarity).
// Distinct from `web` (proximity packets) and `graph` (one walker).

import type { Dot, Line, ModeFrame } from './types';
import { fibDir, finalizeFrame, frac, hashD, lerp, makeProj, radiusScale, slerp } from './core';

type Edge = { a: number; b: number; spoke: boolean };

function buildNet(n: number): { nodes: Array<[number, number, number]>; edges: Edge[] } {
  const nodes: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) nodes.push(fibDir(i, n));

  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const scored: Array<[number, number]> = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d =
        nodes[i][0] * nodes[j][0] + nodes[i][1] * nodes[j][1] + nodes[i][2] * nodes[j][2];
      scored.push([j, d]);
    }
    scored.sort((x, y) => y[1] - x[1]);
    for (const [j] of scored.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, spoke: false });
    }
  }

  const inner = Math.min(10, n);
  for (let i = 0; i < inner; i++) edges.push({ a: -1, b: i, spoke: true });
  return { nodes, edges };
}

const cache = new Map<number, ReturnType<typeof buildNet>>();
function net(n: number) {
  const hit = cache.get(n);
  if (hit) return hit;
  const built = buildNet(n);
  cache.set(n, built);
  return built;
}

export const frameSynapse: ModeFrame = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.8;
  const pt = makeProj(t * (o.spin ?? 0.1), 0.3, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const n = Math.max(8, Math.round(o.nodeN ?? 28));
  const { nodes, edges } = net(n);

  const lines: Line[] = [];
  const dots: Dot[] = [];
  const origin = pt(0, 0, 0);

  for (const e of edges) {
    const [x1, y1, z1] = e.spoke ? origin : pt(nodes[e.a][0], nodes[e.a][1], nodes[e.a][2]);
    const [x2, y2, z2] = pt(nodes[e.b][0], nodes[e.b][1], nodes[e.b][2]);
    const depth = ((z1 + z2) / 2 + 1) / 2;
    lines.push({
      x1,
      y1,
      x2,
      y2,
      white: e.spoke ? 0.38 : 0.52,
      a: (e.spoke ? 0.22 : 0.16) * (0.45 + 0.55 * depth),
      w: Math.max(0.5, (o.lineW ?? 0.7) * rs)
    });
  }

  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
    const depth = (z + 1) / 2;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.nodeR ?? 1.15) + (o.nodeRDepth ?? 1.4) * depth) * rs,
      white: 0.58 - 0.4 * depth,
      a: 0.35 + 0.55 * depth
    });
  }

  const pulses = Math.max(2, Math.round(o.signals ?? 8));
  const speed = o.pulseSpeed ?? 0.48;
  for (let s = 0; s < pulses; s++) {
    const e = edges[Math.floor(hashD(s, 2.1) * edges.length) % edges.length];
    let u = frac(t * speed + s * 0.61803398875);
    if (e.spoke && s % 2 === 0) u = 1 - u;
    let ux: number;
    let uy: number;
    let uz: number;
    if (e.spoke) {
      ux = lerp(0, nodes[e.b][0], u);
      uy = lerp(0, nodes[e.b][1], u);
      uz = lerp(0, nodes[e.b][2], u);
    } else {
      [ux, uy, uz] = slerp(nodes[e.a], nodes[e.b], u);
    }
    const [px, py, z] = pt(ux, uy, uz);
    const depth = (z + 1) / 2;
    const fade = Math.sin(u * Math.PI);
    dots.push({
      x: px,
      y: py,
      z: z + 0.02,
      r: ((o.rTravel ?? 1.55) + (o.rDepth ?? 1.1) * depth) * (0.55 + 0.45 * fade) * rs,
      white: 0.08 - 0.04 * depth,
      a: 0.35 + 0.6 * fade
    });
  }

  return finalizeFrame(dots, lines, o.rMin);
};
