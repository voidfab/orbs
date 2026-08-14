import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const C = {
  idle: hexRgb('#00c864'),
  listening: hexRgb('#00ffff'),
  thinking: hexRgb('#c084fc'),
  speaking: hexRgb('#ff00ff')
};

export function CallPulse({
  size = 96,
  phase = 'listening',
  level = 0.45
}: {
  size?: number;
  phase?: SkinPhase;
  level?: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        angle: (i / 42) * Math.PI * 2,
        radius: 18 + (i % 7) * 4,
        speed: 0.012 + (i % 5) * 0.004,
        size: 1 + (i % 3),
        wobble: i * 0.7
      })),
    []
  );
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
          mixRgb(mixRgb(C.idle, C.listening, w.listening), C.thinking, w.thinking),
          C.speaking,
          w.speaking
        );
        const speed = 1 + w.listening + w.speaking * 2.2 + w.thinking * 0.6;
        const scale = 1 + w.speaking * 0.25 + lv * 0.12;
        const minDim = s * 0.92;
        if (w.idle + w.listening + w.thinking > 0.2) {
          for (const p of particles) {
            const ang = p.angle + t * p.speed * speed * 18;
            const wob = p.wobble + t * 2;
            let r = p.radius * (minDim / 110) * (0.85 + w.listening * 0.25);
            r += Math.sin(wob) * 6 * (w.listening + w.thinking);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, p.size * (0.8 + w.speaking), 0, Math.PI * 2);
            ctx.fillStyle = rgba(rgb, 0.18 + w.listening * 0.35 + w.thinking * 0.15);
            ctx.fill();
          }
        }
        const rings = 3 + Math.round(w.speaking * 2);
        const base = minDim * 0.08;
        const maxR = (minDim / 2) * 0.9;
        for (let i = 0; i < rings; i++) {
          const u = (t * (0.55 + w.speaking) + i / rings) % 1;
          ctx.beginPath();
          ctx.arc(cx, cy, base + u * (maxR - base), 0, Math.PI * 2);
          ctx.strokeStyle = rgba(rgb, (1 - u) * 0.45 * scale);
          ctx.lineWidth = 1.4 + (1 - u) * 2;
          ctx.stroke();
        }
        const coreR = base * (1.1 + scale * 0.7);
        const g = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
        g.addColorStop(0, '#fff');
        g.addColorStop(1, rgba(rgb, 1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      },
    [particles, phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
