// The shipped tunings: nine states × two sizes, baked from the inkform
// mini-page tuning session. `count`/`size` are multipliers over the base
// fine profiles; `speed` multiplies the shared clock. Resolved once per
// (state, size) pair and cached — the render loop sees plain numbers.

import { faultCycle } from './engine/fault';
import type { ModeOpts } from './engine/profiles';
import { BASE_PROFILES, scaleCounts, scaleRadii } from './engine/profiles';
import type { OrbState } from './types';

export type ModeKey =
  | 'orbits'
  | 'globe'
  | 'rubik'
  | 'wave'
  | 'web'
  | 'braid'
  | 'ribbon'
  | 'ring'
  | 'morph'
  | 'rest'
  | 'focus'
  | 'gyro'
  | 'echo'
  | 'cube'
  | 'route'
  | 'sonar'
  | 'graph'
  | 'funnel'
  | 'raster'
  | 'vortex'
  | 'helix'
  | 'cluster'
  | 'cascade'
  | 'shatter'
  | 'fault'
  | 'seal'
  | 'flightpath'
  | 'detour'
  | 'vigil'
  | 'attest'
  | 'ignite'
  | 'pins'
  | 'building'
  | 'tesseract'
  | 'merkaba'
  | 'assembling'
  | 'responding'
  | 'field'
  | 'cognition'
  | 'ripple';

export const ORIGINAL_STATES = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'shaping'
] as const;

export const STATE_TO_MODE: Record<OrbState, ModeKey> = {
  working: 'orbits',
  searching: 'globe',
  solving: 'rubik',
  listening: 'wave',
  connecting: 'web',
  weaving: 'braid',
  composing: 'ribbon',
  breathing: 'ring',
  shaping: 'morph',
  idle: 'rest',
  thinking: 'ring',
  analyzing: 'globe',
  booking: 'rubik',
  streaming: 'ribbon',
  success: 'rubik',
  tracing: 'route',
  waiting: 'sonar',
  reasoning: 'graph',
  queuing: 'funnel',
  reading: 'raster',
  gathering: 'vortex',
  syncing: 'helix',
  comparing: 'cluster',
  drafting: 'cascade',
  retrying: 'shatter',
  error: 'fault',
  committing: 'seal',
  progressing: 'flightpath',
  monitoring: 'vigil',
  diverting: 'detour',
  verifying: 'attest',
  activating: 'ignite',
  plotting: 'pins',
  focusing: 'focus',
  pondering: 'gyro',
  recalling: 'echo',
  cubing: 'cube',
  building: 'building',
  hypercube: 'tesseract',
  conjuring: 'merkaba',
  conjuring_static: 'merkaba',
  assembling: 'assembling',
  evolving: 'ribbon',
  spinning: 'ribbon',
  responding: 'responding',
  presence: 'field',
  cognition: 'cognition',
  speaking: 'ripple'
};

export const PROGRESS_MODES: ReadonlySet<ModeKey> = new Set([
  'funnel',
  'raster',
  'vortex',
  'cascade',
  'flightpath',
  'attest',
  'ignite'
]);

export const ORB_STATES = Object.keys(STATE_TO_MODE) as OrbState[];
export const MIN_SIZE = 12;
export const MAX_SIZE = 256;

export interface Preset {
  speed: number;
  count: number;
  size: number;
  /** Extra mode opts merged verbatim after scaling. */
  extra?: ModeOpts;
}

/** Exported so `scripts/extract-spec.ts` can emit them for the native ports. */
export type OfficialMode =
  | 'orbits'
  | 'globe'
  | 'rubik'
  | 'wave'
  | 'web'
  | 'braid'
  | 'ribbon'
  | 'ring'
  | 'morph';

export const PRESETS: Record<OfficialMode, Record<20 | 64, Preset>> = {
  orbits: {
    64: { speed: 1.885, count: 1, size: 1 },
    20: { speed: 3.9, count: 0.238, size: 2.4 }
  },
  globe: {
    64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } },
    20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } }
  },
  rubik: {
    64: { speed: 1.82, count: 0.35, size: 1.05 },
    20: { speed: 1.95, count: 0.088, size: 1.9 }
  },
  wave: {
    64: { speed: 4.388, count: 0.341, size: 1 },
    20: { speed: 3.998, count: 0.105, size: 1.6 }
  },
  web: {
    64: { speed: 3.315, count: 1.35, size: 0.95 },
    20: { speed: 6.63, count: 0.25, size: 1.52 }
  },
  braid: {
    64: { speed: 1.625, count: 0.5, size: 1 },
    20: { speed: 2.75, count: 0.1125, size: 1.36 }
  },
  ribbon: {
    64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } }
  },
  ring: {
    64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  morph: {
    64: { speed: 2.405, count: 0.702, size: 0.395, extra: { spread: 1.45 } },
    20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } }
  }
};

