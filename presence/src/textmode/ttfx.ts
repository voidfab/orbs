import type { PresencePhase } from '../bus/types';
import type { PresenceSnapshot } from '../bus/types';
import { SILENT_DUPLEX } from '../bus/types';
import { TERMINAL_KEYS } from '../terminal/palette';
import { setCell, type CharacterGrid } from './grid';

/**
 * ttfx / TerminalTextEffects verb names. The Metal screensaver host was not
 * copied. These three run on the portable character grid.
 */
export const TTFX_EFFECTS = [
  'beams',
  'decrypt',
  'matrix',
  'rain',
  'rings',
  'swarm',
  'waves',
  'wipe'
] as const;
export type TtfxEffect = (typeof TTFX_EFFECTS)[number];

export const TTFX_ENGINES = ['matrix', 'decrypt', 'waves'] as const;
export type TtfxEngine = (typeof TTFX_ENGINES)[number];

const GLYPH = '01#@%*+=:;!~';

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function live(snapshot: PresenceSnapshot) {
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  return {
    fg: TERMINAL_KEYS[snapshot.phase],
    energy: clamp01(Math.max(duplex.input, duplex.output, 0.22))
  };
}

/** Digital rain — thinking skin. */
export function paintMatrix(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { fg, energy } = live(snapshot);
  const speed = 8 + energy * 18;
  for (let x = 0; x < grid.cols; x++) {
    const head = ((t * speed + x * 3.1) % (grid.rows + 6)) - 2;
    for (let y = 0; y < grid.rows; y++) {
      const trail = head - y;
      if (trail < 0 || trail > 7) {
        setCell(grid, x, y, { ch: ' ', fg });
        continue;
      }
      const k = 1 - trail / 8;
      const ch = GLYPH[Math.floor((x * 13 + y * 7 + Math.floor(t * 9)) % GLYPH.length)]!;
      setCell(grid, x, y, { ch, fg: k > 0.7 ? '#d7ffe2' : fg });
    }
  }
}

/** Scramble that settles — working skin. */
export function paintDecrypt(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { fg } = live(snapshot);
  const settle = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4));
  const target = snapshot.phase === 'err' ? 'ERR' : snapshot.phase.slice(0, 3).toUpperCase();
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const mid = y === Math.floor(grid.rows / 2);
      const slot = x - Math.floor((grid.cols - target.length) / 2);
      const hashed = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + Math.floor(t * 9)));
      const settled = mid && slot >= 0 && slot < target.length && hashed < settle;
      const ch = settled
        ? target[slot]!
        : GLYPH[Math.floor((Math.sin(t * 17 + x * 3.1 + y) * 0.5 + 0.5) * GLYPH.length)]!;
      setCell(grid, x, y, { ch, fg: settled ? '#fff4c2' : fg });
    }
  }
}

/** Traveling waves — speaking / listening skin. */
export function paintWaves(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { fg, energy } = live(snapshot);
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const left = clamp01(duplex.input);
  const right = clamp01(duplex.output);
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const u = grid.cols <= 1 ? 0.5 : x / (grid.cols - 1);
      const wave =
        Math.sin(x * 0.55 - t * (3 + energy * 4) + y * 0.35) * (0.35 + left * 0.4) +
        Math.sin(x * 0.28 + t * (2.2 + right * 3) + y * 0.2) * (0.25 + right * 0.45);
      const val = clamp01(0.42 + wave);
      const ch = val > 0.72 ? '#' : val > 0.55 ? '=' : val > 0.4 ? ':' : val > 0.28 ? '.' : ' ';
      setCell(grid, x, y, { ch, fg });
    }
  }
}

export function autoTtfxEngine(phase: PresencePhase): TtfxEngine | null {
  if (phase === 'thinking') return 'matrix';
  if (phase === 'working' || phase === 'err') return 'decrypt';
  if (phase === 'listening' || phase === 'speaking') return 'waves';
  return null;
}
