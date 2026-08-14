/**
 * Named, isolatable controls for Seam v2.
 *
 * Camera (yaw / tilt / hitch) is locked to the idle/speaking starting pose
 * unless an admin override moves those sliders. Phase no longer yanks the
 * projector. Everything else is a 0–1 knob that the demo can mock, bind to
 * analysis, or leave on the phase default.
 */

import type { SeamPhase } from './types';

export interface SeamKnobs {
  /** Mock 0–1 stand-in for "how hard the brain is thinking". */
  thinking: number;
  /** Rift (dominant + passive strand). Auto-follows thinking. */
  rift: number;
  /** Ghost (3,5) overlay. */
  ghost: number;
  /** Atmospheric filaments around the knot. */
  filaments: number;
  moteDensity: number;
  moteSpeed: number;
  moteDuration: number;
  /** 0 = one rail, 1 = six parallel windings. */
  railThreads: number;
  /** How fast the rails crawl around the tube. Independent of mote speed. */
  railSpeed: number;
  breath: number;
  travel: number;
  tube: number;
  /** Radial throb of the whole form. */
  pulse: number;
  /** Radial waveform along the primary knot. Bind external RMS here. */
  wave: number;
  yawRate: number;
  tilt: number;
  hitch: number;
}

export type KnobKey = keyof SeamKnobs;

export type AnalysisSource =
  | 'manual'
  | 'thinking'
  | 'in.rms'
  | 'in.peak'
  | 'in.bass'
  | 'in.mid'
  | 'in.high'
  | 'in.onset'
  | 'in.centroid'
  | 'out.rms'
  | 'out.peak'
  | 'out.bass'
  | 'out.mid'
  | 'out.high'
  | 'out.onset'
  | 'out.centroid';

export type SeamBindings = Partial<Record<KnobKey, AnalysisSource>>;

export interface BusAnalysis {
  rms: number;
  peak: number;
  vad: number;
  bass: number;
  mid: number;
  high: number;
  onset: number;
  centroid: number;
}

/** Idle / speaking starting pose. Phase must not change these. */
export const LOCKED_CAMERA: Pick<SeamKnobs, 'yawRate' | 'tilt' | 'hitch'> = {
  yawRate: 0.11,
  tilt: 0.72,
  hitch: 0
};

export const KNOB_META: Array<{
  key: KnobKey;
  label: string;
  group: 'camera' | 'layers' | 'motes' | 'rails' | 'motion';
}> = [
  { key: 'yawRate', label: 'yaw rate', group: 'camera' },
  { key: 'tilt', label: 'tilt', group: 'camera' },
  { key: 'hitch', label: 'hitch', group: 'camera' },
  { key: 'thinking', label: 'thinking', group: 'layers' },
  { key: 'rift', label: 'rift', group: 'layers' },
  { key: 'ghost', label: 'ghost knot', group: 'layers' },
  { key: 'filaments', label: 'filaments', group: 'layers' },
  { key: 'moteDensity', label: 'mote density', group: 'motes' },
  { key: 'moteSpeed', label: 'mote speed', group: 'motes' },
  { key: 'moteDuration', label: 'mote duration', group: 'motes' },
  { key: 'railThreads', label: 'rail threads', group: 'rails' },
  { key: 'railSpeed', label: 'rail speed', group: 'rails' },
  { key: 'breath', label: 'breath', group: 'motion' },
  { key: 'travel', label: 'travel', group: 'motion' },
  { key: 'tube', label: 'tube', group: 'motion' },
  { key: 'pulse', label: 'pulse', group: 'motion' },
  { key: 'wave', label: 'wave', group: 'motion' }
];

export const ANALYSIS_SOURCES: AnalysisSource[] = [
  'manual',
  'thinking',
  'in.rms',
  'in.peak',
  'in.bass',
  'in.mid',
  'in.high',
  'in.onset',
  'in.centroid',
  'out.rms',
  'out.peak',
  'out.bass',
  'out.mid',
  'out.high',
  'out.onset',
  'out.centroid'
];

