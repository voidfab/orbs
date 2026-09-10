import type { PresencePhase } from './types.ts';
import { reduceEvents, type ConversationEvent } from './reduce.ts';

/** AgentPet `AgentState` — lifecycle independent of which CLI produced it. */
export type AgentPetState = 'registered' | 'working' | 'waiting' | 'done' | 'idle';

export function fromAgentPet(state: AgentPetState): PresencePhase {
  if (state === 'working') return 'working';
  if (state === 'waiting') return 'waiting';
  if (state === 'done') return 'done';
  if (state === 'registered') return 'idle';
  return 'idle';
}

/** Conversation Seam / Orbz / voice skins. */
export type SeamLike =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'asleep'
  | 'talking'
  | 'processing'
  | null
  | undefined;

export function fromSeam(phase: SeamLike): PresencePhase {
  if (phase === 'listening') return 'listening';
  if (phase === 'thinking' || phase === 'processing') return 'thinking';
  if (phase === 'speaking' || phase === 'talking') return 'speaking';
  if (phase === 'asleep') return 'asleep';
  return 'idle';
}

/** claude-terminal-face OSC 12 palette keys. */
export type ClaudeFaceKey = 'idle' | 'thinking' | 'working' | 'done' | 'err';

export function fromClaudeFace(key: ClaudeFaceKey): PresencePhase {
  if (key === 'thinking') return 'thinking';
  if (key === 'working') return 'working';
  if (key === 'done') return 'done';
  if (key === 'err') return 'err';
  return 'idle';
}

/**
 * Hitch Face event types. Permission requests become `waiting`; tool
 * progress becomes `working`; assistant generation is `thinking`.
 */
export function fromHitchEvent(eventType: string): PresencePhase {
  if (eventType === 'error.reported') return 'err';
  if (eventType === 'tool.permission_requested') return 'waiting';
  if (
    eventType === 'tool.requested' ||
    eventType === 'tool.progress' ||
    eventType === 'retry.started'
  ) {
    return 'working';
  }
  if (
    eventType === 'turn.assistant_started' ||
    eventType === 'llm.requested' ||
    eventType === 'subagent.started'
  ) {
    return 'thinking';
  }
  if (eventType === 'turn.user_prompt') return 'listening';
  if (
    eventType === 'turn.assistant_completed' ||
    eventType === 'turn.completed' ||
    eventType === 'llm.completed' ||
    eventType === 'tool.completed'
  ) {
    return 'done';
  }
  if (eventType === 'session.ended') return 'idle';
  return 'idle';
}

/** Pi coding-agent activity events (`ports/pi` ActivityEvent). */
export type PiActivityEvent =
  | { type: 'editor_content_changed'; hasText: boolean }
  | { type: 'agent_started' }
  | { type: 'assistant_text_started' }
  | { type: 'tool_started'; id: string; toolName: string }
  | { type: 'tool_finished'; id: string }
  | { type: 'agent_settled' };

export function piActivityToConversation(event: PiActivityEvent): ConversationEvent | null {
  switch (event.type) {
    case 'editor_content_changed':
      return event.hasText ? { kind: 'human.start' } : { kind: 'human.end' };
    case 'agent_started':
      return { kind: 'agent.think' };
    case 'assistant_text_started':
      return { kind: 'agent.speak' };
    case 'tool_started':
      return { kind: 'tool.start', name: event.toolName };
    case 'tool_finished':
      return { kind: 'tool.end' };
    case 'agent_settled':
      return { kind: 'turn.end' };
  }
}

/** Hermes `hermes:voice-bus` / Seam-like phase names. */
export function voiceBusToConversation(phase: string, toolName?: string): ConversationEvent | null {
  const p = phase.toLowerCase();
  if (p === 'listening' || p === 'recording' || p === 'transcribing') return { kind: 'human.start' };
  if (p === 'speaking' || p === 'talking') return { kind: 'agent.speak' };
  if (p === 'thinking' || p === 'processing' || p === 'composing' || p === 'streaming') {
    return { kind: 'agent.think' };
  }
  if (p === 'working' || p === 'tool' || p === 'searching' || p === 'shaping') {
    return { kind: 'tool.start', name: toolName ?? 'tool' };
  }
  if (p === 'waiting' || p === 'permission') return { kind: 'tool.permission', name: toolName ?? 'tool' };
  if (p === 'idle' || p === 'done' || p === 'success') return { kind: 'turn.end' };
  if (p === 'error' || p === 'err') return { kind: 'error' };
  if (p === 'asleep') return { kind: 'asleep' };
  return null;
}

export function hitchEventToConversation(eventType: string, toolName?: string): ConversationEvent {
  if (eventType === 'session.started' || eventType === 'session.resumed') return { kind: 'session.start' };
  if (eventType === 'session.ended') return { kind: 'session.end' };
  if (eventType === 'turn.user_prompt') return { kind: 'human.start' };
  if (eventType === 'turn.assistant_started' || eventType === 'llm.requested') return { kind: 'agent.think' };
  if (eventType === 'tool.permission_requested') {
    return { kind: 'tool.permission', name: toolName ?? 'tool' };
  }
  if (eventType === 'tool.requested' || eventType === 'tool.progress') {
    return { kind: 'tool.start', name: toolName ?? 'tool' };
  }
  if (eventType === 'tool.completed') return { kind: 'tool.end', name: toolName };
  if (eventType === 'error.reported') return { kind: 'error' };
  if (eventType === 'turn.completed' || eventType === 'turn.assistant_completed') return { kind: 'turn.end' };
  return { kind: 'agent.think' };
}

/** thinking-orbs-mega `OrbState` verbs we actually drive from the bus. */
export type OrbPresenceState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'working'
  | 'waiting'
  | 'speaking'
  | 'success'
  | 'error'
  | 'breathing';

export function toOrbState(phase: PresencePhase): OrbPresenceState {
  if (phase === 'listening') return 'listening';
  if (phase === 'thinking') return 'thinking';
  if (phase === 'working') return 'working';
  if (phase === 'waiting') return 'waiting';
  if (phase === 'speaking') return 'speaking';
  if (phase === 'done') return 'success';
  if (phase === 'err') return 'error';
  if (phase === 'asleep') return 'breathing';
  return 'idle';
}

export { reduceEvents };