/**
 * Danko ThinkingOrbsKit `.large` (128px) tunings.
 * Official 0.3.1 only ships 20 and 64; above 64 the web library used to
 * keep log-lerping the 20↔64 pair. These are a third hand-tuned anchor.
 */
export const PRESETS_128: Record<OfficialMode, Preset> = {
  orbits: { speed: 1.65, count: 1.35, size: 0.78 },
  globe: { speed: 1.85, count: 0.68, size: 0.8, extra: { scanMul: 4.08, dimBase: 0.45 } },
  rubik: { speed: 1.65, count: 0.55, size: 0.78 },
  wave: { speed: 4.0, count: 0.55, size: 0.78 },
  web: { speed: 3.0, count: 1.7, size: 0.75 },
  braid: { speed: 1.5, count: 0.75, size: 0.78 },
  ribbon: { speed: 2.15, count: 0.4, size: 0.7, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
  ring: { speed: 3.0, count: 0.4, size: 0.75, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
  morph: { speed: 2.2, count: 1.05, size: 0.28, extra: { spread: 1.45 } }
};

export interface Resolved {
  mode: ModeKey;
  speed: number;
  opts: ModeOpts;
  cycle?: number;
}

const cache = new Map<string, Resolved>();

const logLerp = (a: number, b: number, t: number) =>
  Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

function lerpExtra(a: ModeOpts | undefined, b: ModeOpts | undefined, t: number): ModeOpts | undefined {
  if (!a && !b) return undefined;
  const out: ModeOpts = {};
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const va = a?.[k];
    const vb = b?.[k];
    if (va == null) out[k] = vb;
    else if (vb == null) out[k] = va;
    else out[k] = va + (vb - va) * t;
  }
  return out;
}

function applyPreset(mode: ModeKey, preset: Preset, cycle?: number): Resolved {
  let opts: ModeOpts = { ...BASE_PROFILES[mode] };
  if (preset.count !== 1) opts = scaleCounts(opts, preset.count);
  if (preset.size !== 1) opts = scaleRadii(opts, preset.size);
  if (preset.extra) opts = { ...opts, ...preset.extra };
  return { mode, speed: preset.speed, opts, cycle };
}

function fromAnchors(
  mode: ModeKey,
  aLo: Preset,
  aHi: Preset,
  size: number,
  cycle?: number,
  lo = 20,
  hi = 64
): Resolved {
  const t = (Math.log(size) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  const speed = logLerp(aLo.speed, aHi.speed, t);
  const count = logLerp(aLo.count, aHi.count, Math.min(t, 1.6));
  const rsize = logLerp(aLo.size, aHi.size, t);
  const extra = lerpExtra(aLo.extra, aHi.extra, t);
  let opts: ModeOpts = { ...BASE_PROFILES[mode] };
  if (count !== 1) opts = scaleCounts(opts, count);
  if (rsize !== 1) opts = scaleRadii(opts, rsize);
  if (extra) opts = { ...opts, ...extra };
  return { mode, speed, opts, cycle };
}

const rubikCycle = (moveCount: number) => 2 * moveCount * 0.42 + 1.2;

/** Extra-fork states: 20/64 anchors, interpolated like the originals. */
const EXTRA: Partial<Record<OrbState, { a20: Preset; a64: Preset; cycle?: number }>> = {
  idle: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.15, count: 0.28, size: 1.7 } },
  thinking: {
    a64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    a20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  analyzing: {
    a64: { speed: 2.85, count: 0.55, size: 1.1, extra: { scanMul: 6.1, dimBase: 0.32 } },
    a20: { speed: 3.1, count: 0.13, size: 1.7, extra: { scanMul: 6.4, dimBase: 0.32 } }
  },
  booking: {
    a64: { speed: 1.05, count: 0.35, size: 1.05, extra: { moveCount: 6 } },
    a20: { speed: 1.18, count: 0.088, size: 1.9, extra: { moveCount: 6 } }
  },
  streaming: {
    a64: { speed: 2.6, count: 0.25, size: 0.85, extra: { spin: 1, bandMul: 3.2, wobMul: 1.35 } },
    a20: { speed: 3.35, count: 0.075, size: 1.073, extra: { spin: 0.4, bandMul: 5.2, wobMul: 1.1 } }
  },
  success: {
    cycle: rubikCycle(5),
    a64: { speed: 1.6, count: 0.35, size: 1.05, extra: { moveCount: 5 } },
    a20: { speed: 1.7, count: 0.088, size: 1.9, extra: { moveCount: 5 } }
  },
  tracing: {
    a64: { speed: 0.62, count: 0.42, size: 1.15, extra: { dimBase: 0.52, lift: 0.09 } },
    a20: { speed: 0.72, count: 0.115, size: 1.7, extra: { dimBase: 0.44, lift: 0.13 } }
  },
  waiting: {
    a64: { speed: 1.0, count: 1.55, size: 1, extra: { ringN: 4, rTaper: 1.0 } },
    a20: { speed: 1.05, count: 0.5, size: 1.7, extra: { ringN: 3, rTaper: 0.8 } }
  },
  reasoning: {
    a64: { speed: 1.55, count: 1.25, size: 1, extra: { trail: 4, edgeN: 5, edgeSeg: 7 } },
    a20: { speed: 1.5, count: 0.6, size: 1.9, extra: { trail: 3, edgeN: 4, edgeSeg: 3 } }
  },
  queuing: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { waist: 0.16, shellRings: 7, shellN: 22 } },
    a20: { speed: 1.1, count: 0.26, size: 1.65, extra: { waist: 0.22, shellRings: 5, shellN: 7 } }
  },
  reading: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { band: 1.4, inset: 0.13 } },
    a20: { speed: 1.05, count: 0.25, size: 1.7, extra: { band: 1.1, inset: 0.1 } }
  },
  gathering: {
    a64: { speed: 1.15, count: 1, size: 1, extra: { turns: 2.2, disk: 0.18, arms: 3, tilt: 1.15 } },
    a20: { speed: 1.3, count: 0.3, size: 1.9, extra: { turns: 1.6, disk: 0.22, arms: 2, tilt: 1.05 } }
  },
  syncing: {
    a64: { speed: 1.0, count: 1.15, size: 1, extra: { pitch: 2.6, rungEvery: 5, taper: 0.45 } },
    a20: { speed: 1.1, count: 0.3, size: 1.85, extra: { pitch: 1.7, rungEvery: 4, taper: 0.3 } }
  },
  comparing: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { groups: 3, spread: 0.62 } },
    a20: { speed: 1.05, count: 0.24, size: 1.85, extra: { groups: 3, spread: 0.55 } }
  },
  drafting: {
    a64: { speed: 1.0, count: 1.35, size: 1, extra: { ragged: 0.42, inset: 0.12 } },
    a20: { speed: 1.05, count: 0.38, size: 1.8, extra: { ragged: 0.34, inset: 0.1 } }
  },
  retrying: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { blast: 0.95, settle: 1, farK: 0.45, reach: 0.44, fall: 0 } },
    a20: { speed: 1.05, count: 0.16, size: 1.8, extra: { blast: 0.8, settle: 1, farK: 0.5, reach: 0.46, fall: 0 } }
  },
  committing: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { ringR: 0.72, scatter: 0.42 } },
    a20: { speed: 1.1, count: 0.24, size: 1.62, extra: { ringR: 0.74, scatter: 0.34 } }
  },
  progressing: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { bow: 0.3, aheadOn: 0.24 } },
    a20: { speed: 1.05, count: 0.42, size: 1.9, extra: { bow: 0.34, aheadOn: 0.32 } }
  },
  monitoring: {
    a64: { speed: 0.2, count: 1, size: 1, extra: { orbit: 0.55, beatEvery: 3.2 } },
    a20: { speed: 0.26, count: 0.24, size: 1.7, extra: { orbit: 0.6, beatEvery: 3.0 } }
  },
  diverting: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { gap: 0.13, debris: 10, bow: 0.3 } },
    a20: { speed: 1.05, count: 0.42, size: 1.9, extra: { gap: 0.17, debris: 7, bow: 0.34 } }
  },
  verifying: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { segN: 12, perSeg: 7 } },
    a20: { speed: 1.05, count: 0.34, size: 1.8, extra: { segN: 7, perSeg: 4 } }
  },
  activating: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { frontWidth: 0.16, rings: 7 } },
    a20: { speed: 1.05, count: 0.24, size: 1.65, extra: { frontWidth: 0.22, rings: 5 } }
  },
  plotting: {
    a64: { speed: 1.0, count: 1, size: 1, extra: { pinN: 6, perPin: 12, clusterR: 0.11, segDots: 9 } },
    a20: { speed: 1.05, count: 0.34, size: 1.85, extra: { pinN: 4, perPin: 8, clusterR: 0.15, segDots: 6 } }
  },
  error: {
    cycle: faultCycle(),
    a64: { speed: 1.0, count: 1, size: 1, extra: { blast: 0.7, arm: 0.8, reach: 0.5 } },
    a20: { speed: 1.05, count: 0.5, size: 1.4, extra: { blast: 0.6, arm: 0.84, reach: 0.52 } }
  },
  focusing: { a64: { speed: 1.0, count: 1, size: 1 }, a20: { speed: 1.1, count: 0.45, size: 1.55 } },
  pondering: { a64: { speed: 1.0, count: 1, size: 1 }, a20: { speed: 1.08, count: 0.5, size: 1.6 } },
  recalling: { a64: { speed: 1.0, count: 1, size: 1 }, a20: { speed: 1.1, count: 0.42, size: 1.55 } },
  cubing: { a64: { speed: 1.0, count: 1, size: 1 }, a20: { speed: 1.15, count: 0.4, size: 1.65 } },
  building: {
    a64: { speed: 1.5, count: 1, size: 0.9, extra: { spin: 2, ghostN: 18 } },
    a20: { speed: 2, count: 0.4, size: 1.4, extra: { spin: 2, ghostN: 8 } }
  },
  hypercube: {
    a64: { speed: 1.8, count: 1, size: 0.9, extra: { spin: 2, ghostN: 7 } },
    a20: { speed: 2.2, count: 0.5, size: 1.3, extra: { spin: 2, ghostN: 4 } }
  },
  conjuring: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 1.4, ghostN: 16 } },
    a20: { speed: 1.8, count: 0.5, size: 1.3, extra: { spin: 1.4, ghostN: 8 } }
  },
  conjuring_static: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 0, ghostN: 16 } },
    a20: { speed: 1.8, count: 0.5, size: 1.3, extra: { spin: 0, ghostN: 8 } }
  },
  assembling: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 2, ghostN: 16 } },
    a20: { speed: 2, count: 0.5, size: 1.3, extra: { spin: 2, ghostN: 8 } }
  },
  evolving: {
    a64: { speed: 2.5, count: 0.4, size: 0.9, extra: { spin: 2.5, bandMul: 8.5, wobMul: 1.5, lanes: 4 } },
    a20: { speed: 3.2, count: 0.15, size: 1.2, extra: { spin: 2.5, bandMul: 8.5, wobMul: 1.5, lanes: 4 } }
  },
  spinning: {
    a64: { speed: 4.5, count: 0.8, size: 0.8, extra: { lanes: 12, spin: 3, bandMul: 0, wobMul: 0 } },
    a20: { speed: 5.5, count: 0.25, size: 1.2, extra: { lanes: 6, spin: 3, bandMul: 0, wobMul: 0 } }
  },
  responding: {
    a64: { speed: 1.2, count: 1, size: 1, extra: { pulseN: 156, shellCount: 3 } },
    a20: { speed: 1.4, count: 0.4, size: 1.5, extra: { pulseN: 70, shellCount: 2 } }
  },
  presence: {
    a64: { speed: 0.7, count: 1, size: 1, extra: { dotN: 160 } },
    a20: { speed: 0.85, count: 0.28, size: 1.6, extra: { dotN: 48 } }
  },
  cognition: {
    a64: { speed: 1.05, count: 1, size: 1, extra: { dotN: 170 } },
    a20: { speed: 1.2, count: 0.3, size: 1.55, extra: { dotN: 52 } }
  },
  speaking: {
    a64: { speed: 1.35, count: 1, size: 1, extra: { dotN: 160 } },
    a20: { speed: 1.5, count: 0.3, size: 1.55, extra: { dotN: 48 } }
  }
};

/** Resolve a (state, size) pair. Original 9 at 20/64 stay byte-identical to 0.3.1. */
export function resolvePreset(state: OrbState, size: number): Resolved {
  const mode = STATE_TO_MODE[state] ?? STATE_TO_MODE.working;
  let s = size;
  if (!Number.isFinite(s) || s <= 0) s = 64;
  s = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, s)));
  const key = `${state}-${s}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const extra = EXTRA[state];
  let resolved: Resolved;
  if (extra) {
    resolved = fromAnchors(mode, extra.a20, extra.a64, s, extra.cycle);
  } else {
    const table = PRESETS[mode as OfficialMode];
    const large = PRESETS_128[mode as OfficialMode];
    if (s === 20 || s === 64) {
      resolved = applyPreset(mode, table[s]);
    } else if (s === 128) {
      resolved = applyPreset(mode, large);
    } else if (s < 64) {
      resolved = fromAnchors(mode, table[20], table[64], s);
    } else {
      resolved = fromAnchors(mode, table[64], large, s, undefined, 64, 128);
    }
  }

  cache.set(key, resolved);
  return resolved;
}
