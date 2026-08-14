import { useMemo } from 'react';
import { hexRgb, mixRgb, rgba, syntheticLevel, type SkinPhase } from './phase';
import { useSkinLoop } from './useSkinLoop';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const FROM = hexRgb('#f0abfc');
const TO = hexRgb('#818cf8');

function buildSphere(count: number) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GOLDEN * i;
    points.push({
      x: Math.cos(th) * r,
      y,
      z: Math.sin(th) * r,
      ring: (i * 0.61803398875) % 1,
      seed: ((i * 0.7548776662) % 1) * Math.PI * 2,
      tone: (i * 0.5436890126) % 1
    });
  }
  return points;
}

export function ParticlesField({
  size = 96,
  phase = 'listening',
  level = 0.45
}: {
  size?: number;
  phase?: SkinPhase;
  level?: number;
}) {
  const points = useMemo(() => buildSphere(size >= 80 ? 520 : 280), [size]);
  const paint = useMemo(() => {
    let angleY = 0;
    let connect = 0;
    return (
      ctx: CanvasRenderingContext2D,
      s: number,
      t: number,
      dt: number,
      w: Record<SkinPhase, number>
    ) => {
      const lv = syntheticLevel(phase, t, level);
      const ripple = w.listening;
      const pulse = w.thinking;
      const flow = w.speaking;
      const idle = w.idle;
      angleY += dt * (0.16 + ripple * (0.9 + lv * 1.4) + flow * 0.55);
      connect = (connect + dt * (0.4 + pulse * 1.2 + flow * 0.8)) % (Math.PI * 2);
      const cx = s / 2;
      const cy = s / 2;
      const base = cx * 0.62;
      const radius =
        base * (1 + 0.05 * idle * Math.sin(t * 1.1) + lv * 0.16 + flow * (0.08 + lv * 0.28) - pulse * 0.18);
      ctx.clearRect(0, 0, s, s);
      ctx.globalCompositeOperation = ripple + pulse + flow > 0.45 ? 'lighter' : 'source-over';
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(0.32);
      const sinX = Math.sin(0.32);
      for (const p of points) {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2;
        const persp = 0.65 + depth * 0.45;
        let pr = radius;
        if (ripple > 0.01) pr *= 1 + (0.05 + lv * 0.24) * ripple * Math.sin(p.y * 4.5 - t * 6.5);
        if (pulse > 0.01) pr *= 1 - 0.16 * pulse * (0.5 + 0.5 * Math.sin(p.ring * Math.PI * 2 + t * 3.1));
        let ox = idle * radius * 0.05 * Math.sin(t * 0.55 + p.seed * 3.7);
        let oy = idle * radius * 0.05 * Math.cos(t * 0.62 + p.seed * 2.9);
        if (flow > 0.01) {
          ox += flow * radius * (0.02 + lv * 0.08) * Math.sin(t * 14 + p.seed * 9);
          oy += flow * radius * (0.02 + lv * 0.08) * Math.cos(t * 17 + p.seed * 6);
        }
        const sx = cx + x1 * pr * persp + ox;
        const sy = cy + y1 * pr * persp + oy;
        const ringA = (iToAngle(p) + connect);
        const ringR = cx * (0.58 + 0.13 * p.ring);
        const rx = cx + Math.cos(ringA) * ringR;
        const ry = cy + Math.sin(ringA) * ringR;
        const scatter = pulse * 0.55 + flow * 0.15;
        const x = sx + (rx - sx) * scatter;
        const y = sy + (ry - sy) * scatter;
        const rgb = mixRgb(FROM, TO, p.tone);
        ctx.fillStyle = rgba(rgb, (0.12 + depth * depth * 0.78) * (0.7 + 0.3 * (ripple + flow)));
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + depth * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
  }, [points, phase, level]);

  const ref = useSkinLoop(paint, size, phase);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} />;
}

function iToAngle(p: { ring: number; seed: number }): number {
  return p.ring * Math.PI * 2 + p.seed * 0.02;
}
