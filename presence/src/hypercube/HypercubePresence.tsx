import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { paintHypercube } from './paint';

export function HypercubePresence({
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
  const tRef = useRef(0);

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
      paintHypercube(ctx, snapshot, size, tRef.current, dark);
    };
    paint();
    if (paused) return;
    return subscribe((dt) => {
      tRef.current += dt;
      paint();
    });
  }, [snapshot, size, dark, paused]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      aria-label={`hypercube · ${PHASE_LABELS[snapshot.phase]}`}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
