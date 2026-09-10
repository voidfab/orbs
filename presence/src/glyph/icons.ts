import type { PresencePhase } from '../bus/types';
import type { IconInput } from './morphicons/core/types';

/** 24×24 stroke paths (Lucide-shaped). Raw `d` is a morphicons IconInput. */
export const GLYPH_PATHS: Record<PresencePhase, IconInput> = {
  idle: 'M12 3a9 9 0 1 0 0.01 0z',
  listening: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v3M8 21h8',
  thinking: 'M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1',
  working: 'M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  waiting: 'M12 3a9 9 0 1 0 0.01 0zM12 7v5l3.5 2',
  speaking: 'M11 5 6 9H3v6h3l5 4zM16 8.5a4.5 4.5 0 0 1 0 7M19.2 5.8a8 8 0 0 1 0 12.4',
  done: 'M20 7 10 17l-5-5',
  err: 'M18 6 6 18M6 6l12 12',
  asleep: 'M13 4a7 7 0 1 0 7 9 9 9 0 0 1-7-9z'
};

export function glyphFor(phase: PresencePhase): IconInput {
  return GLYPH_PATHS[phase];
}
