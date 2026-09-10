import {
  IDLE_SNAPSHOT,
  type DuplexChannels,
  type PresencePhase,
  type PresenceSnapshot,
  type ToolActivity
} from './types';

/**
 * Full-duplex conversation + agentic tool use.
 *
 * These are the events a host already has: VAD/STT, model generation, TTS,
 * tool hooks, permission gates. Painters never see the raw events — they
 * subscribe to `PresenceSnapshot`.
 */
export type ConversationEvent =
  | { kind: 'session.start' }
  | { kind: 'session.end' }
  | { kind: 'human.start' }
  | { kind: 'human.end' }
  | { kind: 'agent.think' }
  | { kind: 'agent.speak' }
  | { kind: 'agent.speak.end' }
  | { kind: 'tool.start'; name: string }
  | { kind: 'tool.permission'; name: string }
  | { kind: 'tool.end'; name?: string }
  | { kind: 'tool.error'; name?: string; message?: string }
  | { kind: 'turn.end' }
  | { kind: 'error'; message?: string }
  | { kind: 'asleep' }
  | { kind: 'wake' };

export interface ConversationFlags {
  session: boolean;
  humanSpeaking: boolean;
  agentThinking: boolean;
  agentSpeaking: boolean;
  asleep: boolean;
  error: string | null;
  tool: ToolActivity | null;
  turnJustEnded: boolean;
}

export const IDLE_FLAGS: ConversationFlags = {
  session: false,
  humanSpeaking: false,
  agentThinking: false,
  agentSpeaking: false,
  asleep: false,
  error: null,
  tool: null,
  turnJustEnded: false
};

function clearTurn(flags: ConversationFlags): ConversationFlags {
  return {
    ...flags,
    humanSpeaking: false,
    agentThinking: false,
    agentSpeaking: false,
    tool: null,
    error: null,
    turnJustEnded: false
  };
}

export function applyEvent(flags: ConversationFlags, event: ConversationEvent): ConversationFlags {
  switch (event.kind) {
    case 'session.start':
      return { ...clearTurn(flags), session: true, asleep: false };
    case 'session.end':
      return { ...IDLE_FLAGS };
    case 'human.start':
      return {
        ...flags,
        session: true,
        humanSpeaking: true,
        asleep: false,
        turnJustEnded: false,
        error: null
      };
    case 'human.end':
      return { ...flags, humanSpeaking: false };
    case 'agent.think':
      return {
        ...flags,
        session: true,
        agentThinking: true,
        agentSpeaking: false,
        asleep: false,
        turnJustEnded: false,
        error: null
      };
    case 'agent.speak':
      return {
        ...flags,
        session: true,
        agentSpeaking: true,
        asleep: false,
        turnJustEnded: false,
        error: null
      };
    case 'agent.speak.end':
      return { ...flags, agentSpeaking: false };
    case 'tool.start':
      return {
        ...flags,
        session: true,
        tool: { name: event.name, status: 'running' },
        agentThinking: true,
        asleep: false,
        turnJustEnded: false,
        error: null
      };
    case 'tool.permission':
      return {
        ...flags,
        session: true,
        tool: { name: event.name, status: 'permission' },
        asleep: false,
        turnJustEnded: false
      };
    case 'tool.end':
      return {
        ...flags,
        tool: null,
        agentThinking: true,
        error: null
      };
    case 'tool.error':
      return {
        ...flags,
        tool: null,
        agentThinking: false,
        error: event.message ?? `${event.name ?? 'tool'} failed`
      };
    case 'turn.end':
      return {
        ...flags,
        humanSpeaking: false,
        agentThinking: false,
        agentSpeaking: false,
        tool: null,
        error: null,
        turnJustEnded: true
      };
    case 'error':
      return { ...flags, error: event.message ?? 'error', tool: null };
    case 'asleep':
      return { ...clearTurn(flags), session: flags.session, asleep: true };
    case 'wake':
      return { ...flags, asleep: false };
  }
}

/**
 * Rank for a single-phase painter. Duplex energy still rides on the buses:
 * both channels can be live while the named phase is `speaking` or `listening`.
 *
 * `err` and `waiting` outrank everything — a permission gate or a failure
 * must be visible. Agent speech outranks human speech so a talking agent
 * keeps its mouth while the input meter still shows barge-in. Human speech
 * outranks silent tool work so STT is obvious.
 */
export function phaseFromFlags(flags: ConversationFlags): PresencePhase {
  if (flags.error) return 'err';
  if (flags.asleep && !flags.humanSpeaking && !flags.agentSpeaking && !flags.agentThinking && !flags.tool) {
    return 'asleep';
  }
  if (flags.tool?.status === 'permission') return 'waiting';
  if (flags.agentSpeaking) return 'speaking';
  if (flags.humanSpeaking) return 'listening';
  if (flags.tool?.status === 'running') return 'working';
  if (flags.agentThinking) return 'thinking';
  if (flags.turnJustEnded) return 'done';
  return 'idle';
}

export function duplexFromFlags(
  flags: ConversationFlags,
  override?: Partial<DuplexChannels>
): DuplexChannels {
  return {
    input: override?.input ?? (flags.humanSpeaking ? 0.62 : 0),
    output: override?.output ?? (flags.agentSpeaking ? 0.7 : 0)
  };
}

export function snapshotFromFlags(
  flags: ConversationFlags,
  override?: Partial<DuplexChannels>
): PresenceSnapshot {
  return {
    phase: phaseFromFlags(flags),
    duplex: duplexFromFlags(flags, override),
    tool: flags.tool,
    error: flags.error,
    session: flags.session
  };
}

export function reduceConversation(
  flags: ConversationFlags,
  event: ConversationEvent,
  duplex?: Partial<DuplexChannels>
): { snapshot: PresenceSnapshot; flags: ConversationFlags } {
  const next = applyEvent(flags, event);
  return { flags: next, snapshot: snapshotFromFlags(next, duplex) };
}

/** Best-effort reverse of a snapshot for hosts that only store the snapshot. */
export function flagsFromSnapshot(snapshot: PresenceSnapshot): ConversationFlags {
  return {
    session: snapshot.session,
    humanSpeaking: snapshot.phase === 'listening' || snapshot.duplex.input > 0.08,
    agentThinking: snapshot.phase === 'thinking' || snapshot.phase === 'working',
    agentSpeaking: snapshot.phase === 'speaking' || snapshot.duplex.output > 0.08,
    asleep: snapshot.phase === 'asleep',
    error: snapshot.error,
    tool: snapshot.tool,
    turnJustEnded: snapshot.phase === 'done'
  };
}

export function reduceEvents(
  events: ConversationEvent[],
  start: ConversationFlags = IDLE_FLAGS
): PresenceSnapshot {
  let flags = start;
  for (const event of events) flags = applyEvent(flags, event);
  return snapshotFromFlags(flags);
}

export { IDLE_SNAPSHOT };
