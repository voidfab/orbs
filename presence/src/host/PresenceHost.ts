import {
  IDLE_FLAGS,
  applyEvent,
  snapshotFromFlags,
  type ConversationEvent,
  type ConversationFlags
} from '../bus/reduce.ts';
import {
  IDLE_SNAPSHOT,
  SILENT_DUPLEX,
  type DuplexChannels,
  type PresencePhase,
  type PresenceSnapshot
} from '../bus/types.ts';

export type AudioPolicy = 'off' | 'listen' | 'duplex';

export interface PresenceHostOptions {
  /**
   * How live RMS becomes conversation events.
   * - `off`: duplex only, no auto events
   * - `listen`: input VAD → human.start / human.end (STT front)
   * - `duplex`: also map output VAD → agent.speak / agent.speak.end (TTS tap)
   */
  audio?: AudioPolicy;
  vadStart?: number;
  vadStop?: number;
  hangoverMs?: number;
}

export type PresenceListener = (snapshot: PresenceSnapshot) => void;

const DEFAULTS = {
  audio: 'listen' as AudioPolicy,
  vadStart: 0.12,
  vadStop: 0.05,
  hangoverMs: 220
};

/**
 * Stateful bus a live host drives. Painters subscribe to `snapshot`.
 * STT / brain / tools / TTS stay in the host; this only reduces their events
 * plus optional VAD from a duplex analyser.
 */
export class PresenceHost {
  private flags: ConversationFlags = { ...IDLE_FLAGS };
  private duplex: DuplexChannels = { ...SILENT_DUPLEX };
  private listeners = new Set<PresenceListener>();
  private readonly audio: AudioPolicy;
  private readonly vadStart: number;
  private readonly vadStop: number;
  private readonly hangoverMs: number;
  private inputUntil = 0;
  private outputUntil = 0;

  constructor(opts: PresenceHostOptions = {}) {
    this.audio = opts.audio ?? DEFAULTS.audio;
    this.vadStart = opts.vadStart ?? DEFAULTS.vadStart;
    this.vadStop = opts.vadStop ?? DEFAULTS.vadStop;
    this.hangoverMs = opts.hangoverMs ?? DEFAULTS.hangoverMs;
  }

  get snapshot(): PresenceSnapshot {
    return snapshotFromFlags(this.flags, this.duplex);
  }

  get conversation(): ConversationFlags {
    return this.flags;
  }

  subscribe(fn: PresenceListener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => {
      this.listeners.delete(fn);
    };
  }

  push(event: ConversationEvent): PresenceSnapshot {
    this.flags = applyEvent(this.flags, event);
    return this.emit();
  }

  setDuplex(partial: Partial<DuplexChannels>): PresenceSnapshot {
    this.duplex = {
      input: clamp01(partial.input ?? this.duplex.input),
      output: clamp01(partial.output ?? this.duplex.output)
    };
    return this.emit();
  }

  /**
   * Feed analyser levels. Always updates the duplex buses. With an audio
   * policy, rising/falling VAD also becomes conversation events.
   */
  ingestAudio(
    levels: { input: number; output: number; vad?: number },
    now = nowMs()
  ): PresenceSnapshot {
    this.duplex = {
      input: clamp01(levels.input),
      output: clamp01(levels.output)
    };
    if (this.audio === 'off') return this.emit();

    const inLevel = levels.vad ?? levels.input;
    this.edge(
      inLevel,
      'inputUntil',
      this.flags.humanSpeaking,
      { kind: 'human.start' },
      { kind: 'human.end' },
      now
    );
    if (this.audio === 'duplex') {
      this.edge(
        levels.output,
        'outputUntil',
        this.flags.agentSpeaking,
        { kind: 'agent.speak' },
        { kind: 'agent.speak.end' },
        now
      );
    }
    return this.emit();
  }

  /**
   * Hosts that only know a named phase (voice bus, OSC 12) replace flags
   * to match it. Duplex energy is kept.
   */
  adoptPhase(
    phase: PresencePhase,
    extra?: { tool?: string; error?: string }
  ): PresenceSnapshot {
    const tool =
      extra?.tool && (phase === 'working' || phase === 'waiting')
        ? { name: extra.tool, status: phase === 'waiting' ? ('permission' as const) : ('running' as const) }
        : null;
    this.flags = {
      session: phase !== 'idle' && phase !== 'asleep',
      humanSpeaking: phase === 'listening',
      agentThinking: phase === 'thinking' || phase === 'working',
      agentSpeaking: phase === 'speaking',
      asleep: phase === 'asleep',
      error: extra?.error ?? (phase === 'err' ? 'error' : null),
      tool,
      turnJustEnded: phase === 'done'
    };
    return this.emit();
  }

  reset(): PresenceSnapshot {
    this.flags = { ...IDLE_FLAGS };
    this.duplex = { ...SILENT_DUPLEX };
    this.inputUntil = 0;
    this.outputUntil = 0;
    return this.emit();
  }

  private edge(
    level: number,
    untilKey: 'inputUntil' | 'outputUntil',
    active: boolean,
    start: ConversationEvent,
    stop: ConversationEvent,
    now: number
  ): void {
    if (level >= this.vadStart) {
      this[untilKey] = now + this.hangoverMs;
      if (!active) this.flags = applyEvent(this.flags, start);
      return;
    }
    if (level > this.vadStop) {
      this[untilKey] = now + this.hangoverMs;
      return;
    }
    if (active && now >= this[untilKey]) {
      this.flags = applyEvent(this.flags, stop);
    }
  }

  private emit(): PresenceSnapshot {
    const snap = this.snapshot;
    for (const fn of this.listeners) fn(snap);
    return snap;
  }
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export { IDLE_SNAPSHOT };
