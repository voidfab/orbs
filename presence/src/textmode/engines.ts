import type { PresenceSnapshot } from '../bus/types';
import { SILENT_DUPLEX } from '../bus/types';
import { TERMINAL_GLYPH, TERMINAL_KEYS } from '../terminal/palette';
import {
  autoCastEngine,
  castMoodPalette,
  castPhaseDrive,
  mixRgb,
  rgbToHex,
  rune,
  toCastPhase,
  type CastEngine,
  type CastRgb
} from './cast';
import { TEXTMODE_RAMP, emptyGrid, setCell, type CharacterGrid } from './grid';
import { paintDecrypt, paintMatrix, paintWaves, type TtfxEngine } from './ttfx';

const WORLD = 28;
const DIRS: Array<readonly [number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1]
];

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function frac(n: number): number {
  return n - Math.floor(n);
}

function hash2(a: number, b: number): number {
  return frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);
}

function live(snapshot: PresenceSnapshot) {
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const mic = clamp01(Math.max(duplex.input, snapshot.phase === 'listening' ? 0.28 : 0));
  const voice = clamp01(Math.max(duplex.output, snapshot.phase === 'speaking' ? 0.32 : 0));
  const cast = toCastPhase(snapshot.phase);
  const drive = castPhaseDrive(cast);
  return {
    palette: castMoodPalette(snapshot.phase),
    drive,
    cast,
    mic,
    voice,
    energy: Math.min(1.35, drive.energy + mic * 0.22 + voice * 0.28),
    pulse: Math.min(1.2, drive.pulse + (cast === 'listening' ? mic * 0.5 : voice * 0.45))
  };
}

function fillField(grid: CharacterGrid, hex: string): void {
  grid.bg = hex;
  for (let i = 0; i < grid.cells.length; i++) grid.cells[i] = { ch: ' ', fg: hex };
}

export function paintSeal(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { palette, drive, cast, energy, pulse } = live(snapshot);
  fillField(grid, rgbToHex(palette.field));
  const cx = (grid.cols - 1) / 2;
  const cy = (grid.rows - 1) / 2;
  const maxR = Math.max(3, Math.min(cx, cy) - 0.5);
  const rings = Math.min(12, Math.max(4, Math.floor((maxR - 1) * (0.55 + drive.density * 0.7))));
  const now = t * 1000;
  const ink = mixRgb(palette.field, palette.ink, 0.55 + energy * 0.45);
  for (let ring = 2; ring < rings; ring++) {
    const radius = (ring / rings) * maxR * (0.82 + energy * 0.18);
    const count = Math.max(8, Math.floor(radius * (4.2 + drive.density * 2.2)));
    const spin = now * 0.00012 * drive.spin * (ring % 2 === 0 ? 1 : -1) * (0.4 + ring * 0.12);
    const breathe =
      cast === 'listening' || cast === 'armed'
        ? Math.sin(now * 0.003 + ring) * pulse * 0.7
        : cast === 'thinking'
          ? Math.sin(now * 0.007 + ring * 0.4) * 0.35
          : 0;
    const shock =
      cast === 'speaking'
        ? Math.exp(-(((ring / rings) - (0.32 + 0.5 * Math.sin(now * 0.004))) ** 2) * 18) * pulse
        : cast === 'armed'
          ? 0.12
          : 0;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + spin;
      const x = Math.round(cx + Math.cos(angle) * (radius + breathe));
      const y = Math.round(cy + Math.sin(angle) * (radius + breathe) * 0.92);
      const hot = shock > 0.15;
      const k = 0.42 + (ring / rings) * 0.7 + shock * 0.7;
      const color: [number, number, number] = [
        Math.min(255, Math.floor(ink[0] * k)),
        Math.min(255, Math.floor(ink[1] * k * (hot ? 1.25 : 1))),
        Math.min(255, Math.floor(ink[2] * k))
      ];
      setCell(grid, x, y, {
        ch: rune(i * 7 + ring * 13 + (hot || cast === 'thinking' ? Math.floor(now / (cast === 'thinking' ? 40 : 80)) : 0)),
        fg: rgbToHex(color)
      });
    }
  }
  setCell(grid, Math.round(cx), Math.round(cy), {
    ch: cast === 'idle' ? '.' : cast === 'thinking' ? '#' : '@',
    fg: rgbToHex(palette.ink)
  });
}

