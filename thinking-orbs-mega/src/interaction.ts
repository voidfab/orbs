// Temporary pointer/focus visual layer (transitions fork).
// Never changes state, never reseeds geometry — it scales and shifts the
// already-built frame, then eases back.

import type { DotBuffer } from './engine/buffer';

export interface HoverInteractionConfig {
  enabled?: boolean;
  scale?: number;
  intensity?: number;
  parallax?: number;
  transitionDuration?: number;
  /** Localized push+twist around the pointer (Schoolees spring). */
  spring?: boolean;
}

export interface FocusInteractionConfig {
  enabled?: boolean;
  useHoverStyle?: boolean;
}

export interface OrbInteractionConfig {
  hover?: HoverInteractionConfig;
  focus?: FocusInteractionConfig;
  /** Stops enabled interaction events at the canvas. @default true */
  stopPropagation?: boolean;
}

export interface InteractionState {
  amount: number;
  pointerX: number;
  pointerY: number;
}

export function applyInteraction(
  buf: DotBuffer,
  size: number,
  amount: number,
  scale: number,
  pointerX: number,
  pointerY: number,
  parallax: number
): void {
  if (amount <= 0.001) return;
  const c = size / 2;
  const s = 1 + (scale - 1) * amount;
  const ox = (pointerX - 0.5) * parallax * size * amount;
  const oy = (pointerY - 0.5) * parallax * size * amount;
  for (let i = 0; i < buf.n; i++) {
    const d = buf.dots[i];
    d.x = c + (d.x - c) * s + ox;
    d.y = c + (d.y - c) * s + oy;
  }
  for (let i = 0; i < buf.lineN; i++) {
    const l = buf.lines[i];
    l.x1 = c + (l.x1 - c) * s + ox;
    l.y1 = c + (l.y1 - c) * s + oy;
    l.x2 = c + (l.x2 - c) * s + ox;
    l.y2 = c + (l.y2 - c) * s + oy;
  }
}

/** Warp a point away from the pointer with a short twist. */
export function springPoint(
  x: number,
  y: number,
  pointerX: number,
  pointerY: number,
  size: number,
  strength: number
): [number, number, number] {
  if (strength <= 0.001) return [x, y, 0];
  const dx = x - pointerX;
  const dy = y - pointerY;
  const dist = Math.hypot(dx, dy);
  const radius = size * 0.55;
  if (dist >= radius || dist <= 0.0001) return [x, y, 0];
  const n = 1 - dist / radius;
  const influence = n * n * (3 - 2 * n) * strength;
  const ux = dx / dist;
  const uy = dy / dist;
  const push = size * 0.105 * influence;
  const twist = size * 0.018 * influence;
  return [x + ux * push - uy * twist, y + uy * push + ux * twist, influence];
}

export function applySpring(
  buf: DotBuffer,
  size: number,
  pointerX: number,
  pointerY: number,
  strength: number
): void {
  if (strength <= 0.001) return;
  const px = pointerX * size;
  const py = pointerY * size;
  for (let i = 0; i < buf.n; i++) {
    const d = buf.dots[i];
    const [nx, ny, inf] = springPoint(d.x, d.y, px, py, size, strength);
    d.x = nx;
    d.y = ny;
    d.r *= 1 + 0.16 * inf;
  }
  for (let i = 0; i < buf.lineN; i++) {
    const l = buf.lines[i];
    const [x1, y1] = springPoint(l.x1, l.y1, px, py, size, strength);
    const [x2, y2] = springPoint(l.x2, l.y2, px, py, size, strength);
    l.x1 = x1;
    l.y1 = y1;
    l.x2 = x2;
    l.y2 = y2;
  }
}

export function distortContext(
  context: CanvasRenderingContext2D,
  distort: (x: number, y: number) => [number, number, number]
): CanvasRenderingContext2D {
  type Pending = [number, number, number, number, number, boolean | undefined];
  let pending: Pending[] = [];
  const flush = (mode: 'draw' | 'clip') => {
    for (const [x, y, radius, a0, a1, ccw] of pending) {
      if (mode === 'clip') {
        context.arc(x, y, radius * 1.14, a0, a1, ccw ?? false);
        continue;
      }
      const [nx, ny, inf] = distort(x, y);
      context.arc(nx, ny, radius * (1 + 0.16 * inf), a0, a1, ccw ?? false);
    }
    pending = [];
  };
  return new Proxy(context, {
    get(target, property) {
      if (property === 'beginPath') {
        return () => {
          pending = [];
          target.beginPath();
        };
      }
      if (property === 'moveTo') {
        return (x: number, y: number) => {
          const [nx, ny] = distort(x, y);
          target.moveTo(nx, ny);
        };
      }
      if (property === 'lineTo') {
        return (x: number, y: number) => {
          const [nx, ny] = distort(x, y);
          target.lineTo(nx, ny);
        };
      }
      if (property === 'arc') {
        return (
          x: number,
          y: number,
          radius: number,
          startAngle: number,
          endAngle: number,
          counterclockwise?: boolean
        ) => {
          pending.push([x, y, radius, startAngle, endAngle, counterclockwise]);
        };
      }
      if (property === 'fill') {
        return () => {
          flush('draw');
          target.fill();
        };
      }
      if (property === 'stroke') {
        return () => {
          flush('draw');
          target.stroke();
        };
      }
      if (property === 'clip') {
        return () => {
          flush('clip');
          target.clip();
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? (value as Function).bind(target) : value;
    },
    set(target, property, value) {
      return Reflect.set(target, property, value);
    }
  }) as CanvasRenderingContext2D;
}

export function easeToward(current: number, target: number, dt: number, durationMs: number): number {
  const k = 1 - Math.exp((-dt * 1000) / Math.max(16, durationMs));
  return current + (target - current) * k;
}
