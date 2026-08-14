// Cube-specific tunings for the original nine verbs (cubed fork).
// Used when `shape="cube"`. New-modes-only states fall back to orb presets.

import type { ModeOpts } from './engine/profiles';
import type { ModeKey } from './presets';
import { resolvePreset, type Resolved } from './presets';
import type { OrbState } from './types';
import {
  buildCubeBraid,
  buildCubeBreathing,
  buildCubeGlobe,
  buildCubeMorph,
  buildCubeOrbits,
  buildCubeRibbon,
  buildCubeRubik,
  buildCubeWave,
  buildCubeWeb
} from './engine/cube-modes';
import type { ModeBuild } from './engine/adapt';

export const CUBE_VERBS = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'thinking',
  'shaping'
] as const;

export type CubeVerb = (typeof CUBE_VERBS)[number];

export function isCubeVerb(state: OrbState): state is CubeVerb {
  return (CUBE_VERBS as readonly string[]).includes(state);
}

export const CUBE_MODE_BUILDS: Record<
  'orbits' | 'globe' | 'rubik' | 'wave' | 'web' | 'braid' | 'ribbon' | 'ring' | 'morph',
  ModeBuild
> = {
  orbits: buildCubeOrbits,
  globe: buildCubeGlobe,
  rubik: buildCubeRubik,
  wave: buildCubeWave,
  web: buildCubeWeb,
  braid: buildCubeBraid,
  ribbon: buildCubeRibbon,
  ring: buildCubeBreathing,
  morph: buildCubeMorph
};

const CUBE_STATE_MODE: Record<CubeVerb, keyof typeof CUBE_MODE_BUILDS> = {
  working: 'orbits',
  searching: 'globe',
  solving: 'rubik',
  listening: 'wave',
  connecting: 'web',
  weaving: 'braid',
  composing: 'ribbon',
  breathing: 'ring',
  thinking: 'ring',
  shaping: 'morph'
};

interface Preset {
  speed: number;
  count: number;
  size: number;
  extra?: ModeOpts;
}

