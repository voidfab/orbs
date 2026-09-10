import type { ConversationEvent } from '../bus/reduce';
import type { PresencePhase } from '../bus/types';
import { TERMINAL_KEYS, nearestPhase } from './palette';

/**
 * Official claude-terminal-face OSC 12 key palette (hex without the # in the
 * hook, with it here). Extra presence phases keep distinct keys so a
 * nearest-neighbour decode still works.
 */
export const OSC12_CORE: Record<'idle' | 'thinking' | 'working' | 'done' | 'err', string> = {
  idle: '#5ce0c9',
  thinking: '#f7b81f',
  working: '#41419c',
  done: '#0a9900',
  err: '#e00000'
};

/** BEL-terminated OSC 12. Write this to a TTY to set cursor colour. */
export function encodeOsc12(hex: string): string {
  const h = hex.startsWith('#') ? hex : `#${hex}`;
  return `\x1b]12;${h}\x07`;
}

export function encodePhaseCursor(phase: PresencePhase): string {
  return encodeOsc12(TERMINAL_KEYS[phase]);
}

export function decodePhaseCursor(hex: string): PresencePhase {
  return nearestPhase(hex);
}

export interface ClaudeHookPayload {
  hook_event_name?: string;
  tool_name?: string;
  agent_id?: string;
}

const READ_TOOLS = new Set([
  'Read',
  'Grep',
  'Glob',
  'WebSearch',
  'WebFetch',
  'Task',
  'TodoWrite'
]);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'Bash', 'NotebookEdit', 'MultiEdit']);

/**
 * Map a Claude Code hook payload onto the bus, matching claude-face-hook.sh.
 * Subagent events (`agent_id`) are ignored → idle.
 */
export function claudeHookToConversation(payload: ClaudeHookPayload): ConversationEvent | null {
  if (payload.agent_id) return null;
  const event = payload.hook_event_name ?? '';
  const tool = payload.tool_name ?? '';
  if (event === 'SessionStart') return { kind: 'session.start' };
  if (event === 'UserPromptSubmit') return { kind: 'agent.think' };
  if (event === 'Stop') return { kind: 'turn.end' };
  if (event === 'PreToolUse') {
    if (WRITE_TOOLS.has(tool)) return { kind: 'tool.start', name: tool || 'tool' };
    return { kind: 'agent.think' };
  }
  if (event === 'PostToolUse') return { kind: 'tool.end', name: tool || undefined };
  return null;
}

export function phaseFromClaudeHook(payload: ClaudeHookPayload): PresencePhase {
  if (payload.agent_id) return 'idle';
  const event = payload.hook_event_name ?? '';
  const tool = payload.tool_name ?? '';
  if (event === 'SessionStart') return 'idle';
  if (event === 'UserPromptSubmit') return 'thinking';
  if (event === 'Stop') return 'done';
  if (event === 'PreToolUse') {
    if (WRITE_TOOLS.has(tool)) return 'working';
    if (READ_TOOLS.has(tool)) return 'thinking';
    return 'working';
  }
  if (event === 'PostToolUse' && tool === 'Bash') return 'working';
  return 'idle';
}
