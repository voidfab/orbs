import { describe, expect, it } from 'vitest';
import {
  CONTOUR_DRAWS,
  ConversationSeam,
  MODE_FRAMES,
  ORIGINAL_STATES,
  ORB_STATES,
  PRESETS_128,
  SeamAudio,
  SeamField,
  ThinkingOrb,
  resolvePreset,
  seamPhaseFromFox9,
  torusKnotFitted,
  v2Topology
} from '../index';

describe('public API smoke', () => {
  it('exports the official engine plus megafork extras', () => {
    expect(ORIGINAL_STATES).toHaveLength(9);
    expect(ORB_STATES.length).toBeGreaterThan(9);
    expect(typeof ThinkingOrb).toBe('function');
    expect(typeof ConversationSeam).toBe('function');
    expect(typeof SeamAudio).toBe('function');
    expect(typeof seamPhaseFromFox9).toBe('function');
    expect(PRESETS_128.orbits).toBeTruthy();
    expect(MODE_FRAMES.orbits).toBeTypeOf('function');
    expect(MODE_FRAMES.synapse).toBeTypeOf('function');
    expect(CONTOUR_DRAWS.orbits).toBeTypeOf('function');
  });

  it('builds the synapse / relaying extract', () => {
    const { mode, opts } = resolvePreset('relaying', 64);
    expect(mode).toBe('synapse');
    const frame = MODE_FRAMES[mode](64, 0.8, opts);
    expect(frame.dots.length).toBeGreaterThan(8);
    expect(frame.lines.length).toBeGreaterThan(8);
    expect(frame.dots.every((d) => Number.isFinite(d.x) && Number.isFinite(d.y))).toBe(true);
  });

  it('resolves official 20/64 presets without throwing', () => {
    for (const state of ORIGINAL_STATES) {
      for (const size of [20, 64] as const) {
        const { mode, opts } = resolvePreset(state, size);
        const frame = MODE_FRAMES[mode](size, 0.3, opts);
        expect(frame.dots.length).toBeGreaterThan(0);
        expect(frame.dots.every((d) => Number.isFinite(d.x) && Number.isFinite(d.y))).toBe(true);
      }
    }
  });

  it('constructs a v2 field and evaluates a fitted knot', () => {
    const field = new SeamField();
    field.step(0.016, 'listening', 0.4, 0, 2);
    const [x, y, z] = torusKnotFitted(0.4, 2, 3);
    expect([x, y, z].every(Number.isFinite)).toBe(true);
    const topo = v2Topology({ idle: 0, listening: 1, thinking: 0, speaking: 0 });
    expect(topo.p).toBe(2);
    expect(topo.q).toBeGreaterThan(2.9);
  });
});
