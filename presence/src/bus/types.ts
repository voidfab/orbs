/**
 * Shared agentic-state bus.
 *
 * One phase names the turn for simple painters. Duplex energy (human in /
 * agent out) is a separate pair of 0–1 buses, matching Conversation Seam:
 * acoustic energy does not cross, and both can be live at once.
 *
 * Tool use is first-class. `waiting` is a permission / user-input gate, not a
 * spinner.
 */

export const PRESENCE_PHASES = [
  'idle',
  'listening',
  'thinking',
  'working',
  'waiting',
  'speaking',
  'done',
  'err',
  'asleep'
] as const;

export type PresencePhase = (typeof PRESENCE_PHASES)[number];

export interface DuplexChannels {
  /** Human / mic / STT RMS, 0–1. */
  input: number;
  /** Agent / speaker / TTS RMS, 0–1. */
  output: number;
}

export type ToolStatus = 'running' | 'permission';

export interface ToolActivity {
  name: string;
  status: ToolStatus;
}

export interface PresenceSnapshot {
  phase: PresencePhase;
  duplex: DuplexChannels;
  tool: ToolActivity | null;
  error: string | null;
  session: boolean;
}

export const SILENT_DUPLEX: DuplexChannels = { input: 0, output: 0 };

export const IDLE_SNAPSHOT: PresenceSnapshot = {
  phase: 'idle',
  duplex: SILENT_DUPLEX,
  tool: null,
  error: null,
  session: false
};

export const PHASE_LABELS: Record<PresencePhase, string> = {
  idle: 'Idle',
  listening: 'Listening…',
  thinking: 'Thinking…',
  working: 'Working…',
  waiting: 'Waiting…',
  speaking: 'Speaking…',
  done: 'Done',
  err: 'Something went wrong',
  asleep: 'Asleep'
};
