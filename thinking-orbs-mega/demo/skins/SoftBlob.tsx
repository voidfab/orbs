import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const C = {
  idle: hexRgb('#60a5fa'),
  listening: hexRgb('#38bdf8'),
  thinking: hexRgb('#a78bfa'),
  speaking: hexRgb('#f0abfc')
};

export function SoftBlob({
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
        const rgb = mixRgb(
          mixRgb(mixRgb(C.idle, C.listening, w.listening), C.thinking, w.thinking),
          C.speaking,
          w.speaking
        );
        const cx = s / 2 + Math.sin(t * 0.43) * (0.6 + w.thinking * 1.4);
        const cy = s / 2 + Math.sin(t * 0.36 + 1.7) * (0.8 + w.idle);
        const base = s * (0.26 + w.speaking * 0.05 + w.listening * 0.02);
        const lobes = 5 + Math.round(w.thinking * 3 + w.speaking * 2);
        ctx.beginPath();
        const steps = 72;
        for (let i = 0; i <= steps; i++) {
          const u = (i / steps) * Math.PI * 2;
          const n1 = Math.sin(u * 3 + t * (1.1 + w.thinking * 1.4));
          const n2 = Math.sin(u * lobes + t * (1.8 + w.speaking * 2.4));
          const deform = 1 + w.speaking * 0.16 * n2 + w.thinking * 0.1 * n1 + w.listening * lv * 0.08 * n1;
          const r = base * deform;
          const x = cx + Math.cos(u) * r;
          const y = cy + Math.sin(u) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(cx - base * 0.25, cy - base * 0.3, base * 0.05, cx, cy, base * 1.15);
        g.addColorStop(0, 'rgba(255,255,255,0.92)');
        g.addColorStop(0.45, rgba(rgb, 0.88));
        g.addColorStop(1, rgba(rgb, 0.08));
        ctx.fillStyle = g;
        ctx.fill();
        if (w.listening + w.speaking > 0.2) {
          ctx.strokeStyle = rgba(rgb, 0.25 + lv * 0.25);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      },
    [phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
