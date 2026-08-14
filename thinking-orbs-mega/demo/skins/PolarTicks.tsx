import { useMemo } from 'react';
import { type SkinPhase, syntheticLevel } from './phase';
import { useSkinLoop } from './useSkinLoop';

export function PolarTicks({
  size = 96,
  phase = 'listening',
  level = 0.45
}: {
  size?: number;
  phase?: SkinPhase;
  level?: number;
}) {
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
        const cx = s / 2;
        const cy = s / 2;
        const lv = syntheticLevel(phase, t, level);
        const baseR = s * (0.28 + w.speaking * 0.06 + w.listening * 0.04);
        const count = Math.round(48 + w.listening * 24 + w.speaking * 16);
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 - Math.PI / 2 + t * (0.15 + w.thinking * 0.4);
          const mag =
            lv * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.37 + t * (2.2 + w.speaking * 3))));
          const breath = Math.sin(t * 1.4 + i * 0.07) * 0.5;
          const r = baseR + mag * s * 0.14 * (0.3 + w.listening + w.speaking) + breath;
          const op = 0.18 + mag * 0.55 + w.thinking * 0.15;
          const sz = 1.1 + mag * 1.6 + w.speaking * 0.4;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(79,139,255,${op.toFixed(2)})`;
          ctx.fill();
        }
        const rings = [
          { r: s * 0.16, n: 12, dir: 1, a: w.thinking },
          { r: s * 0.24, n: 16, dir: -0.7, a: w.thinking },
          { r: s * 0.32, n: 20, dir: 1, a: w.thinking * 0.85 }
        ];
        for (const ring of rings) {
          if (ring.a < 0.02) continue;
          for (let i = 0; i < ring.n; i++) {
            const ang = (i / ring.n) * Math.PI * 2 + t * ring.dir;
            const op = ring.a * (0.25 + 0.45 * Math.abs(Math.sin(ang + t)));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * ring.r, cy + Math.sin(ang) * ring.r, 1.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(155,123,255,${op.toFixed(2)})`;
            ctx.fill();
          }
        }
        if (w.thinking + w.idle > 0.1) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.08);
          g.addColorStop(0, `rgba(185,103,255,${0.35 + w.thinking * 0.55})`);
          g.addColorStop(1, 'rgba(185,103,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    [phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