const CUBE_BASE: Record<keyof typeof CUBE_MODE_BUILDS, ModeOpts> = {
  orbits: {
    edgeDots: 10,
    particleCount: 5,
    trailDots: 3,
    trailR: 0.75,
    trailA: 0.48,
    particleR: 1.45,
    particleDepthR: 1.2,
    rsPow: 0.6,
    rMin: 0.3
  },
  globe: {
    faceGrid: 9,
    rBase: 0.62,
    rDepth: 1.65,
    rBoost: 0.9,
    inkFar: 0.64,
    inkSpan: 0.54,
    scanRate: 1.35,
    scanWidth: 0.16,
    dimBase: 0.48,
    rsPow: 0.6,
    rMin: 0.3
  },
  rubik: {
    faceGrid: 8,
    moveCount: 12,
    rBase: 0.62,
    rDepth: 1.7,
    rActive: 0.38,
    inkFar: 0.64,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  wave: {
    faceGrid: 8,
    waveAmp: 0.055,
    rBase: 0.62,
    rDepth: 1.68,
    rsPow: 0.6,
    rMin: 0.3
  },
  web: {
    nodeCount: 30,
    linkDistance: 0.82,
    signalCount: 5,
    nodeR: 1.35,
    nodeDepthR: 1.75,
    lineW: 0.8,
    cubeScale: 1,
    rsPow: 0.6,
    rMin: 0.3
  },
  braid: {
    strandDots: 52,
    turns: 3,
    surfaceDots: 100,
    surfaceR: 0.72,
    rBase: 1.15,
    rDepth: 1.75,
    rsPow: 0.6,
    rMin: 0.3
  },
  ribbon: {
    lanes: 5,
    segments: 72,
    surfaceDots: 90,
    surfaceR: 0.7,
    rBase: 1.05,
    rDepth: 1.65,
    spin: 0,
    waveMul: 1,
    bandMul: 1,
    rsPow: 0.6,
    rMin: 0.3
  },
  ring: {
    edgeDots: 9,
    shells: 3,
    breathAmp: 0.075,
    rBase: 0.95,
    rDepth: 1.55,
    rsPow: 0.6,
    rMin: 0.3
  },
  morph: {
    edgeDots: 10,
    dotR: 1.25,
    dotDepthR: 0.9,
    shapeScale: 1,
    rsPow: 0.6,
    rMin: 0.25
  }
};

const CUBE_ANCHORS: Record<CubeVerb, { a20: Preset; a64: Preset }> = {
  working: {
    a64: { speed: 1.9, count: 1, size: 1 },
    a20: { speed: 3.4, count: 0.45, size: 1.75 }
  },
  searching: {
    a64: { speed: 1.8, count: 0.55, size: 1.1 },
    a20: { speed: 2.55, count: 0.14, size: 1.7, extra: { dimBase: 0.54, scanWidth: 0.24 } }
  },
  solving: {
    a64: { speed: 1.7, count: 0.55, size: 1.05 },
    a20: { speed: 1.9, count: 0.14, size: 1.75, extra: { moveCount: 8 } }
  },
  listening: {
    a64: { speed: 3.7, count: 0.55, size: 1 },
    a20: { speed: 3.4, count: 0.14, size: 1.58, extra: { waveAmp: 0.045 } }
  },
  connecting: {
    a64: { speed: 3.1, count: 1.15, size: 0.95 },
    a20: { speed: 5.8, count: 0.3, size: 1.5, extra: { linkDistance: 1.05 } }
  },
  weaving: {
    a64: { speed: 1.55, count: 0.65, size: 1 },
    a20: { speed: 2.5, count: 0.18, size: 1.38 }
  },
  composing: {
    a64: { speed: 2.2, count: 0.48, size: 0.9, extra: { bandMul: 1.35 } },
    a20: { speed: 2.9, count: 0.14, size: 1.28, extra: { bandMul: 1.5 } }
  },
  breathing: {
    a64: { speed: 2.8, count: 0.9, size: 0.95 },
    a20: { speed: 3.3, count: 0.45, size: 1.5, extra: { shells: 2, breathAmp: 0.065 } }
  },
  thinking: {
    a64: { speed: 2.8, count: 0.9, size: 0.95 },
    a20: { speed: 3.3, count: 0.45, size: 1.5, extra: { shells: 2, breathAmp: 0.065 } }
  },
  shaping: {
    a64: { speed: 2.2, count: 0.9, size: 0.9 },
    a20: { speed: 2, count: 0.45, size: 1.5 }
  }
};

const COUNT_KEYS = [
  'edgeDots',
  'particleCount',
  'trailDots',
  'nodeCount',
  'signalCount',
  'strandDots',
  'surfaceDots',
  'faceGrid',
  'shells',
  'segments',
  'lanes'
] as const;

const RADIUS_KEYS = [
  'rBase',
  'rDepth',
  'rActive',
  'trailR',
  'particleR',
  'particleDepthR',
  'nodeR',
  'nodeDepthR',
  'surfaceR',
  'dotR',
  'dotDepthR'
] as const;

function scaleCounts(opts: ModeOpts, scale: number): ModeOpts {
  const out: ModeOpts = { ...opts };
  const rt = Math.sqrt(scale);
  if (out.faceGrid != null) out.faceGrid = Math.max(2, Math.round(out.faceGrid * rt));
  if (out.lanes != null && out.segments != null) {
    out.lanes = Math.max(1, Math.round(out.lanes * rt));
    out.segments = Math.max(4, Math.round(out.segments * rt));
  }
  for (const k of COUNT_KEYS) {
    if (k === 'faceGrid' || k === 'lanes' || k === 'segments') continue;
    const v = out[k];
    if (v != null && v !== 0) out[k] = Math.max(1, Math.round(v * scale));
  }
  return out;
}

function scaleRadii(opts: ModeOpts, scale: number): ModeOpts {
  const out: ModeOpts = { ...opts };
  for (const k of RADIUS_KEYS) {
    const v = out[k];
    if (v != null) out[k] = v * scale;
  }
  return out;
}

const LN_LO = Math.log(20);
const LN_SPAN = Math.log(64) - LN_LO;
const logLerp = (a: number, b: number, t: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

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

const cache = new Map<string, Resolved>();

export function resolveCubePreset(state: OrbState, size: number): Resolved {
  if (!isCubeVerb(state)) return resolvePreset(state, size);
  let s = Number.isFinite(size) && size > 0 ? Math.round(Math.max(12, Math.min(256, size))) : 64;
  const key = `cube-${state}-${s}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const mode = CUBE_STATE_MODE[state];
  const { a20, a64 } = CUBE_ANCHORS[state];
  const t = (Math.log(s) - LN_LO) / LN_SPAN;
  const speed = logLerp(a20.speed, a64.speed, t);
  const count = logLerp(a20.count, a64.count, Math.min(t, 1.6));
  const rsize = logLerp(a20.size, a64.size, t);
  const extra = lerpExtra(a20.extra, a64.extra, t);

  let opts: ModeOpts = { ...CUBE_BASE[mode] };
  if (count !== 1) opts = scaleCounts(opts, count);
  if (rsize !== 1) opts = scaleRadii(opts, rsize);
  if (extra) opts = { ...opts, ...extra };

  const resolved: Resolved = { mode: mode as ModeKey, speed, opts };
  cache.set(key, resolved);
  return resolved;
}

export function cubeBuilderFor(state: OrbState): ModeBuild | null {
  if (!isCubeVerb(state)) return null;
  return CUBE_MODE_BUILDS[CUBE_STATE_MODE[state]];
}
