import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { BotEngine } from '../face/bloub/engine';
import { RAYON } from '../face/bloub/repere';
import { POSES, SEQUENCE, STATES, STATE_BY_ID } from '../face/bloub/states';
import { toFaceState } from '../face/map';

const golden = JSON.parse(
  readFileSync(resolve(__dirname, '../../spec/face-golden.json'), 'utf8')
) as {
  tolerance: number;
  cases: Array<{
    key: string;
    state: string;
    t: number;
    bodyPath: string;
    bodyAlpha: number;
    eyeCount: number;
    eyes: Array<{ d: string; matrix: string; alpha: number }>;
    dots: number[];
    arcs: Array<{ id: string; front: string; back: string; width: number; opacity: number }>;
    notif: number[] | null;
  }>;
};

const r = (n: number) => Number(n.toFixed(4));

describe('bloub catalog goldens', () => {
  it('covers the 14 video states', () => {
    expect(SEQUENCE).toEqual([
      'idle',
      'thinking',
      'wink',
      'wide',
      'alert',
      'notify',
      'exclaim',
      'sleep',
      'egg',
      'hexagon',
      'play',
      'orbit',
      'burst',
      'comet'
    ]);
    expect(STATES.map((s) => s.id)).toContain('swirl');
  });

  it('matches BotEngine.sample for every golden case', () => {
    const eps = golden.tolerance;
    expect(golden.cases.length).toBeGreaterThan(30);
    for (const c of golden.cases) {
      const engine = new BotEngine(RAYON, c.state as (typeof SEQUENCE)[number]);
      const frame = engine.sample(c.t);
      expect(frame.bodyPath, c.key).toBe(c.bodyPath);
      expect(Math.abs(frame.bodyAlpha - c.bodyAlpha), `${c.key} bodyAlpha`).toBeLessThanOrEqual(eps);
      expect(frame.eyes.length, c.key).toBe(c.eyeCount);
      for (let i = 0; i < c.eyes.length; i++) {
        expect(frame.eyes[i]?.d, `${c.key} eye.d`).toBe(c.eyes[i]?.d);
        expect(frame.eyes[i]?.matrix, `${c.key} eye.matrix`).toBe(c.eyes[i]?.matrix);
        expect(Math.abs((frame.eyes[i]?.alpha ?? 0) - c.eyes[i]!.alpha)).toBeLessThanOrEqual(eps);
      }
      const dots = frame.dots.flatMap((d) => [r(d.x), r(d.y), r(d.r), r(d.opacity)]);
      expect(dots.length, c.key).toBe(c.dots.length);
      for (let i = 0; i < dots.length; i++) {
        expect(Math.abs(dots[i]! - c.dots[i]!), `${c.key} dot[${i}]`).toBeLessThanOrEqual(eps);
      }
      expect(frame.arcs.length, c.key).toBe(c.arcs.length);
      if (c.notif) {
        expect(frame.notif).toBeTruthy();
        expect(Math.abs(frame.notif!.x - c.notif[0]!)).toBeLessThanOrEqual(eps);
      }
    }
  });
});

describe('face engine smoke', () => {
  it('emits finite geometry for every catalog pose', () => {
    for (const def of STATES) {
      const engine = new BotEngine(RAYON, def.id);
      const frame = engine.sample(POSES[def.id] ?? 0.8);
      expect(frame.bodyPath.length, def.id).toBeGreaterThan(8);
      expect(Number.isFinite(frame.bodyAlpha), def.id).toBe(true);
      for (const d of frame.dots) {
        expect(Number.isFinite(d.x) && Number.isFinite(d.y) && Number.isFinite(d.r)).toBe(true);
      }
    }
  });

  it('morphs between conversation-mapped poses without NaNs', () => {
    const engine = new BotEngine(RAYON, 'idle');
    let t = 0;
    for (const phase of PRESENCE_PHASES) {
      const id = toFaceState(phase);
      engine.setState(id, t);
      t += STATE_BY_ID.get(id)!.morph;
      const frame = engine.sample(t);
      expect(frame.bodyPath.includes('NaN'), phase).toBe(false);
      expect(Number.isFinite(frame.bodyAlpha), phase).toBe(true);
    }
  });

  it('sample is a pure function of time', () => {
    const a = new BotEngine(RAYON, 'orbit').sample(1.2);
    const b = new BotEngine(RAYON, 'orbit').sample(1.2);
    expect(a.bodyPath).toBe(b.bodyPath);
    expect(a.eyes.map((e) => e.matrix)).toEqual(b.eyes.map((e) => e.matrix));
  });
});
