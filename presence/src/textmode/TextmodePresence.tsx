import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import type { TextmodeEngine } from './engines';
import { textmodeGrid } from './engines';
import { paintTextmode } from './grid';

export function TextmodePresence({
  snapshot,
  size = 96,
  dark = true,
  paused = false,
  cols,
  rows,
  engine = 'auto'
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
  cols?: number;
  rows?: number;
  engine?: TextmodeEngine;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const paint = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintTextmode(ctx, textmodeGrid(snapshot, tRef.current, cols, rows, engine), size, dark);
    };
    paint();
    if (paused) return;
    return subscribe((dt) => {
      tRef.current += dt;
      paint();
    });
  }, [snapshot, size, dark, paused, cols, rows, engine]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`${PHASE_LABELS[snapshot.phase]} textmode`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
