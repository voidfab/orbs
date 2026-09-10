import type { PresencePhase } from '../bus/types';

/**
 * Glyph Cast drive tables (fox9/apps/glyph). Seal / Hyphae / Beat are
 * portable character-grid engines. Corona stays 3D (textmode.js WebGL) and
 * is not copied. Mood palettes and phase knobs are the harvest.
 */

export const CAST_ENGINES = ['seal', 'hyphae', 'beat', 'field'] as const;
export type CastEngine = (typeof CAST_ENGINES)[number];

export const CAST_PHASES = ['idle', 'listening', 'armed', 'thinking', 'speaking'] as const;
export type CastPhase = (typeof CAST_PHASES)[number];

export type CastRgb = readonly [number, number, number];

export interface CastMoodPalette {
  ink: CastRgb;
  ember: CastRgb;
  field: CastRgb;
}

export interface CastPhaseDrive {
  spin: number;
  density: number;
  pulse: number;
  energy: number;
}

/** Glyph Cast rune charset. */
export const CAST_RUNE = '#@%*+=:;!~<>/\\[]{}?-oO0xX';

const MOOD_PALETTES: Record<string, CastMoodPalette> = {
  steady: { ink: [232, 196, 140], ember: [180, 120, 48], field: [18, 10, 6] },
  wry: { ink: [186, 214, 110], ember: [92, 120, 36], field: [12, 16, 8] },
  sassy: { ink: [255, 132, 78], ember: [176, 48, 28], field: [22, 8, 6] },
  earnest: { ink: [255, 228, 176], ember: [210, 150, 64], field: [20, 12, 6] },
  reflective: { ink: [168, 188, 214], ember: [72, 96, 140], field: [8, 12, 20] },
  hushed: { ink: [156, 102, 78], ember: [88, 40, 28], field: [10, 6, 6] },
  menace: { ink: [210, 46, 36], ember: [120, 8, 8], field: [14, 4, 4] },
  playful: { ink: [255, 204, 72], ember: [220, 120, 24], field: [18, 12, 4] },
  lively: { ink: [206, 255, 96], ember: [120, 176, 32], field: [10, 16, 6] },
  dreamy: { ink: [198, 164, 255], ember: [96, 64, 160], field: [12, 8, 22] }
};

const PHASE_DRIVE: Record<CastPhase, CastPhaseDrive> = {
  idle: { spin: 0.22, density: 0.34, pulse: 0.12, energy: 0.16 },
  listening: { spin: 0.52, density: 0.68, pulse: 0.48, energy: 0.42 },
  armed: { spin: 0.84, density: 0.86, pulse: 0.72, energy: 0.7 },
  thinking: { spin: 1.38, density: 1, pulse: 0.38, energy: 0.88 },
  speaking: { spin: 1.05, density: 0.92, pulse: 0.94, energy: 0.96 }
};

const PHASE_MOOD: Record<PresencePhase, string> = {
  idle: 'steady',
  listening: 'lively',
  thinking: 'dreamy',
  working: 'earnest',
  waiting: 'playful',
  speaking: 'sassy',
  done: 'wry',
  err: 'menace',
  asleep: 'hushed'
};

export function toCastPhase(phase: PresencePhase): CastPhase {
  switch (phase) {
    case 'listening':
      return 'listening';
    case 'waiting':
      return 'armed';
    case 'thinking':
    case 'working':
    case 'err':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default:
      return 'idle';
  }
}

export function autoCastEngine(phase: PresencePhase): CastEngine {
  if (phase === 'listening' || phase === 'speaking') return 'beat';
  if (phase === 'thinking') return 'hyphae';
  if (phase === 'working' || phase === 'waiting' || phase === 'err') return 'seal';
  return 'field';
}

export function castMoodPalette(phase: PresencePhase): CastMoodPalette {
  return MOOD_PALETTES[PHASE_MOOD[phase]] ?? MOOD_PALETTES.steady!;
}

export function castPhaseDrive(phase: CastPhase): CastPhaseDrive {
  return PHASE_DRIVE[phase];
}

export function mixRgb(a: CastRgb, b: CastRgb, amount: number): CastRgb {
  const t = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

export function rgbToHex(rgb: CastRgb): string {
  return `#${rgb.map((n) => clampByte(n).toString(16).padStart(2, '0')).join('')}`;
}

export function rune(index: number): string {
  return CAST_RUNE[((index % CAST_RUNE.length) + CAST_RUNE.length) % CAST_RUNE.length]!;
}

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}
