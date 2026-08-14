import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';

const FROM = hexRgb('#2dd4bf');
const TO = hexRgb('#38bdf8');
import { useSkinLoop } from './useSkinLoop';

export function WaveRing({
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
        const segs = 120;
        const base = s * 0.32;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const u = i / segs;
          const ang = u * Math.PI * 2 - Math.PI / 2;
          const wave =
            lv *
            (0.35 * w.listening * Math.sin(u * 18 * Math.PI + t * 7) +
              0.55 * w.speaking * Math.sin(u * 26 * Math.PI - t * 9) +
              0.18 * w.thinking * Math.sin(u * 8 * Math.PI + t * 2.4));
          const jag = w.speaking * 0.08 * Math.sign(Math.sin(u * 38 * Math.PI + t * 4));
          const r = base * (1 + wave * 0.42 + jag + w.idle * 0.02 * Math.sin(t + u * 6));
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const rgb = mixRgb(FROM, TO, 0.45 + w.speaking * 0.3);
        ctx.strokeStyle = rgba(rgb, 0.55 + w.listening * 0.25 + w.speaking * 0.3);
        ctx.lineWidth = 2 + w.speaking * 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, base * (0.42 + w.thinking * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = rgba(rgb, 0.08 + w.thinking * 0.12);
        ctx.fill();
      },
    [phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