export function paintHyphae(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { palette, drive, cast, energy } = live(snapshot);
  fillField(grid, rgbToHex(palette.field));
  const mid = (WORLD / 2) | 0;
  const grow = Math.floor(6 + drive.density * 14);
  const wander = cast === 'thinking' ? 0.32 : 0.16;
  const speed = cast === 'thinking' ? 24 : 12;
  const steps = 48 + Math.floor(Math.max(0, t) * speed);
  const occupancy = new Map<string, { glyph: string; color: [number, number, number] }>();
  const scale = Math.min((grid.cols - 4) / (WORLD * 1.6), (grid.rows - 4) / (WORLD * 1.6));

  for (let i = 0; i < grow; i++) {
    const tint = mixRgb(palette.ink, [80, 255, 180], (i % 4) / 5);
    const glyph = '#%*+=:@'[i % 7]!;
    const life = 28 + (i * 11) % 40;
    let x = mid;
    let y = mid;
    let z = mid;
    let dir = i % 6;
    const trail: Array<[number, number, number]> = [];
    const limit = cast === 'idle' ? 4 : steps;
    for (let s = 0; s < limit; s++) {
      if (hash2(i + 0.17, s) < wander) dir = Math.floor(hash2(i + 0.91, s) * 6) % 6;
      const d = DIRS[dir]!;
      x = Math.max(1, Math.min(WORLD - 2, x + d[0]));
      y = Math.max(1, Math.min(WORLD - 2, y + d[1]));
      z = Math.max(1, Math.min(WORLD - 2, z + d[2]));
      trail.push([x, y, z]);
      if (trail.length > life) trail.shift();
    }
    for (const p of trail) {
      occupancy.set(`${p[0]},${p[1]},${p[2]}`, { glyph, color: [tint[0], tint[1], tint[2]] });
    }
  }

  const fruit = snapshot.phase === 'speaking';
  const voxels = [...occupancy.entries()].map(([key, walker]) => {
    const [x, y, z] = key.split(',').map(Number) as [number, number, number];
    return { x, y, z, walker };
  });
  voxels.sort((a, b) => a.x + a.z - (b.x + b.z) || a.y - b.y);
  const ox = grid.cols / 2;
  const oy = grid.rows / 2;
  for (const voxel of voxels) {
    const px = Math.round(ox + (voxel.x - voxel.z) * scale);
    const py = Math.round(oy + ((voxel.x + voxel.z) * 0.5 - voxel.y) * scale * 0.85);
    const color = mixRgb(voxel.walker.color, palette.ink, 0.35 + energy * 0.25);
    setCell(grid, px, py, {
      ch: fruit ? '@' : voxel.walker.glyph,
      fg: rgbToHex([color[0], color[1], fruit ? Math.min(255, color[2] + 70) : color[2]])
    });
  }
}

export function paintBeat(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const { palette, drive, energy, pulse, mic, voice, cast } = live(snapshot);
  fillField(grid, rgbToHex(palette.field));
  const cx = (grid.cols - 1) / 2;
  const cy = (grid.rows - 1) / 2;
  const you = cast === 'listening' || cast === 'speaking' || cast === 'armed' ? 0.35 + pulse * 0.5 + mic * 0.4 : 0.18;
  const them =
    cast === 'thinking' || cast === 'speaking'
      ? 0.4 + energy * 0.5 + voice * 0.35
      : cast === 'armed'
        ? 0.55
        : 0.2;
  const spin = t * (0.8 + drive.spin);
  const ring = (
    rx: number,
    ry: number,
    count: number,
    ch: string,
    color: CastRgb,
    phase: number
  ) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + phase;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      setCell(grid, x, y, { ch, fg: rgbToHex(color) });
    }
  };
  const maxR = Math.max(3, Math.min(cx, cy) - 1);
  ring(maxR * (0.55 + you * 0.25), maxR * (0.38 + you * 0.18), Math.floor(18 + you * 16), '#', palette.ember, spin);
  ring(maxR * (0.55 + them * 0.25), maxR * (0.38 + them * 0.18), Math.floor(18 + them * 16), '@', palette.ink, -spin * 0.85);
}

