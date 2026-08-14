import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { sharedClock, subscribe as subscribeFrames } from '../driver';
import { useReducedMotion, useResolvedDark } from '../theme';
import { SeamField } from './field';
import type { SeamKnobs } from './knobs';
import {
  seamPhaseFromFox9,
  type SeamGeneration,
  type SeamInternal,
  type SeamPhase,
  type SeamVariant
} from './types';

export interface ConversationSeamProps {
  phase?: SeamPhase;
  /** User / STT amplitude 0–1. */
  inputVolume?: number;
  /** Agent / TTS amplitude 0–1. */
  outputVolume?: number;
  vad?: number;
  /** Live buses without a React render. */
  inputVolumeRef?: { current: number };
  outputVolumeRef?: { current: number };
  vadRef?: { current: number };
  variant?: SeamVariant;
  /** 1 keeps the original field. 2 is the esoteric knot / rift. */
  generation?: SeamGeneration;
  /** Override the internal (mic) body. Default follows variant. */
  internal?: SeamInternal;
  size?: number;
  theme?: 'auto' | 'dark' | 'light';
  speed?: number;
  paused?: boolean;
  /** Hollow core so a ThinkingOrb (or any node) can sit inside. */
  children?: ReactNode;
  onBargeIn?: () => void;
  knobs?: SeamKnobs;
  knobsRef?: { current: SeamKnobs };
  className?: string;
  style?: CSSProperties;
}

export function ConversationSeam({
  phase = 'idle',
  inputVolume = 0,
  outputVolume = 0,
  vad = 0,
  inputVolumeRef,
  outputVolumeRef,
  vadRef,
  variant = 'conduit',
  generation = 1,
  internal,
  size = 220,
  theme = 'auto',
  speed = 1,
  paused = false,
  children,
  onBargeIn,
  knobs,
  knobsRef,
  className,
  style
}: ConversationSeamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dark = useResolvedDark(theme, hostRef);
  const reduced = useReducedMotion();
  const live = useRef({
    phase,
    inputVolume,
    outputVolume,
    vad,
    inputVolumeRef,
    outputVolumeRef,
    vadRef,
    variant,
    generation,
    internal,
    coreOccupied: Boolean(children),
    speed,
    paused,
    dark,
    onBargeIn,
    knobs,
    knobsRef
  });
  live.current = {
    phase,
    inputVolume,
    outputVolume,
    vad,
    inputVolumeRef,
    outputVolumeRef,
    vadRef,
    variant,
    generation,
    internal,
    coreOccupied: Boolean(children),
    speed,
    paused,
    dark,
    onBargeIn,
    knobs,
    knobsRef
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const field = new SeamField();
    const pointer = { x: 0.5, y: 0.5, amount: 0, target: 0, barge: 0 };
    let t = reduced ? 0.6 : sharedClock();
    let unsub: (() => void) | null = null;

    const sizeCanvas = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    const paint = (dt: number) => {
      const l = live.current;
      const input = l.inputVolumeRef?.current ?? l.inputVolume;
      const output = l.outputVolumeRef?.current ?? l.outputVolume;
      const vadNow = l.vadRef?.current ?? l.vad;
      const knobsNow = l.knobsRef?.current ?? l.knobs;
      if (!l.paused && !reduced) {
        t += dt * l.speed;
        field.step(dt * l.speed, l.phase, input, output, l.generation, knobsNow);
        pointer.amount += (pointer.target - pointer.amount) * (1 - Math.exp(-10 * dt));
        pointer.barge = Math.max(0, pointer.barge - dt * 2.4);
      }
      ctx.setTransform(Math.min(2, devicePixelRatio || 1), 0, 0, Math.min(2, devicePixelRatio || 1), 0, 0);
      try {
        field.paint(ctx, size, {
          phase: l.phase,
          variant: l.variant,
          input,
          output,
          vad: vadNow,
          t,
          pointerX: pointer.x,
          pointerY: pointer.y,
          pointer: pointer.amount,
          barge: pointer.barge,
          dark: l.dark,
          generation: l.generation,
          coreOccupied: l.coreOccupied,
          internal: l.internal,
          knobs: knobsNow
        });
      } catch {
        /* a thrown frame must not kill the shared driver */
      }
    };

    const start = () => {
      if (unsub || reduced) return;
      unsub = subscribeFrames((dt) => paint(dt));
    };
    const stop = () => {
      unsub?.();
      unsub = null;
    };

    {
      const l = live.current;
      const input = l.inputVolumeRef?.current ?? l.inputVolume;
      const output = l.outputVolumeRef?.current ?? l.outputVolume;
      field.step(0.45, l.phase, input, output, l.generation, l.knobsRef?.current ?? l.knobs);
    }
    paint(0);
    if (!reduced) start();

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / Math.max(1, r.width);
      pointer.y = (e.clientY - r.top) / Math.max(1, r.height);
      pointer.target = 1;
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    const onDown = (e: PointerEvent) => {
      pointer.barge = 1;
      pointer.x = (e.clientX - canvas.getBoundingClientRect().left) / size;
      pointer.y = (e.clientY - canvas.getBoundingClientRect().top) / size;
      live.current.onBargeIn?.();
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerenter', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);

    const vis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', vis);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerenter', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
    };
  }, [size, reduced, variant, generation]);

  const core = size * (variant === 'halo' ? 0.4 : 0.28);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'block',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size, display: 'block', cursor: 'crosshair' }}
      />
      {children ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ width: core, height: core, display: 'grid', placeItems: 'center' }}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export { seamPhaseFromFox9 };
export type { SeamPhase, SeamVariant };
