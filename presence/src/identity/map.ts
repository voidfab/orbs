import type { PresencePhase } from '../bus/types';
import type { Expression } from './blobatar/expression';
import {
  happy,
  idle,
  mad,
  scared,
  sleepy,
  surprised,
  thinking,
  unsure,
  wink
} from './blobatar/expression';

export const IDENTITY_EXPRESSIONS = {
  idle,
  happy,
  thinking,
  surprised,
  wink,
  sleepy,
  unsure,
  scared,
  mad
} as const;

export type IdentityExpressionId = keyof typeof IDENTITY_EXPRESSIONS;

/**
 * Who the blobatar is does not change with the turn. Expression is the
 * second axis: the same name holds a pose the bus selected.
 */
export function toIdentityExpression(phase: PresencePhase): Expression {
  switch (phase) {
    case 'listening':
      return surprised;
    case 'thinking':
      return thinking;
    case 'working':
      return unsure;
    case 'waiting':
      return scared;
    case 'speaking':
      return happy;
    case 'done':
      return wink;
    case 'err':
      return mad;
    case 'asleep':
      return sleepy;
    default:
      return idle;
  }
}

export function identityExpressionId(phase: PresencePhase): IdentityExpressionId {
  switch (phase) {
    case 'listening':
      return 'surprised';
    case 'thinking':
      return 'thinking';
    case 'working':
      return 'unsure';
    case 'waiting':
      return 'scared';
    case 'speaking':
      return 'happy';
    case 'done':
      return 'wink';
    case 'err':
      return 'mad';
    case 'asleep':
      return 'sleepy';
    default:
      return 'idle';
  }
}
