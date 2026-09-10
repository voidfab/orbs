import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { paintEcho, type EchoSkin } from './paint';
import { EchoTrail } from './trail';

export function EchoPresence({
  snapshot,
  size = 96,
  dark = true,
  paused = false,
  skin = 'cast'
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
  skin?: EchoSkin;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const trailRef = useRef(new EchoTrail());

  useEffect(() => {
    trailRef.current.adopt(snapshot);
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
      paintEcho(ctx, trailRef.current.frame(), size, dark, skin, tRef.current);
    };
    paint();
    if (paused) return;
    return subscribe((dt) => {
      tRef.current += dt;
      trailRef.current.step(dt);
      paint();
    });
  }, [snapshot, size, dark, paused, skin]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`${PHASE_LABELS[snapshot.phase]} echo`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
