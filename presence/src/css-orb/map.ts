import type { PresencePhase } from '../bus/types';

export const CSS_ORB_STATES = ['idle', 'listening', 'thinking', 'speaking', 'asleep'] as const;
export type CssOrbState = (typeof CSS_ORB_STATES)[number];

/**
 * Presence phases Orbz does not name fold onto the closest motion profile.
 * Working is cognition (thinking). Waiting is an attentive listen pulse.
 * Done returns to idle. Err keeps the thinking motion (colour can change).
 */
export function toCssOrbState(phase: PresencePhase): CssOrbState {
  switch (phase) {
    case 'listening':
    case 'waiting':
      return 'listening';
    case 'thinking':
    case 'working':
    case 'err':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'asleep':
      return 'asleep';
    default:
      return 'idle';
  }
}

export function cssOrbSpeed(phase: PresencePhase): number {
  if (phase === 'working') return 1.35;
  if (phase === 'waiting') return 1.2;
  if (phase === 'err') return 1.5;
  if (phase === 'asleep') return 0.55;
  return 1;
}
