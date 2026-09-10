import type { PresencePhase } from '../bus/types';
import type { StateId } from './bloub/states';

/**
 * Conversation phase → bloub catalog pose.
 *
 * Listening is the wide-eyed look (attentive). Tool work is the orbiting
 * triangle. A permission gate is the notify pastille. Agent speech is the
 * play swoosh. Failures become the upright "!".
 */
export function toFaceState(phase: PresencePhase): StateId {
  switch (phase) {
    case 'listening':
      return 'wide';
    case 'thinking':
      return 'thinking';
    case 'working':
      return 'orbit';
    case 'waiting':
      return 'notify';
    case 'speaking':
      return 'play';
    case 'done':
      return 'wink';
    case 'err':
      return 'exclaim';
    case 'asleep':
      return 'sleep';
    default:
      return 'idle';
  }
}
