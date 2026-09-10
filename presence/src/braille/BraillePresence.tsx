import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { TERMINAL_KEYS } from '../terminal/palette';
import { brailleFrame, paintBraille, type BrailleKind } from './meters';

export function BraillePresence({
  snapshot,
  size = 96,
  dark = true,
  paused = false,
  kind
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
  kind?: BrailleKind;
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
      const frame = brailleFrame(snapshot, tRef.current, kind);
      paintBraille(ctx, frame.rows, size, TERMINAL_KEYS[snapshot.phase], dark);
    };
    paint();
    if (paused) return;
    return subscribe((dt) => {
      tRef.current += dt;
      paint();
    });
  }, [snapshot, size, dark, paused, kind]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`${PHASE_LABELS[snapshot.phase]} braille meters`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
