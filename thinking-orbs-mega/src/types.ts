import type { CSSProperties, CanvasHTMLAttributes } from 'react';
import type { Palette, PaletteName, Ramp } from './color';
import type { OrbInteractionConfig } from './interaction';

/**
 * Original nine (0.3.1) plus fork extras. The original names keep their
 * official animations and 20/64 tunings.
 */
export type OrbState =
  | 'working'
  | 'searching'
  | 'solving'
  | 'listening'
  | 'connecting'
  | 'weaving'
  | 'composing'
  | 'breathing'
  | 'shaping'
  | 'idle'
  | 'thinking'
  | 'analyzing'
  | 'booking'
  | 'streaming'
  | 'success'
  | 'tracing'
  | 'waiting'
  | 'reasoning'
  | 'queuing'
  | 'reading'
  | 'gathering'
  | 'syncing'
  | 'comparing'
  | 'drafting'
  | 'retrying'
  | 'error'
  | 'committing'
  | 'progressing'
  | 'monitoring'
  | 'diverting'
  | 'verifying'
  | 'activating'
  | 'plotting'
  | 'focusing'
  | 'pondering'
  | 'recalling'
  | 'cubing'
  | 'building'
  | 'hypercube'
  | 'conjuring'
  | 'conjuring_static'
  | 'assembling'
  | 'evolving'
  | 'spinning'
  | 'responding'
  | 'presence'
  | 'cognition'
  | 'speaking';

/** Any CSS px in 12–256. 20 and 64 remain the official hand-tuned anchors. */
export type OrbSize = number;

export const SIZE_PRESETS = {
  inline: 20,
  avatar: 64,
  large: 96,
  hero: 128
} as const;

export type OrbTheme = 'auto' | 'dark' | 'light';
export type OrbShape = 'orb' | 'cube';
export type OrbVariant = 'classic' | 'contour';
export type TransitionKind = 'morph' | 'crossfade' | 'cut';

export type { Palette, PaletteName, Ramp, Stop } from './color';

export interface ThinkingOrbProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'style'> {
  state?: OrbState;
  size?: OrbSize;
  theme?: OrbTheme;
  palette?: PaletteName | Palette | string;
  ramp?: Ramp;
  speed?: number;
  paused?: boolean;
  once?: boolean;
  progress?: number;
  transition?: TransitionKind | number | false;
  duration?: number;
  crossfade?: number;
  batchPaths?: boolean;
  shape?: OrbShape;
  /** Line-cage treatment of the official verbs (Schoolees). */
  variant?: OrbVariant;
  /**
   * CSS ink (hex / rgb / named). Overrides `palette` when set.
   * Sampled once onto the canvas so any legal CSS color works.
   */
  color?: string;
  /** Paint t=0.6 and skip the clock — a still, not a freeze of the live loop. */
  static?: boolean;
  /** `canvas` (default) or `svg` (morphing-orbs idea — crisp at any CSS size). */
  renderer?: 'canvas' | 'svg';

  /**
   * Voice-style amplitude 0–1. Scales the finished frame from the centre
   * (Callisto / VoiceOrb extract). Omit for no effect.
   */
  volume?: number;

  interaction?: OrbInteractionConfig;
  reducedMotion?: boolean;
  onOrbTransitionStart?: (from: OrbState, to: OrbState) => void;
  onOrbTransitionEnd?: (from: OrbState, to: OrbState) => void;
  style?: CSSProperties;
}
