import { useEffect, useRef } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { BotEngine } from './bloub/engine';
import { RAYON } from './bloub/repere';
import { SHAPE_BY_ID, type ShapeId } from './bloub/skins';
import { POSES, type StateId } from './bloub/states';
import { toFaceState } from './map';
import { faceFrameToSvg, faceTheme, paintFaceFrame } from './paint';

export interface FacePresenceProps {
  snapshot?: PresenceSnapshot;
  /** Catalog pose. Wins over snapshot mapping when set. */
  state?: StateId;
  /** Customiser silhouette. Default ball (`cercle`) stays video-faithful. */
  shape?: ShapeId;
  size?: number;
  theme?: 'auto' | 'dark' | 'light';
  paused?: boolean;
  static?: boolean;
  renderer?: 'canvas' | 'svg';
  reducedMotion?: boolean;
  speed?: number;
}

function resolveDark(theme: 'auto' | 'dark' | 'light'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveReduced(explicit?: boolean): boolean {
  if (explicit != null) return explicit;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FacePresence({
  snapshot,
  state,
  shape = 'cercle',
  size = 96,
  theme = 'auto',
  paused = false,
  static: isStatic = false,
  renderer = 'canvas',
  reducedMotion,
  speed = 1
}: FacePresenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<BotEngine | null>(null);
  const nowRef = useRef(0);
  const stateRef = useRef<StateId>('idle');
  const svgRef = useRef<string>('');

  const target = state ?? (snapshot ? toFaceState(snapshot.phase) : 'idle');
  const label = snapshot ? PHASE_LABELS[snapshot.phase] : target;
  const dark = resolveDark(theme);
  const reduced = resolveReduced(reducedMotion) || isStatic;
  const radii = shape === 'cercle' ? null : (SHAPE_BY_ID.get(shape)?.radii ?? null);

  if (!engineRef.current) {
    engineRef.current = new BotEngine(RAYON, target, radii);
    stateRef.current = target;
  }

  useEffect(() => {
    const engine = engineRef.current!;
    engine.setShape(radii, nowRef.current);
    if (target !== stateRef.current) {
      engine.setState(target, nowRef.current);
      stateRef.current = target;
    }

    const paint = () => {
      const t = reduced ? POSES[stateRef.current] : nowRef.current;
      const frame = reduced
        ? new BotEngine(RAYON, stateRef.current, radii).sample(t)
        : engine.sample(t);
      const colors = faceTheme(dark);
      if (renderer === 'svg') {
        svgRef.current = faceFrameToSvg(frame, size, colors);
        const host = wrapRef.current;
        if (host) host.innerHTML = svgRef.current;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFaceFrame(ctx, frame, size, colors);
    };

    paint();
    if (paused || reduced) return;

    return subscribe((dt) => {
      nowRef.current += dt * speed;
      paint();
    });
  }, [target, size, dark, paused, reduced, renderer, speed, radii]);

  return (
    <span
      ref={wrapRef}
      role="img"
      aria-label={label}
      style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0 }}
    >
      {renderer === 'canvas' ? (
        <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
      ) : null}
    </span>
  );
}
