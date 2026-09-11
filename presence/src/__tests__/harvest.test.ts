import { describe, expect, it } from 'vitest';
import { IDLE_SNAPSHOT } from '../bus/types';
import { cueForPhase } from '../cue/play';
import { GROKBOT_BRAND, GROKBOT_FORM_SHAPE, grokbotMotion } from '../face/brand';
import { lookVector } from '../face/googly';
import { grayCode, hamming, hypercube, project4to2 } from '../hypercube/cube';
import { gradientSvg } from '../identity/gradient';
import { identiconSvg } from '../identity/identicon';
import { textmodeGrid } from '../textmode/engines';
import { TTFX_EFFECTS, autoTtfxEngine } from '../textmode/ttfx';

describe('grokbot-wall harvest', () => {
  it('maps official forms onto bloub shape ids and has brand ramps', () => {
    expect(GROKBOT_BRAND.map((c) => c.name)).toContain('BLUE');
    expect(GROKBOT_FORM_SHAPE.circle).toBe('cercle');
    expect(GROKBOT_FORM_SHAPE.drop).toBe('goutte');
    const pose = grokbotMotion('bounce', 0.4);
    expect(Number.isFinite(pose.py)).toBe(true);
    expect(Number.isFinite(pose.sy)).toBe(true);
  });
});

describe('ttfx harvest', () => {
  it('lists effect verbs and paints portable matrix/decrypt/waves grids', () => {
    expect(TTFX_EFFECTS).toContain('matrix');
    expect(autoTtfxEngine('thinking')).toBe('matrix');
    const snap = { ...IDLE_SNAPSHOT, phase: 'thinking' as const, session: true };
    for (const engine of ['matrix', 'decrypt', 'waves'] as const) {
      const grid = textmodeGrid(snap, 0.8, 12, 8, engine);
      expect(grid.cells).toHaveLength(96);
      expect(gridToHasGlyph(grid)).toBe(true);
    }
  });
});

describe('cuelume harvest', () => {
  it('maps conversation phases onto synthesized cue names', () => {
    expect(cueForPhase('listening')).toBe('droplet');
    expect(cueForPhase('done')).toBe('success');
    expect(cueForPhase('err')).toBe('error');
    expect(cueForPhase('idle')).toBeNull();
  });
});

describe('hypercube harvest', () => {
  it('builds a 4-cube with a Gray Hamiltonian cycle', () => {
    const g = hypercube(4);
    expect(g.vertices).toHaveLength(16);
    expect(g.edges).toHaveLength(32);
    const gray = grayCode(4);
    expect(gray).toHaveLength(16);
    for (let i = 0; i < gray.length; i++) {
      expect(hamming(gray[i]!, gray[(i + 1) % gray.length]!)).toBe(1);
    }
    const p = project4to2(g.vertices[0]!);
    expect(Number.isFinite(p.x + p.y + p.depth)).toBe(true);
  });
});

describe('googly harvest', () => {
  it('ramps look instead of slamming to the rim', () => {
    const near = lookVector(2, 0, 48);
    expect(near.x).toBeLessThan(0.1);
    const far = lookVector(400, 0, 48);
    expect(far.x).toBeCloseTo(1, 5);
  });
});

describe('boring-avatars harvest', () => {
  it('emits a deterministic marble identicon for a name', () => {
    const a = identiconSvg('alice', 64);
    const b = identiconSvg('alice', 64);
    const c = identiconSvg('bob', 64);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('<svg')).toBe(true);
    expect(a.includes('NaN')).toBe(false);
  });
});

describe('avatar gradient harvest', () => {
  it('emits a deterministic triad gradient for a name', () => {
    expect(gradientSvg('alice', 64)).toBe(gradientSvg('alice', 64));
    expect(gradientSvg('alice', 64)).not.toBe(gradientSvg('bob', 64));
    expect(gradientSvg('alice', 64).includes('linearGradient')).toBe(true);
  });
});

function gridToHasGlyph(grid: { cells: Array<{ ch: string }> }): boolean {
  return grid.cells.some((c) => c.ch.trim().length > 0);
}
