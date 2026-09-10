import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { DEMO_TURN, DEMO_TURN_DURATION, snapshotAt } from '../conversation/script';
import { meterFrame } from '../meter/frame';
import { TERMINAL_KEYS, nearestPhase } from '../terminal/palette';

describe('demo duplex turn', () => {
  it('hits listening, thinking, working, waiting, speaking, and done in order', () => {
    const seen: string[] = [];
    for (let t = 0; t <= DEMO_TURN_DURATION; t += 0.2) {
      const phase = snapshotAt(DEMO_TURN, t).phase;
      if (seen[seen.length - 1] !== phase) seen.push(phase);
    }
    expect(seen).toEqual(['idle', 'listening', 'thinking', 'working', 'waiting', 'thinking', 'speaking', 'thinking', 'done']);
  });

  it('names the Bash permission gate', () => {
    const waiting = snapshotAt(DEMO_TURN, 6);
    expect(waiting.phase).toBe('waiting');
    expect(waiting.tool).toEqual({ name: 'Bash', status: 'permission' });
  });
});

describe('meter + terminal surfaces', () => {
  it('builds finite meter frames for every phase', () => {
    for (const phase of PRESENCE_PHASES) {
      const frame = meterFrame({ input: 0.4, output: 0.5 }, phase, 1.2);
      expect(frame.bands).toHaveLength(8);
      expect(frame.spectrum).toHaveLength(16);
      expect(frame.waveform.input).toHaveLength(96);
      expect(frame.waveform.output.every((n) => n >= -1 && n <= 1)).toBe(true);
      expect(frame.bands.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)).toBe(true);
    }
  });

  it('round-trips terminal palette keys', () => {
    for (const phase of PRESENCE_PHASES) {
      expect(nearestPhase(TERMINAL_KEYS[phase])).toBe(phase);
    }
  });
});
