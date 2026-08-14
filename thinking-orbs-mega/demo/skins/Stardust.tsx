import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const DEEP = hexRgb('#35459e');
const BLUE = hexRgb('#5f7cff');
const COOL = hexRgb('#aac6ff');
const WARM = hexRgb('#ff5566');
const HOT = hexRgb('#ffa23c');

function buildCloud(count: number) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GOLDEN * i;
    const jitter = 1 + (((i * 0.7548776662) % 1) - 0.5) * 0.06;
    points.push({
      x: Math.cos(th) * r * jitter,
      y: y * jitter,
      z: Math.sin(th) * r * jitter,
      rnd: (i * 0.5436890126) % 1
    });
  }
  return points;
}

export function Stardust({
  size = 96,
  phase = 'listening',
  level = 0.45
}: {
  size?: number;
  phase?: SkinPhase;
  level?: number;
}) {
  const points = useMemo(() => buildCloud(size >= 80 ? 420 : 240), [size]);
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
        const yaw = t * (0.18 + w.listening * 0.35 + w.speaking * 0.25);
        const amp = 0.03 + 0.06 * (w.thinking + lv * 0.5);
        const R = cx * (0.62 + lv * 0.08 + w.speaking * 0.04);
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const tilt = 0.22 + 0.06 * Math.sin(t * 0.08);
        const cosX = Math.cos(tilt);
        const sinX = Math.sin(tilt);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of points) {
          const drift = amp * Math.sin(t * 0.9 + p.rnd * 9);
          const x0 = p.x + drift * (p.z * 0.4);
          const y0 = p.y + drift * 0.35;
          const z0 = p.z - drift * (p.x * 0.4);
          const x1 = x0 * cosY - z0 * sinY;
          const z1 = x0 * sinY + z0 * cosY;
          const y1 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;
          const depth = (z2 + 1) / 2;
          const front = Math.max(0, z2);
          const rim = Math.pow(1 - Math.abs(z2), 1.4);
          const bottom = Math.max(0, Math.min(1, (-y1 - 0.05) / 0.8));
          let warm = Math.min(1, bottom * (0.35 + 0.75 * rim) + w.speaking * 0.15);
          if (p.rnd > 0.955) warm = Math.max(warm, 0.55 + 0.45 * p.rnd);
          const cool = mixRgb(mixRgb(DEEP, BLUE, front), COOL, front * front * 0.5);
          const hot = mixRgb(WARM, HOT, Math.max(0, -y1));
          const rgb = mixRgb(cool, hot, warm * (0.35 + 0.45 * w.speaking + 0.2 * w.thinking));
          const bright = (0.35 + 0.55 * depth) * (0.7 + 0.4 * (w.listening + w.thinking + w.speaking));
          ctx.beginPath();
          ctx.arc(
            cx + x1 * R,
            cy + y1 * R,
            (0.7 + p.rnd * 0.7 + warm * 0.5) * (0.85 + depth * 0.4),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = rgba(rgb, bright * (0.22 + 0.45 * depth));
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    [points, phase, level]
  );
  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}