function rampChar(val: number): string {
  const u = clamp01(val);
  const i = Math.min(TEXTMODE_RAMP.length - 1, Math.floor(u * TEXTMODE_RAMP.length));
  return TEXTMODE_RAMP[i]!;
}

export function paintField(grid: CharacterGrid, snapshot: PresenceSnapshot, t: number): void {
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const input = clamp01(Math.max(duplex.input, snapshot.phase === 'listening' ? 0.28 : 0));
  const output = clamp01(Math.max(duplex.output, snapshot.phase === 'speaking' ? 0.32 : 0));
  const mute = snapshot.phase === 'asleep' ? '#3a4a4a' : '#4a5560';
  const { cols, rows } = grid;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = cols <= 1 ? 0.5 : x / (cols - 1);
      const v = rows <= 1 ? 0.5 : y / (rows - 1);
      const cx = u - 0.5;
      const cy = v - 0.5;
      const dist = Math.hypot(cx * 1.4, cy);
      const ring = 0.5 + 0.5 * Math.sin(dist * 8 - t * 2.2);
      const left = input * (0.55 + 0.45 * Math.sin(t * 7.4 + y * 0.7)) * (1 - u);
      const right = output * (0.55 + 0.45 * Math.sin(t * 6.1 + y * 0.55)) * u;
      const think = snapshot.phase === 'thinking' || snapshot.phase === 'working' ? 0.22 + 0.18 * Math.abs(Math.sin(t * 2.4 + dist * 6)) : 0;
      const wait = snapshot.phase === 'waiting' ? 0.18 + 0.18 * (Math.floor(t * 2) % 2) : 0;
      const sleep = snapshot.phase === 'asleep' ? 0.08 : 0;
      const val = clamp01(ring * 0.18 + left + right + think + wait + sleep);
      setCell(grid, x, y, { ch: rampChar(val), fg: val > 0.45 ? TERMINAL_KEYS[snapshot.phase] : mute });
    }
  }
  const face = TERMINAL_GLYPH[snapshot.phase];
  const width = Math.max(...face.map((r) => r.length));
  const gx = Math.max(0, Math.floor((cols - width) / 2));
  const gy = Math.max(0, Math.floor((rows - face.length) / 2));
  const fg = TERMINAL_KEYS[snapshot.phase];
  for (let i = 0; i < face.length; i++) {
    const line = face[i]!;
    const pad = Math.floor((width - line.length) / 2);
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      if (ch === ' ') continue;
      setCell(grid, gx + pad + j, gy + i, { ch, fg });
    }
  }
}

export type TextmodeEngine = CastEngine | TtfxEngine | 'auto';

export function resolveEngine(engine: TextmodeEngine, phase: PresenceSnapshot['phase']): CastEngine | TtfxEngine {
  return engine === 'auto' ? autoCastEngine(phase) : engine;
}

export function paintEngine(
  grid: CharacterGrid,
  snapshot: PresenceSnapshot,
  t: number,
  engine: CastEngine | TtfxEngine
): void {
  if (engine === 'seal') paintSeal(grid, snapshot, t);
  else if (engine === 'hyphae') paintHyphae(grid, snapshot, t);
  else if (engine === 'beat') paintBeat(grid, snapshot, t);
  else if (engine === 'matrix') paintMatrix(grid, snapshot, t);
  else if (engine === 'decrypt') paintDecrypt(grid, snapshot, t);
  else if (engine === 'waves') paintWaves(grid, snapshot, t);
  else paintField(grid, snapshot, t);
}

export function textmodeGrid(
  snapshot: PresenceSnapshot,
  t: number,
  cols?: number,
  rows?: number,
  engine: TextmodeEngine = 'auto'
): CharacterGrid {
  const resolved = resolveEngine(engine, snapshot.phase);
  const w = cols ?? (resolved === 'field' ? 12 : 20);
  const h = rows ?? (resolved === 'field' ? 8 : 16);
  const grid = emptyGrid(w, h, { ch: ' ', fg: '#3a3a40' });
  paintEngine(grid, snapshot, t, resolved);
  return grid;
}
