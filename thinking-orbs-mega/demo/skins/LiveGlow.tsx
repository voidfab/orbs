import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const IDLE = hexRgb('#8aa4c8');
const LISTEN = hexRgb('#7ee0a8');
const THINK = hexRgb('#f5c16c');
const SPEAK = hexRgb('#8eb6ff');

export function LiveGlow({
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
        const rgb = mixRgb(
          mixRgb(mixRgb(IDLE, LISTEN, w.listening), THINK, w.thinking),
          SPEAK,
          w.speaking
        );
        const energy = 0.16 + w.listening * (0.28 + lv * 0.4) + w.thinking * 0.22 + w.speaking * (0.4 + lv * 0.35);
        const speed = 0.9 + w.thinking * 0.55 + w.speaking * 0.2;
        const breathe = 1 + Math.sin(t * 2 * speed) * (0.02 + energy * 0.04);
        const R = s * (0.22 + w.listening * 0.04 + w.speaking * 0.07) * breathe;
        const wash = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.85);
        wash.addColorStop(0, rgba(rgb, 0.22 + energy * 0.28));
        wash.addColorStop(0.55, rgba(rgb, 0.08 + energy * 0.08));
        wash.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = wash;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.85, 0, Math.PI * 2);
        ctx.fill();

        const rings = 3 + Math.round(w.speaking * 2 + w.listening);
        for (let i = 0; i < rings; i++) {
          const u = ((t * (0.35 + w.speaking * 0.55) + i / rings) % 1);
          const rr = R * (1.05 + u * (0.85 + w.speaking * 0.4));
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(rgb, (1 - u) * (0.18 + energy * 0.35));
          ctx.lineWidth = 1.2 + (1 - u) * 1.6;
          ctx.stroke();
        }

        if (w.thinking > 0.05) {
          const sweep = t * 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, R * 1.02, sweep, sweep + 0.7);
          ctx.strokeStyle = rgba(THINK, 0.35 + w.thinking * 0.5);
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }

        const body = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.3, R * 0.04, cx, cy + R * 0.08, R);
        body.addColorStop(0, 'rgba(255,255,255,0.98)');
        body.addColorStop(0.35, rgba(mixRgb([255, 255, 255], rgb, 0.35), 0.96));
        body.addColorStop(0.78, rgba(rgb, 0.9));
        body.addColorStop(1, rgba(rgb, 0.35 + energy * 0.2));
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx - R * 0.2, cy - R * 0.26, R * 0.14, R * 0.09, -0.5, 0, Math.PI * 2);
        ctx.fill();
      },
    [phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
