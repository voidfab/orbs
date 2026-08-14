import { describe, expect, it } from 'vitest';
import {
  analyseSpectrum,
  analyseTimeDomain,
  levelFromRms,
  spectralFlux,
  speechRmsWindow,
  speechSample,
  vadFromLevel
} from '../seam/audio';
import { SeamField } from '../seam/field';
import {
  LOCKED_CAMERA,
  SILENT_BUS,
  knobsFromPhase,
  resolveKnobs
} from '../seam/knobs';
import { domainEnergy, KnotRibbon, torusKnot, torusKnotRail, v2Topology, variantLayout, waveDisplace, wrapTau } from '../seam/knot';
import { railCount } from '../seam/knobs';
import { internalForVariant, seamPhaseFromFox9 } from '../seam/types';

function stubCtx(): CanvasRenderingContext2D {
  return {
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    fillStyle: ''
  } as unknown as CanvasRenderingContext2D;
}

describe('Conversation Seam', () => {
  it('maps Fox9 states onto the STT-brain-TTS seam', () => {
    expect(seamPhaseFromFox9('idle')).toBe('idle');
    expect(seamPhaseFromFox9(null)).toBe('idle');
    expect(seamPhaseFromFox9('listening')).toBe('listening');
    expect(seamPhaseFromFox9('thinking')).toBe('thinking');
    expect(seamPhaseFromFox9('processing')).toBe('thinking');
    expect(seamPhaseFromFox9('speaking')).toBe('speaking');
    expect(seamPhaseFromFox9('talking')).toBe('speaking');
  });

  it('keeps a finite field while a turn runs', () => {
    const field = new SeamField();
    for (let i = 0; i < 40; i++) {
      field.step(0.016, 'listening', 0.6, 0);
    }
    expect(field.weights.listening).toBeGreaterThan(0.5);
    for (let i = 0; i < 40; i++) {
      field.step(0.016, 'speaking', 0.05, 0.7);
    }
    expect(field.weights.speaking).toBeGreaterThan(0.5);
    expect(Number.isFinite(field.weights.idle)).toBe(true);
  });

  it('a mount-length step already occupies the target phase', () => {
    const field = new SeamField();
    field.step(0.45, 'listening', 0.5, 0, 2);
    expect(field.weights.listening).toBeGreaterThan(0.7);
    expect(field.topology.p).toBe(2);
    expect(field.topology.q).toBe(3);
  });

  it('v1 and v2 paint paths stay finite', () => {
    const field = new SeamField();
    field.step(0.016, 'thinking', 0.2, 0.1, 1);
    field.paint(stubCtx(), 220, baseOpts(1));
    field.step(0.016, 'thinking', 0.2, 0.1, 2);
    field.paint(stubCtx(), 220, baseOpts(2));
    expect(field.weights.thinking).toBeGreaterThan(0);
  });
});

describe('closed trefoil', () => {
  it('meets itself at 0 and 2π for integer (2,3)', () => {
    const a = torusKnot(0, 2, 3);
    const b = torusKnot(Math.PI * 2, 2, 3);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-9);
  });

  it('offsets rails so they do not share a start point', () => {
    const a = torusKnotRail(0, 2, 3, 0, 0.08);
    const b = torusKnotRail(0, 2, 3, Math.PI, 0.08);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.1);
  });

  it('keeps p,q integer in every phase so the loop cannot open', () => {
    for (const phase of ['idle', 'listening', 'thinking', 'speaking'] as const) {
      const w = { idle: 0, listening: 0, thinking: 0, speaking: 0, [phase]: 1 };
      const topo = v2Topology(w);
      expect(Number.isInteger(topo.p), phase).toBe(true);
      expect(Number.isInteger(topo.q), phase).toBe(true);
      expect(topo.p).toBe(2);
      expect(topo.q).toBe(3);
    }
  });

  it('stores a ribbon whose last sample equals the first', () => {
    const ribbon = new KnotRibbon();
    ribbon.ensure(2, 3, 0.34, 240);
    expect(ribbon.closed).toBe(true);
    const field = new SeamField();
    field.step(0.45, 'speaking', 0, 0.8, 2);
    field.paint(stubCtx(), 220, baseOpts(2));
    expect(field.ribbonClosed).toBe(true);
    expect(field.topology.q).toBe(3);
  });
});

