export type SkinPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export const SKIN_PHASES: SkinPhase[] = ['idle', 'listening', 'thinking', 'speaking'];

export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function hexRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function syntheticLevel(phase: SkinPhase, t: number, slider: number): number {
  if (phase === 'listening') {
    return 0.35 + slider * 0.45 + 0.22 * Math.abs(Math.sin(t * 8.5));
  }
  if (phase === 'speaking') {
    return 0.4 + slider * 0.5 + 0.2 * Math.abs(Math.sin(t * 6.2));
  }
  if (phase === 'thinking') return 0.22 + 0.14 * Math.abs(Math.sin(t * 2.4));
  return 0.06 + 0.04 * Math.sin(t * 0.9);
}

export function createPhaseMix(initial: SkinPhase) {
  const w: Record<SkinPhase, number> = {
    idle: 0,
    listening: 0,
    thinking: 0,
    speaking: 0
  };
  w[initial] = 1;
  return {
    weights: w,
    update(phase: SkinPhase, dt: number) {
      let total = 0;
      for (const key of SKIN_PHASES) {
        const next = approach(w[key], key === phase ? 1 : 0, 5.5, dt);
        w[key] = key === phase || next > 0.002 ? next : 0;
        total += w[key];
      }
      if (total > 0) for (const key of SKIN_PHASES) w[key] /= total;
      return w;
    }
  };
}