export function defaultKnobs(): SeamKnobs {
  return {
    thinking: 0,
    rift: 0,
    ghost: 0,
    filaments: 0.16,
    moteDensity: 0.08,
    moteSpeed: 0.35,
    moteDuration: 0.45,
    railThreads: 0,
    railSpeed: 0,
    breath: 0.16,
    travel: 0.12,
    tube: 0.34,
    pulse: 0,
    wave: 0,
    ...LOCKED_CAMERA
  };
}

/** Extra rails beside the primary knot. 0 means none. */
export function railCount(threads: number): number {
  if (!Number.isFinite(threads) || threads <= 0.02) return 0;
  return Math.max(0, Math.min(6, Math.round(threads * 6)));
}

export function knobsFromPhase(phase: SeamPhase, input = 0, output = 0): SeamKnobs {
  const thinking = phase === 'thinking' ? 0.8 : 0;
  const base = defaultKnobs();
  if (phase === 'listening') {
    return {
      ...base,
      thinking: 0,
      rift: 0,
      ghost: 0,
      filaments: 0.14,
      moteDensity: 0.12 + input * 0.55,
      moteSpeed: 0.3 + input * 0.4,
      moteDuration: 0.4,
      railThreads: 0,
      railSpeed: 0,
      breath: 0.2 + input * 0.35,
      travel: 0.08,
      pulse: 0,
      wave: output
    };
  }
  if (phase === 'thinking') {
    return {
      ...base,
      thinking,
      rift: thinking,
      ghost: thinking * 0.7,
      filaments: 0.22 + thinking * 0.35,
      moteDensity: 0.18,
      moteSpeed: 0.28,
      moteDuration: 0.55,
      railThreads: thinking,
      railSpeed: thinking * 0.75,
      breath: 0.18,
      travel: 0.16,
      pulse: 0,
      wave: output
    };
  }
  if (phase === 'speaking') {
    return {
      ...base,
      thinking: 0,
      rift: 0,
      ghost: 0,
      filaments: 0.18,
      moteDensity: 0.08 + output * 0.22,
      moteSpeed: 0.3 + output * 0.35,
      moteDuration: 0.4,
      railThreads: 0,
      railSpeed: 0,
      breath: 0.12,
      travel: 0.12,
      pulse: 0,
      wave: output
    };
  }
  return base;
}

export function knobRange(key: KnobKey): { min: number; max: number; step: number } {
  if (key === 'yawRate') return { min: 0, max: 0.4, step: 0.005 };
  if (key === 'tilt') return { min: 0.2, max: 1.2, step: 0.01 };
  return { min: 0, max: 1, step: 0.01 };
}

export function clampKnob(key: KnobKey, value: number): number {
  if (key === 'yawRate') return clamp(value, 0, 0.4);
  if (key === 'tilt') return clamp(value, 0.2, 1.2);
  return clamp(value, 0, 1);
}

export function readAnalysis(
  source: AnalysisSource,
  thinking: number,
  input: BusAnalysis,
  output: BusAnalysis
): number | null {
  if (source === 'manual') return null;
  if (source === 'thinking') return clamp(thinking, 0, 1);
  const [bus, field] = source.split('.') as ['in' | 'out', keyof BusAnalysis];
  const pack = bus === 'in' ? input : output;
  return clamp(pack[field] ?? 0, 0, 1);
}

export function resolveKnobs(
  manual: SeamKnobs,
  bindings: SeamBindings,
  thinking: number,
  input: BusAnalysis,
  output: BusAnalysis
): SeamKnobs {
  const next = { ...manual };
  for (const key of Object.keys(manual) as KnobKey[]) {
    const source = bindings[key];
    if (!source || source === 'manual') continue;
    const v = readAnalysis(source, thinking, input, output);
    if (v !== null) next[key] = clampKnob(key, v);
  }
  return next;
}

export const SILENT_BUS: BusAnalysis = {
  rms: 0,
  peak: 0,
  vad: 0,
  bass: 0,
  mid: 0,
  high: 0,
  onset: 0,
  centroid: 0
};

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}
