import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { GLYPH_PATHS, glyphFor } from '../glyph/icons';
import { morphD } from '../glyph/morph';

describe('glyph morphicons', () => {
  it('has a stroke path for every presence phase', () => {
    for (const phase of PRESENCE_PHASES) {
      const d = glyphFor(phase);
      expect(typeof d).toBe('string');
      expect(String(d).length).toBeGreaterThan(8);
    }
    expect(Object.keys(GLYPH_PATHS)).toHaveLength(PRESENCE_PHASES.length);
  });

  it('morphs between any two phases with finite d', () => {
    const pairs: Array<[string, string]> = [
      ['idle', 'listening'],
      ['thinking', 'working'],
      ['waiting', 'speaking'],
      ['done', 'err'],
      ['asleep', 'idle']
    ];
    for (const [a, b] of pairs) {
      const from = glyphFor(a as (typeof PRESENCE_PHASES)[number]);
      const to = glyphFor(b as (typeof PRESENCE_PHASES)[number]);
      for (const t of [0, 0.35, 1]) {
        const d = morphD(from, to, t);
        expect(d.includes('NaN'), `${a}->${b} t=${t}`).toBe(false);
        expect(d.startsWith('M'), `${a}->${b}`).toBe(true);
      }
    }
  });
});