describe('independent domains', () => {
  it('does not let input raise external energy or output raise internal', () => {
    const w = { idle: 0, listening: 0, thinking: 0, speaking: 0 };
    const micOnly = domainEnergy(0.9, 0, w);
    const speakOnly = domainEnergy(0, 0.9, w);
    expect(micOnly.internal).toBeGreaterThan(0.6);
    expect(micOnly.external).toBe(0);
    expect(speakOnly.external).toBeGreaterThan(0.6);
    expect(speakOnly.internal).toBe(0);
  });

  it('keeps inbound traffic off the knot and outbound off the core', () => {
    const field = new SeamField();
    for (let i = 0; i < 50; i++) {
      field.step(0.016, 'listening', 0.85, 0, 2);
    }
    const inbound = field.trafficSnapshot.filter((m) => m.kind === 'in');
    expect(inbound.length).toBeGreaterThan(3);
    expect(inbound.every((m) => m.r < 0.45)).toBe(true);

    const out = new SeamField();
    for (let i = 0; i < 50; i++) {
      out.step(0.016, 'speaking', 0, 0.85, 2);
    }
    const outbound = out.trafficSnapshot.filter((m) => m.kind === 'out');
    expect(outbound.length).toBeGreaterThan(3);
  });

  it('maps variants onto distinct layouts and internal bodies', () => {
    expect(internalForVariant('conduit')).toBe('orb');
    expect(internalForVariant('halo')).toBe('helix');
    expect(internalForVariant('well')).toBe('cube');
    const c = variantLayout('conduit');
    const h = variantLayout('halo');
    const w = variantLayout('well');
    expect(h.knotScale).toBeGreaterThan(c.knotScale);
    expect(h.tube).toBeLessThan(c.tube);
    expect(w.fold).toBeGreaterThan(c.fold);
    expect(h.internalScale).not.toBe(c.internalScale);
  });

  it('advances inbound motes without a listen/speak flip', () => {
    const field = new SeamField();
    for (let i = 0; i < 40; i++) {
      field.step(0.016, 'listening', 0.7, 0.55, 2);
    }
    const kinds = new Set(field.trafficSnapshot.map((m) => m.kind));
    expect(kinds.has('in')).toBe(true);
    expect(kinds.has('out')).toBe(true);
    const before = field.trafficSnapshot.filter((m) => m.kind === 'out').map((m) => m.u);
    for (let i = 0; i < 12; i++) field.step(0.016, 'listening', 0.7, 0.55, 2);
    const after = field.trafficSnapshot.filter((m) => m.kind === 'out');
    const moved = after.some((m, i) => (i < before.length ? wrapTau(m.u - before[i]) > 0.01 : true));
    expect(moved).toBe(true);
  });
});

describe('knobs', () => {
  it('locks camera across phases and ties rift to the thinking mock', () => {
    const idle = knobsFromPhase('idle');
    const listen = knobsFromPhase('listening', 0.6, 0);
    const think = knobsFromPhase('thinking');
    const speak = knobsFromPhase('speaking', 0, 0.6);
    for (const k of [idle, listen, think, speak]) {
      expect(k.yawRate).toBe(LOCKED_CAMERA.yawRate);
      expect(k.tilt).toBe(LOCKED_CAMERA.tilt);
      expect(k.hitch).toBe(0);
    }
    expect(think.thinking).toBeGreaterThan(0.5);
    expect(think.rift).toBe(think.thinking);
    expect(think.railThreads).toBe(think.thinking);
    expect(idle.rift).toBe(0);
    expect(speak.rift).toBe(0);
    expect(speak.wave).toBeCloseTo(0.6);
    expect(speak.railThreads).toBe(0);
    expect(railCount(0)).toBe(0);
    expect(railCount(1)).toBe(6);
  });

  it('displaces a knot sample when wave is on and leaves it still when off', () => {
    const [x, y, z] = [1, 0, 0];
    const still = waveDisplace(x, y, z, 0.4, 1, 0);
    expect(still).toEqual([1, 0, 0]);
    const moved = waveDisplace(x, y, z, 0.4, 1, 1);
    expect(Math.hypot(moved[0] - x, moved[1] - y, moved[2] - z)).toBeGreaterThan(0.05);
  });

  it('resolves a binding onto pulse without touching yaw', () => {
    const base = knobsFromPhase('speaking', 0, 0.2);
    const loud = { ...SILENT_BUS, rms: 0.8, peak: 0.9 };
    const next = resolveKnobs(base, { pulse: 'out.rms' }, base.thinking, SILENT_BUS, loud);
    expect(next.pulse).toBeCloseTo(0.8);
    expect(next.yawRate).toBe(LOCKED_CAMERA.yawRate);
  });
});

describe('spectrum analysis', () => {
  it('splits bass mid high and reports flux on a rising frame', () => {
    const quiet = Uint8Array.from({ length: 64 }, () => 0);
    const bass = Uint8Array.from({ length: 64 }, (_, i) => (i < 4 ? 200 : 0));
    const spec = analyseSpectrum(bass, 48000, 1024);
    expect(spec.bass).toBeGreaterThan(spec.high);
    expect(spectralFlux(bass, quiet)).toBeGreaterThan(0.05);
    expect(spectralFlux(quiet, bass)).toBe(0);
  });
});

describe('seam audio maths', () => {
  it('reads silence as empty and a full swing as energy', () => {
    const silence = Uint8Array.from({ length: 64 }, () => 128);
    const hot = Uint8Array.from({ length: 64 }, (_, i) => (i % 2 === 0 ? 0 : 255));
    expect(analyseTimeDomain(silence).rms).toBeLessThan(0.02);
    expect(analyseTimeDomain(hot).rms).toBeGreaterThan(0.8);
    expect(levelFromRms(0.2)).toBeGreaterThan(0.5);
    expect(vadFromLevel(0.02)).toBe(0);
    expect(vadFromLevel(0.8)).toBeGreaterThan(0.7);
  });

  it('synthesizes a non-silent demo voice window', () => {
    expect(speechRmsWindow(1, 4000, 'out')).toBeGreaterThan(0.04);
    expect(speechRmsWindow(1, 4000, 'in')).toBeGreaterThan(0.03);
    expect(Math.abs(speechSample(0.03, 'out'))).toBeGreaterThan(0);
  });
});

function baseOpts(generation: 1 | 2) {
  return {
    phase: 'thinking' as const,
    variant: 'conduit' as const,
    input: 0.2,
    output: 0.1,
    vad: 0.1,
    t: 1.2,
    pointerX: 0.5,
    pointerY: 0.5,
    pointer: 0,
    barge: 0,
    dark: true,
    generation
  };
}
