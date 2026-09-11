import type { PresenceSnapshot } from '../bus/types';
import { SILENT_DUPLEX } from '../bus/types';
import {
  applyPlaneRotation,
  grayCode,
  hypercube,
  identity,
  mulMatVec,
  project4to2
} from './cube';

const GEOM = hypercube(4);
const GRAY = grayCode(4);

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function drive(snapshot: PresenceSnapshot): { spin: number; comet: number } {
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const energy = clamp01(Math.max(duplex.input, duplex.output));
  switch (snapshot.phase) {
    case 'thinking':
      return { spin: 0.55, comet: 2.4 };
    case 'working':
      return { spin: 0.82, comet: 3.2 };
    case 'waiting':
      return { spin: 0.18, comet: 0.6 };
    case 'listening':
      return { spin: 0.28 + energy * 0.4, comet: 1.2 + energy };
    case 'speaking':
      return { spin: 0.34 + energy * 0.5, comet: 1.6 + energy };
    case 'err':
      return { spin: 1.1, comet: 4 };
    case 'asleep':
      return { spin: 0.06, comet: 0 };
    default:
      return { spin: 0.16, comet: 0.35 };
  }
}

export function paintHypercube(
  ctx: CanvasRenderingContext2D,
  snapshot: PresenceSnapshot,
  size: number,
  t: number,
  dark: boolean
): void {
  const { spin, comet } = drive(snapshot);
  let Q = identity(4);
  Q = applyPlaneRotation(Q, 0, 3, t * spin); // xw
  Q = applyPlaneRotation(Q, 1, 2, t * spin * 0.73); // yz
  Q = applyPlaneRotation(Q, 0, 2, t * spin * 0.31); // xz

  const rotated = GEOM.vertices.map((v) => mulMatVec(Q, v));
  const projected = rotated.map(project4to2);
  let maxR = 0;
  for (const p of projected) {
    const r = Math.hypot(p.x, p.y);
    if (r > maxR) maxR = r;
  }
  const scale = maxR > 1e-6 ? size * 0.38 / maxR : 1;
  const cx = size / 2;
  const cy = size / 2;

  let dMin = Infinity;
  let dMax = -Infinity;
  let wMin = Infinity;
  let wMax = -Infinity;
  for (const p of projected) {
    if (p.depth < dMin) dMin = p.depth;
    if (p.depth > dMax) dMax = p.depth;
    if (p.warm < wMin) wMin = p.warm;
    if (p.warm > wMax) wMax = p.warm;
  }
  const dRange = Math.max(1e-6, dMax - dMin);
  const wRange = Math.max(1e-6, wMax - wMin);

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';

  const order = GEOM.edges
    .map((e, i) => i)
    .sort((a, b) => {
      const da = (projected[GEOM.edges[a]![0]!]!.depth + projected[GEOM.edges[a]![1]!]!.depth) / 2;
      const db = (projected[GEOM.edges[b]![0]!]!.depth + projected[GEOM.edges[b]![1]!]!.depth) / 2;
      return da - db;
    });

  for (const i of order) {
    const [ai, bi] = GEOM.edges[i]!;
    const a = projected[ai]!;
    const b = projected[bi]!;
    const depthT = (a.depth + b.depth) / 2;
    const near = (depthT - dMin) / dRange;
    const warm = ((a.warm + b.warm) / 2 - wMin) / wRange;
    const alpha = 0.22 + 0.7 * near;
    const r = Math.round(140 + warm * 90);
    const g = Math.round(150 + (1 - warm) * 40);
    const bl = Math.round(200 - warm * 80);
    ctx.strokeStyle = dark
      ? `rgba(${r},${g},${bl},${alpha.toFixed(3)})`
      : `rgba(${r - 40},${g - 50},${bl - 40},${(alpha * 0.9).toFixed(3)})`;
    ctx.lineWidth = 0.7 + 1.4 * near;
    ctx.beginPath();
    ctx.moveTo(cx + a.x * scale, cy + a.y * scale);
    ctx.lineTo(cx + b.x * scale, cy + b.y * scale);
    ctx.stroke();
  }

  if (comet > 0.01) {
    const head = Math.floor(t * comet) % GRAY.length;
    const trail = 8;
    ctx.lineWidth = 2.1;
    for (let k = 0; k < trail; k++) {
      const i0 = GRAY[(head - k + GRAY.length) % GRAY.length]!;
      const i1 = GRAY[(head - k - 1 + GRAY.length) % GRAY.length]!;
      const a = projected[i0]!;
      const b = projected[i1]!;
      const fade = 1 - k / trail;
      ctx.strokeStyle = dark
        ? `rgba(255,244,224,${(0.15 + 0.75 * fade).toFixed(3)})`
        : `rgba(180,120,40,${(0.2 + 0.7 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(cx + a.x * scale, cy + a.y * scale);
      ctx.lineTo(cx + b.x * scale, cy + b.y * scale);
      ctx.stroke();
    }
    const p = projected[GRAY[head]!]!;
    ctx.fillStyle = dark ? '#fff6e0' : '#c48a28';
    ctx.beginPath();
    ctx.arc(cx + p.x * scale, cy + p.y * scale, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { GEOM, GRAY };
