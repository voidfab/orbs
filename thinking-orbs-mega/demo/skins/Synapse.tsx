import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const GOLDEN = 0.61803398875;
const IDLE = hexRgb('#6E7BA0');
const LISTEN = hexRgb('#22D3EE');
const THINK = hexRgb('#A78BFA');
const SPEAK = hexRgb('#E879F9');

type Node = { x: number; y: number };
type Edge = { a: number; b: number; spoke: boolean };

function buildGraph(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.17;
    const r = 0.42 + ((i * GOLDEN) % 1) * 0.5;
    nodes.push({ x: Math.cos(a) * r * 1.15, y: Math.sin(a) * r * 0.88 });
  }
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const scored = nodes
      .map((p, j) => ({ j, d: (p.x - nodes[i].x) ** 2 + (p.y - nodes[i].y) ** 2 }))
      .filter((s) => s.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { j } of scored) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, spoke: false });
    }
  }
  const inner = nodes
    .map((p, j) => ({ j, d: p.x * p.x + p.y * p.y }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 8);
  for (const { j } of inner) edges.push({ a: -1, b: j, spoke: true });
  return { nodes, edges };
}

function phaseColor(w: Record<SkinPhase, number>) {
  let c: [number, number, number] = mixRgb(IDLE, IDLE, 0);
  c = mixRgb(c, LISTEN, w.listening);
  c = mixRgb(c, THINK, w.thinking);
  c = mixRgb(c, SPEAK, w.speaking);
  return c;
}

export function Synapse({
  size = 96,
  phase = 'listening',
  level = 0.45
}: {
  size?: number;
  phase?: SkinPhase;
  level?: number;
}) {
  const graph = useMemo(() => buildGraph(), []);
  const paint = useMemo(
    () =>
      (
        ctx: CanvasRenderingContext2D,
        s: number,
        t: number,
        _dt: number,
        w: Record<SkinPhase, number>
      ) => {
        ctx.clearRect(0, 0, s, s);
        const lv = syntheticLevel(phase, t, level);
        const cx = s / 2;
        const cy = s / 2;
        const contract = 1 - 0.18 * w.thinking;
        const R = cx * 0.78 * contract;
        const rgb = phaseColor(w);
        const webA = 0.1 + 0.18 * w.thinking + 0.08 * w.listening;
        const spokeA = 0.12 + 0.22 * (w.listening + w.speaking);

        const px = (p: Node) => cx + p.x * R;
        const py = (p: Node) => cy + p.y * R;

        ctx.lineCap = 'round';
        for (const e of graph.edges) {
          const ax = e.spoke ? cx : px(graph.nodes[e.a]);
          const ay = e.spoke ? cy : py(graph.nodes[e.a]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(px(graph.nodes[e.b]), py(graph.nodes[e.b]));
          ctx.strokeStyle = rgba(rgb, e.spoke ? spokeA : webA);
          ctx.lineWidth = e.spoke ? 1.1 : 0.7;
          ctx.stroke();
        }

        for (const p of graph.nodes) {
          ctx.beginPath();
          ctx.arc(px(p), py(p), 1.15 + w.thinking * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(rgb, 0.28 + 0.35 * w.thinking);
          ctx.fill();
        }

        const rate = 3 + 7 * w.thinking + 4 * w.listening + 4 * w.speaking;
        const pulses = Math.round(rate);
        for (let i = 0; i < pulses; i++) {
          const useSpoke = w.listening + w.speaking > 0.45 || (w.thinking > 0.4 && i % 4 === 0);
          const pool = graph.edges.filter((e) => e.spoke === useSpoke);
          const e = pool[i % pool.length] ?? graph.edges[i % graph.edges.length];
          let u = (t * (0.35 + lv * 0.55 + w.thinking * 0.4) + i * GOLDEN) % 1;
          if (e.spoke && w.listening > w.speaking) u = 1 - u;
          const ax = e.spoke ? 0 : graph.nodes[e.a].x;
          const ay = e.spoke ? 0 : graph.nodes[e.a].y;
          const bx = graph.nodes[e.b].x;
          const by = graph.nodes[e.b].y;
          const x = cx + (ax + (bx - ax) * u) * R;
          const y = cy + (ay + (by - ay) * u) * R;
          const fade = Math.sin(u * Math.PI);
          ctx.beginPath();
          ctx.arc(x, y, 1.4 + fade * 1.2 + lv * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = rgba(rgb, 0.35 + 0.55 * fade);
          ctx.fill();
        }
      },
    [graph, phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
