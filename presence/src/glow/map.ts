import type { PresencePhase } from '../bus/types';
import { AURORA_PALETTES, type AuroraPalette, type AuroraPaletteId } from './palettes';

/**
 * Aurora names five moods. We keep those names and fold the extra presence
 * phases onto them (working is slow cognition, waiting is an attentive listen,
 * speaking is a faster apple-intelligence wash, asleep is monochrome).
 */
export const AURORA_MOODS = ['neutral', 'listening', 'thinking', 'error', 'success'] as const;
export type AuroraMood = (typeof AURORA_MOODS)[number];

export function toAuroraMood(phase: PresencePhase): AuroraMood {
  switch (phase) {
    case 'listening':
    case 'waiting':
    case 'speaking':
      return 'listening';
    case 'thinking':
    case 'working':
      return 'thinking';
    case 'err':
      return 'error';
    case 'done':
      return 'success';
    default:
      return 'neutral';
  }
}

export function auroraPaletteId(phase: PresencePhase): AuroraPaletteId {
  switch (phase) {
    case 'thinking':
    case 'working':
      return 'ocean';
    case 'waiting':
      return 'sunset';
    case 'speaking':
      return 'appleIntelligence';
    case 'err':
      return 'error';
    case 'done':
      return 'success';
    case 'asleep':
      return 'monochrome';
    default:
      return 'appleIntelligence';
  }
}

export function auroraPalette(phase: PresencePhase): AuroraPalette {
  return AURORA_PALETTES[auroraPaletteId(phase)];
}

/**
 * Listening speeds the ring (1.5). Thinking slows it (0.6). Those two
 * multipliers are Aurora's. The rest are presence-side.
 */
export function auroraSpeed(phase: PresencePhase): number {
  switch (phase) {
    case 'listening':
    case 'waiting':
      return 1.5;
    case 'thinking':
      return 0.6;
    case 'working':
      return 0.85;
    case 'speaking':
      return 1.25;
    case 'err':
      return 1.4;
    case 'asleep':
      return 0.4;
    default:
      return 1;
  }
}
