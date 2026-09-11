import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { lookVector, stepSpring, type Spring2 } from './googly';

export function GooglyPresence({
  snapshot,
  size = 96,
  dark = true,
  paused = false
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const springs = useRef<[Spring2, Spring2]>([
    { x: 0, y: 0, vx: 0, vy: 0 },
    { x: 0, y: 0, vx: 0, vy: 0 }
  ]);

  useEffect(() => {
    const paint = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const duplex = snapshot.duplex;
      const look = lookVector(duplex.output - duplex.input, snapshot.phase === 'thinking' ? -0.35 : 0.15, 1.2);
      const sclera = size * 0.22;
      const pupilR = sclera * 0.42;
      const travel = sclera - pupilR - 2;
      const cx = [size * 0.35, size * 0.65];
      const cy = size * 0.5;
      const white = dark ? '#f4f4f5' : '#fafafa';
      const ink = dark ? '#111113' : '#161616';

      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.arc(cx[i]!, cy, sclera, 0, Math.PI * 2);
        ctx.fill();
        const s = springs.current[i]!;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(cx[i]! + s.x * travel, cy + s.y * travel, pupilR, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    paint();
    if (paused) return;
    return subscribe((dt) => {
      const duplex = snapshot.duplex;
      const look = lookVector(duplex.output - duplex.input, snapshot.phase === 'thinking' ? -0.35 : 0.2, 1.2);
      springs.current = [
        stepSpring(springs.current[0]!, look.x, look.y, dt),
        stepSpring(springs.current[1]!, look.x, look.y, dt)
      ];
      paint();
    });
  }, [snapshot, size, dark, paused]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      aria-label={`googly · ${PHASE_LABELS[snapshot.phase]}`}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
