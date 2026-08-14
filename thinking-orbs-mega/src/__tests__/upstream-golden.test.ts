import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cubeBuilderFor } from '../cube-presets';
import { asFrame } from '../engine/adapt';
import { MODE_FRAMES } from '../engine/registry';
import { CONTOUR_DRAWS } from '../engine/contour';
import { ORIGINAL_STATES, resolvePreset } from '../presets';

const golden = JSON.parse(readFileSync(resolve(__dirname, '../../spec/orbs-golden.json'), 'utf8')) as {
  tolerance: number;
  cases: Array<{
    key: string;
    state: string;
    size: number;
    t: number;
    dots: number[];
    lines: number[];
  }>;
};

describe('upstream 0.3.1 golden vectors', () => {
  it('still covers the original nine states', () => {
    expect(ORIGINAL_STATES).toEqual([
      'working',
      'searching',
      'solving',
      'listening',
      'connecting',
      'weaving',
      'composing',
      'breathing',
      'shaping'
    ]);
  });

  it('matches official geometry at 20 and 64', () => {
    const eps = golden.tolerance;
    const original = new Set(ORIGINAL_STATES);
    const cases = golden.cases.filter((c) => original.has(c.state as (typeof ORIGINAL_STATES)[number]));
    expect(cases.length).toBeGreaterThan(70);
    for (const c of cases) {
      const { mode, opts } = resolvePreset(c.state as (typeof ORIGINAL_STATES)[number], c.size);
      const frame = MODE_FRAMES[mode](c.size, c.t, opts);
      const got = frame.dots.flatMap((d) => [d.x, d.y, d.z, d.r, d.white, d.a ?? 1]);
      expect(got.length, c.key).toBe(c.dots.length);
      for (let i = 0; i < got.length; i++) {
        expect(Math.abs(got[i] - c.dots[i]), `${c.key} dot[${i}]`).toBeLessThanOrEqual(eps);
      }
      const lines = frame.lines.flatMap((l) => [l.x1, l.y1, l.x2, l.y2, l.white, l.a ?? 1, l.w]);
      expect(lines.length, c.key).toBe(c.lines.length);
      for (let i = 0; i < lines.length; i++) {
        expect(Math.abs(lines[i] - c.lines[i]), `${c.key} line[${i}]`).toBeLessThanOrEqual(eps);
      }
    }
  });
});

describe('extra fork states', () => {
  it('cube remesh of the original nine emits frames', () => {
    for (const state of ORIGINAL_STATES) {
      const build = cubeBuilderFor(state);
      expect(build, state).not.toBeNull();
      const frame = asFrame(build!)(64, 0.6, resolvePreset(state, 64).opts);
      expect(frame.dots.length, state).toBeGreaterThan(6);
    }
  });

  it('has contour painters for the official nine plus responding', () => {
    for (const mode of ['orbits', 'globe', 'rubik', 'wave', 'web', 'ribbon', 'ring', 'morph', 'responding'] as const) {
      expect(CONTOUR_DRAWS[mode], mode).toEqual(expect.any(Function));
    }
  });

  it('uses Danko 128px tunings as a third official-mode anchor', () => {
    expect(resolvePreset('working', 128).speed).toBeCloseTo(1.65, 5);
    expect(resolvePreset('searching', 128).speed).toBeCloseTo(1.85, 5);
    expect(resolvePreset('solving', 128).speed).toBeCloseTo(1.65, 5);
    expect(resolvePreset('listening', 128).speed).toBeCloseTo(4.0, 5);
    expect(resolvePreset('connecting', 128).speed).toBeCloseTo(3.0, 5);
    expect(resolvePreset('weaving', 128).speed).toBeCloseTo(1.5, 5);
    expect(resolvePreset('composing', 128).speed).toBeCloseTo(2.15, 5);
    expect(resolvePreset('breathing', 128).speed).toBeCloseTo(3.0, 5);
    expect(resolvePreset('shaping', 128).speed).toBeCloseTo(2.2, 5);
    const lo = resolvePreset('working', 64).speed;
    const hi = resolvePreset('working', 128).speed;
    const mid = resolvePreset('working', 96).speed;
    expect(mid).toBeGreaterThan(Math.min(lo, hi));
    expect(mid).toBeLessThan(Math.max(lo, hi));
    expect(resolvePreset('working', 20).speed).toBe(3.9);
    expect(resolvePreset('working', 64).speed).toBe(1.885);
  });

  it('emit finite frames at both anchors', () => {
    for (const state of [
      'idle',
      'tracing',
      'focusing',
      'cubing',
      'error',
      'hypercube',
      'conjuring',
      'assembling',
      'responding',
      'presence',
      'cognition',
      'speaking'
    ] as const) {
      for (const size of [20, 64]) {
        const p = resolvePreset(state, size);
        const frame = MODE_FRAMES[p.mode](size, 0.6, p.opts);
        expect(frame.dots.length, `${state}@${size}`).toBeGreaterThan(6);
        for (const d of frame.dots) {
          expect(Number.isFinite(d.x)).toBe(true);
          expect(Number.isFinite(d.y)).toBe(true);
        }
      }
    }
  });
});
