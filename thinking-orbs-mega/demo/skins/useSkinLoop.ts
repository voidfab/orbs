import { useEffect, useRef } from 'react';
import { createPhaseMix, type SkinPhase } from './phase';

export function useSkinLoop(
  paint: (ctx: CanvasRenderingContext2D, size: number, t: number, dt: number, mix: Record<SkinPhase, number>) => void,
  size: number,
  phase: SkinPhase
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const mix = createPhaseMix(phaseRef.current);
    let raf = 0;
    let last = 0;
    let t = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      t += dt;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(size * dpr) || c.height !== Math.round(size * dpr)) {
        c.width = Math.round(size * dpr);
        c.height = Math.round(size * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try {
        paint(ctx, size, t, dt, mix.update(phaseRef.current, dt));
      } catch (err) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(size * 0.25, size * 0.25, size * 0.5, size * 0.5);
        console.error('[skin]', err);
      }
      raf = requestAnimationFrame(frame);
    };
    frame(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [paint, size]);

  return ref;
}
