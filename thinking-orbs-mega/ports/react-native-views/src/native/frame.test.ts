import { describe, expect, it } from 'vitest';
import type { OrbState } from '../types';
import { createNativeOrbFrame } from './frame';

const STATES: OrbState[] = [
  'working',
  'searching',
  'solving',
  'listening',
  'composing',
  'shaping'
];

describe('createNativeOrbFrame', () => {
  it.each(STATES)('creates a deterministic %s frame', (state) => {
    const options = {
      state,
      size: 64,
      time: 1.25,
      dark: true
    };
    const first = createNativeOrbFrame(options);
    const second = createNativeOrbFrame(options);

    expect(first.length).toBeGreaterThan(5);
    expect(first).toEqual(second);
    expect(first.every((circle) => circle.radius > 0)).toBe(true);
  });

  it('scales to arbitrary native sizes', () => {
    const frame = createNativeOrbFrame({
      state: 'working',
      size: 148,
      time: 0.6,
      dark: true
    });

    expect(Math.max(...frame.map((circle) => circle.x))).toBeLessThan(148);
    expect(Math.max(...frame.map((circle) => circle.y))).toBeLessThan(148);
  });

  it('renders light and dark palettes differently', () => {
    const base = {
      state: 'searching' as const,
      size: 64,
      time: 0.6
    };

    expect(createNativeOrbFrame({ ...base, dark: true })[0].color).not.toBe(
      createNativeOrbFrame({ ...base, dark: false })[0].color
    );
  });
});
