import { MODE_DRAWS } from '../engine/registry';
import { scaleCounts } from '../engine/profiles';
import { resolvePreset } from '../presets';
import type { OrbSize, OrbState } from '../types';
import {
  CircleRecordingContext,
  type NativeCircle
} from './drawingContext';

const NATIVE_DENSITY: Record<OrbState, number> = {
  working: 0.6,
  searching: 0.75,
  solving: 1,
  listening: 1,
  composing: 0.4,
  shaping: 1
};

export interface NativeFrameOptions {
  state: OrbState;
  size: number;
  time: number;
  dark: boolean;
  density?: number;
}

/**
 * Produce one deterministic native orb frame. This is useful for tests,
 * screenshots, custom renderers, and consumers that own their animation clock.
 */
export function createNativeOrbFrame({
  state,
  size,
  time,
  dark,
  density = 1
}: NativeFrameOptions): NativeCircle[] {
  const safeSize = Math.max(1, size);
  const safeDensity = Math.min(2, Math.max(0.1, density));
  const designSize: OrbSize = safeSize < 40 ? 20 : 64;
  const { mode, opts: presetOpts } = resolvePreset(state, designSize);
  const nativeScale =
    safeDensity * (designSize === 20 ? 1 : NATIVE_DENSITY[state]);
  const opts =
    nativeScale === 1
      ? presetOpts
      : scaleCounts(presetOpts, nativeScale);
  const context = new CircleRecordingContext();
  MODE_DRAWS[mode](context.asDrawingContext(), designSize, time, dark, opts);

  if (safeSize === designSize) return context.circles;
  const scale = safeSize / designSize;
  return context.circles.map((circle) => ({
    x: circle.x * scale,
    y: circle.y * scale,
    radius: circle.radius * scale,
    color: circle.color
  }));
}

export type { NativeCircle } from './drawingContext';
