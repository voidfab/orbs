import { describe, expect, it } from 'vitest';
import { BotEngine } from '../face/bloub/engine';
import { ghostHover } from '../face/bloub/ghostHover';
import { RAYON } from '../face/bloub/repere';
import { toPoints } from '../face/bloub/shape';
import { SHAPE_BY_ID, SHAPES } from '../face/bloub/skins';
import { POSES, STATES } from '../face/bloub/states';

function localMaxima(radii: number[], from: number, to: number): number {
  let n = 0;
  for (let i = from + 1; i < to; i++) {
    const a = radii[i - 1] ?? 0;
    const b = radii[i] ?? 0;
    const c = radii[i + 1] ?? 0;
    if (b > a && b >= c) n += 1;
  }
  return n;
}

describe('ghost sheet body', () => {
  it('is a catalog silhouette distinct from the ball', () => {
    const ghost = SHAPE_BY_ID.get('ghost');
    const ball = SHAPE_BY_ID.get('cercle');
    expect(ghost).toBeTruthy();
    expect(ball).toBeTruthy();
    expect(ghost!.radii).toHaveLength(ball!.radii.length);
    expect(ghost!.radii).not.toEqual(ball!.radii);
    expect(SHAPES.some((s) => s.id === 'ghost')).toBe(true);
  });

  it('keeps a ball-sized head and hangs a scalloped sheet below', () => {
    const ghost = SHAPE_BY_ID.get('ghost')!.radii;
    const ball = SHAPE_BY_ID.get('cercle')!.radii;
    // i=0 right, 16 down, 32 left, 48 up. 64 samples, θ clockwise, y down.
    expect(Math.abs((ghost[48] ?? 0) - 1)).toBeLessThan(0.08);
    expect(Math.abs((ghost[0] ?? 0) - 1)).toBeLessThan(0.12);
    expect(ghost[16] ?? 0).toBeGreaterThan(1.15);
    expect(ghost[16] ?? 0).toBeGreaterThan(ball[16] ?? 0);
    expect(localMaxima(ghost, 6, 26)).toBeGreaterThanOrEqual(3);
  });

  it('keeps two eyes on idle like the ball, with a taller body path', () => {
    const ball = new BotEngine(RAYON, 'idle', null).sample(0.4);
    const radii = SHAPE_BY_ID.get('ghost')!.radii;
    const ghost = new BotEngine(RAYON, 'idle', radii).sample(0.4);
    expect(ghost.eyes).toHaveLength(2);
    expect(ghost.eyes.every((e) => e.alpha > 0.5 && e.d.length > 8)).toBe(true);
    expect(ghost.bodyPath.startsWith('M')).toBe(true);
    expect(ghost.bodyPath).not.toBe(ball.bodyPath);
    expect(ghost.bodyPath.includes('NaN')).toBe(false);
    const pts = toPoints({ radii, rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 }, RAYON);
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(maxY).toBeGreaterThan(RAYON * 1.15);
  });

  it('wears the sheet on every catalog pose', () => {
    const radii = SHAPE_BY_ID.get('ghost')!.radii;
    const ballIdle = new BotEngine(RAYON, 'idle', null).sample(1);
    for (const def of STATES) {
      const ghost = new BotEngine(RAYON, def.id, radii).sample(POSES[def.id] ?? 0.8);
      expect(ghost.bodyPath.startsWith('M'), def.id).toBe(true);
      expect(ghost.bodyPath.includes('NaN'), def.id).toBe(false);
      expect(ghost.bodyPath, def.id).not.toBe(ballIdle.bodyPath);
    }
  });

  it('keeps a face on glyph poses instead of replacing the body with dots or a !', () => {
    const radii = SHAPE_BY_ID.get('ghost')!.radii;
    const thinking = new BotEngine(RAYON, 'thinking', radii).sample(1.1);
    expect(thinking.eyes.length).toBeGreaterThanOrEqual(2);
    expect(thinking.dots.length).toBe(3);

    const sleepBall = new BotEngine(RAYON, 'sleep', null).sample(0.45);
    const sleepGhost = new BotEngine(RAYON, 'sleep', radii).sample(0.45);
    expect(sleepGhost.eyes.length).toBe(0);
    expect(sleepGhost.bodyPath).not.toBe(sleepBall.bodyPath);

    const burstGhost = new BotEngine(RAYON, 'burst', radii).sample(0);
    const idleGhost = new BotEngine(RAYON, 'idle', radii).sample(0);
    expect(burstGhost.bodyPath).toBe(idleGhost.bodyPath);

    const exclaim = new BotEngine(RAYON, 'exclaim', radii).sample(0.8);
    expect(exclaim.eyes.length).toBeGreaterThanOrEqual(2);
  });

  it('gives alert and exclaim distinct ! marks beside the sheet', () => {
    const radii = SHAPE_BY_ID.get('ghost')!.radii;
    const alert = new BotEngine(RAYON, 'alert', radii).sample(0.75);
    const exclaim = new BotEngine(RAYON, 'exclaim', radii).sample(0.8);
    const wide = new BotEngine(RAYON, 'wide', radii).sample(0.8);
    expect(alert.eyes.length).toBeGreaterThanOrEqual(2);
    expect(exclaim.eyes.length).toBeGreaterThanOrEqual(2);
    expect(alert.dots.length).toBe(2);
    expect(exclaim.dots.length).toBe(2);
    expect(wide.dots.length).toBe(0);
    const alertBar = alert.dots.find((d) => d.d);
    const exclaimBar = exclaim.dots.find((d) => d.d);
    expect(alertBar?.rot).toBeCloseTo(17.7, 5);
    expect(exclaimBar?.rot ?? 0).toBe(0);
    expect(alertBar?.dScale).toBe(RAYON);
    expect(exclaimBar?.dScale).toBe(RAYON);
    expect(alert.bodyPath).not.toBe(exclaim.bodyPath);
  });

  it('hovers on idle and listening, not on pose-owned silhouettes', () => {
    const rest = SHAPE_BY_ID.get('ghost')!.radii;
    const atRest = ghostHover(rest, 0);
    expect(atRest.radii).toEqual(rest);
    expect(atRest.cy).toBe(0);
    expect(atRest.sx).toBe(1);
    const waving = ghostHover(rest, 1);
    expect(waving.radii).not.toEqual(rest);
    expect(waving.cy).not.toBe(0);

    const radii = rest;
    const idle0 = new BotEngine(RAYON, 'idle', radii).sample(0);
    const idle1 = new BotEngine(RAYON, 'idle', radii).sample(1);
    expect(idle1.bodyPath).not.toBe(idle0.bodyPath);
    const burst0 = new BotEngine(RAYON, 'burst', radii).sample(0);
    expect(burst0.bodyPath).toBe(idle0.bodyPath);

    const think0 = new BotEngine(RAYON, 'thinking', radii).sample(0);
    const think1 = new BotEngine(RAYON, 'thinking', radii).sample(1);
    expect(think0.dots.length).toBe(3);
    expect(think1.dots.length).toBe(3);
  });
});
