import {
  IDLE_FLAGS,
  applyEvent,
  snapshotFromFlags,
  type ConversationEvent,
  type ConversationFlags
} from '../bus/reduce';
import type { PresenceSnapshot } from '../bus/types';

export interface TimedEvent {
  t: number;
  event: ConversationEvent;
}

/**
 * One full-duplex turn with agentic tool use — the primary interface this
 * package is meant to visualise.
 *
 * Human speaks → agent thinks → Bash runs → permission gate → more thought →
 * agent speaks → done.
 */
export const DEMO_TURN: TimedEvent[] = [
  { t: 0, event: { kind: 'session.start' } },
  { t: 0.35, event: { kind: 'human.start' } },
  { t: 2.4, event: { kind: 'human.end' } },
  { t: 2.4, event: { kind: 'agent.think' } },
  { t: 3.6, event: { kind: 'tool.start', name: 'Bash' } },
  { t: 5.4, event: { kind: 'tool.permission', name: 'Bash' } },
  { t: 7.3, event: { kind: 'tool.end', name: 'Bash' } },
  { t: 8.6, event: { kind: 'agent.speak' } },
  { t: 11.4, event: { kind: 'agent.speak.end' } },
  { t: 11.6, event: { kind: 'turn.end' } }
];

export function snapshotAt(events: TimedEvent[], time: number, start: ConversationFlags = IDLE_FLAGS): PresenceSnapshot {
  let flags = start;
  for (const step of events) {
    if (step.t > time) break;
    flags = applyEvent(flags, step.event);
  }
  return snapshotFromFlags(flags);
}

export const DEMO_TURN_DURATION = 13;
