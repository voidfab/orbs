export interface NativeCircle {
  x: number;
  y: number;
  radius: number;
  color: string;
}

/**
 * The upstream painters use only five small pieces of the canvas API. This
 * adapter records those circle paints so React Native can render the exact
 * same frames without a canvas or another native dependency.
 */
export class CircleRecordingContext {
  circles: NativeCircle[] = [];
  fillStyle: string | object = '#000';
  private pending: Omit<NativeCircle, 'color'> | null = null;

  beginPath() {
    this.pending = null;
  }

  arc(x: number, y: number, radius: number) {
    this.pending = { x, y, radius };
  }

  fill() {
    if (!this.pending) return;
    this.circles.push({
      ...this.pending,
      color: String(this.fillStyle)
    });
  }

  asDrawingContext(): OrbDrawingContext {
    return this;
  }
}
import type { OrbDrawingContext } from '../engine/types';
