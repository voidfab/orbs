import type { PresencePhase } from '../bus/types';

/**
 * Terminal sidechannel keys. claude-terminal-face uses OSC 12 (cursor colour)
 * as a 5-key palette. We extend it for waiting / speaking / listening / asleep
 * so a glyph-grid painter can nearest-neighbour the same way.
 */
export const TERMINAL_KEYS: Record<PresencePhase, string> = {
  idle: '#5ce0c9',
  listening: '#4ea3ff',
  thinking: '#f7b81f',
  working: '#41419c',
  waiting: '#ff9f1c',
  speaking: '#f4f4f5',
  done: '#0a9900',
  err: '#e00000',
  asleep: '#3a4a4a'
};

export const TERMINAL_GLYPH: Record<PresencePhase, [string, string, string]> = {
  idle: ['  · ·  ', '  ─  ', '       '],
  listening: ['  ◠ ◠  ', '  ▽  ', '       '],
  thinking: ['  · ·  ', '  ◠  ', '   ?   '],
  working: ['  › ‹  ', '  ─  ', '  ···  '],
  waiting: ['  o o  ', '  o  ', '   !   '],
  speaking: ['  ◠ ◠  ', '  ▽  ', '  ~~~  '],
  done: ['  ^ ^  ', '  ▽  ', '       '],
  err: ['  × ×  ', '  ─  ', '   !   '],
  asleep: ['  - -  ', '  ─  ', '  zzz  ']
};

export function nearestPhase(hex: string): PresencePhase {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  let best: PresencePhase = 'idle';
  let dist = Infinity;
  for (const [phase, key] of Object.entries(TERMINAL_KEYS) as Array<[PresencePhase, string]>) {
    const k = parseInt(key.slice(1), 16);
    const dr = r - ((k >> 16) & 255);
    const dg = g - ((k >> 8) & 255);
    const db = b - (k & 255);
    const d = dr * dr + dg * dg + db * db;
    if (d < dist) {
      dist = d;
      best = phase;
    }
  }
  return best;
}

export function paintTerminalFace(
  ctx: CanvasRenderingContext2D,
  phase: PresencePhase,
  size: number,
  dark: boolean,
  opts?: { clear?: boolean }
): void {
  if (opts?.clear !== false) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = dark ? '#0e1116' : '#eef1f4';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = TERMINAL_KEYS[phase];
  ctx.font = `${Math.round(size * 0.16)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rows = TERMINAL_GLYPH[phase];
  const mid = size / 2;
  ctx.fillText(rows[0], mid, mid - size * 0.18);
  ctx.fillText(rows[1], mid, mid);
  ctx.fillText(rows[2], mid, mid + size * 0.18);
}
