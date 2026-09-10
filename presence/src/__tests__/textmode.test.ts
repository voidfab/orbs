import { describe, expect, it } from 'vitest';
import { IDLE_SNAPSHOT, PRESENCE_PHASES, type PresenceSnapshot } from '../bus/types';
import { TERMINAL_GLYPH } from '../terminal/palette';
import { CAST_ENGINES, CAST_RUNE, autoCastEngine, castPhaseDrive, toCastPhase } from '../textmode/cast';
import { textmodeGrid } from '../textmode/engines';
import { TEXTMODE_RAMP, cellAt, gridToString } from '../textmode/grid';

function snap(phase: PresenceSnapshot['phase'], input = 0.4, output = 0.5): PresenceSnapshot {
  return { ...IDLE_SNAPSHOT, phase, duplex: { input, output }, session: true };
}

describe('textmode field', () => {
  it('emits a closed cols×rows grid for every phase', () => {
    for (const phase of PRESENCE_PHASES) {
      const grid = textmodeGrid(snap(phase), 0.8, 12, 8, 'field');
      expect(grid.cols).toBe(12);
      expect(grid.rows).toBe(8);
      expect(grid.cells).toHaveLength(96);
      expect(grid.cells.every((c) => typeof c.ch === 'string' && c.ch.length >= 1)).toBe(true);
      expect(grid.cells.every((c) => c.fg.startsWith('#'))).toBe(true);
      const text = gridToString(grid);
      expect(text.split('\n')).toHaveLength(8);
      expect(text.includes('NaN')).toBe(false);
    }
  });

  it('stamps the terminal face glyph into the field', () => {
    const grid = textmodeGrid(snap('err'), 0.2, 12, 8, 'field');
    const face = TERMINAL_GLYPH.err.join('');
    const marks = [...face].filter((ch) => ch !== ' ');
    const hay = gridToString(grid);
    for (const ch of marks) {
      expect(hay.includes(ch), ch).toBe(true);
    }
  });

  it('uses the textmode.js density ramp', () => {
    expect(TEXTMODE_RAMP).toBe(' .:-=+*#%@');
    const quiet = textmodeGrid(snap('idle', 0, 0), 0, 12, 8, 'field');
    const loud = textmodeGrid(snap('speaking', 0.2, 0.9), 0.4, 12, 8, 'field');
    const density = (g: ReturnType<typeof textmodeGrid>) =>
      g.cells.filter((c) => c.ch !== ' ' && c.ch !== '.').length;
    expect(density(loud)).toBeGreaterThan(density(quiet));
    expect(cellAt(quiet, 0, 0)?.ch).toBeTruthy();
  });
});

describe('Glyph Cast engines', () => {
  it('names Seal, Hyphae, Beat, and the density field', () => {
    expect([...CAST_ENGINES]).toEqual(['seal', 'hyphae', 'beat', 'field']);
    expect(CAST_RUNE.includes('#')).toBe(true);
    expect(toCastPhase('waiting')).toBe('armed');
    expect(toCastPhase('working')).toBe('thinking');
    expect(toCastPhase('listening')).toBe('listening');
    expect(autoCastEngine('listening')).toBe('beat');
    expect(autoCastEngine('thinking')).toBe('hyphae');
    expect(autoCastEngine('working')).toBe('seal');
    expect(castPhaseDrive('idle').energy).toBeLessThan(castPhaseDrive('listening').energy);
    expect(castPhaseDrive('speaking').pulse).toBeGreaterThan(castPhaseDrive('thinking').pulse);
  });

  it('paints deterministic Seal rings', () => {
    const a = gridToString(textmodeGrid(snap('working'), 0.4, 20, 16, 'seal'));
    const b = gridToString(textmodeGrid(snap('working'), 0.4, 20, 16, 'seal'));
    expect(a).toBe(b);
    expect(a.split('\n')).toHaveLength(16);
    const marks = [...a].filter((ch) => ch !== ' ' && ch !== '\n');
    expect(marks.length).toBeGreaterThan(20);
    expect(marks.every((ch) => CAST_RUNE.includes(ch) || ch === '.' || ch === '#' || ch === '@')).toBe(true);
  });

  it('grows Hyphae trails over time', () => {
    const early = textmodeGrid(snap('thinking'), 0.2, 20, 16, 'hyphae');
    const late = textmodeGrid(snap('thinking'), 2.4, 20, 16, 'hyphae');
    const density = (g: typeof early) => g.cells.filter((c) => c.ch !== ' ').length;
    expect(density(late)).toBeGreaterThan(density(early));
    expect(gridToString(early)).not.toBe(gridToString(late));
  });

  it('draws Beat as two duplex rings', () => {
    const quiet = textmodeGrid(snap('idle', 0, 0), 0.3, 20, 16, 'beat');
    const loud = textmodeGrid(snap('speaking', 0.2, 0.9), 0.3, 20, 16, 'beat');
    const density = (g: typeof quiet) => g.cells.filter((c) => c.ch === '#' || c.ch === '@').length;
    expect(density(loud)).toBeGreaterThan(0);
    expect(density(quiet)).toBeGreaterThan(0);
    expect(gridToString(loud).includes('#')).toBe(true);
    expect(gridToString(loud).includes('@')).toBe(true);
  });
});
