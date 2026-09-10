import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { paintTerminalFace } from './palette';

export function TerminalPresence({
  snapshot,
  size = 96,
  dark = true
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintTerminalFace(ctx, snapshot.phase, size, dark);
  }, [snapshot.phase, size, dark]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={PHASE_LABELS[snapshot.phase]}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
