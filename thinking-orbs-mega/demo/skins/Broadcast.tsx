import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const TEAL = hexRgb('#00e5c0');
const DEEP = hexRgb('#00a98a');
const CORE = hexRgb('#eef3fa');

export function Broadcast({
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
        const lv = syntheticLevel(phase, t, level);
        const cx = s / 2;
        const cy = s / 2;
        const lock = 1 - 0.06 * w.thinking;
        const lift = (-0.04 * w.listening - 0.05 * w.speaking) * s;
        const base = cx * 0.34 * lock;
        const ripple = lv * 0.9 + 0.2 * w.idle + 0.45 * w.listening + 0.35 * w.speaking;
        const rgb = mixRgb(DEEP, TEAL, 0.45 + w.speaking * 0.25);
        const y0 = cy + lift;

        for (let k = 0; k < 3; k++) {
          const r = base * (1.15 + k * 0.38 + ripple * 0.22);
          ctx.beginPath();
          ctx.arc(cx, y0, r, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(rgb, 0.12 + ripple * 0.28 - k * 0.03);
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        const pr = base * (2.05 + ripple * 0.55);
        for (let i = 0; i < 18; i++) {
          const ang = (i / 18) * Math.PI * 2 + t * (0.15 + w.listening * 0.4);
          const wobble = 1 + 0.04 * Math.sin(t * 2.4 + i);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * pr * wobble, y0 + Math.sin(ang) * pr * wobble, 1.2 + ripple * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(TEAL, 0.16 + ripple * 0.5);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, y0, base * (1.05 + w.thinking * 0.04), 0, Math.PI * 2);
        ctx.fillStyle = rgba(mixRgb(DEEP, CORE, 0.35), 0.18 + w.thinking * 0.12);
        ctx.fill();

        const bars = 16;
        const maxH = base * (0.35 + lv * 0.95 + w.speaking * 0.2);
        for (let i = 0; i < bars; i++) {
          const u = (i + 0.5) / bars - 0.5;
          const env = 1 - Math.abs(u) * 1.4;
          const h =
            maxH *
            env *
            (0.35 +
              0.65 * Math.abs(Math.sin(t * (5.5 + w.speaking * 4) + i * 0.7)) *
                (w.listening + w.speaking + 0.25 * w.thinking + 0.08 * w.idle));
          const bw = (base * 1.15) / bars;
          ctx.fillStyle = rgba(CORE, 0.28 + lv * 0.45);
          ctx.fillRect(cx + u * base * 1.2 - bw * 0.35, y0 - h / 2, bw * 0.7, Math.max(1.2, h));
        }
      },
    [phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
