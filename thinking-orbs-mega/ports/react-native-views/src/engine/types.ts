// Engine-level contracts shared by every mode implementation.

import type { ModeOpts } from './profiles';

export type { Dot } from './core';

/**
 * The tiny drawing surface used by every orb painter. A browser canvas
 * satisfies this interface, and the native renderer records the same calls.
 */
export interface OrbDrawingContext {
  fillStyle: string | object;
  beginPath(): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): void;
  fill(): void;
}

/** One frame painter: draws a mode into a 2D context at CSS-px `size`. */
export type ModeDraw = (
  ctx: OrbDrawingContext,
  size: number,
  t: number,
  dark: boolean,
  opts: ModeOpts
) => void;
