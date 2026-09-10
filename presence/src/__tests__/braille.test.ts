import { describe, expect, it } from 'vitest';
import { IDLE_SNAPSHOT, PRESENCE_PHASES } from '../bus/types';
import { BRAILLE_BASE, BrailleCanvas, brailleChar, plotLine } from '../braille/canvas';
import { brailleFrame, brailleKind, needleCanvas, spectrumBar, vuRows } from '../braille/meters';

describe('braille canvas', () => {
  it('encodes the Unicode 2×4 bit table', () => {
    expect(brailleChar(0)).toBe('\u2800');
    expect(brailleChar(1)).toBe('\u2801');
    expect(brailleChar(0xff).codePointAt(0)).toBe(BRAILLE_BASE + 0xff);
    const seen = new Set<string>();
    for (let i = 0; i < 256; i++) seen.add(brailleChar(i));
    expect(seen.size).toBe(256);
  });

  it('plots Bresenham dots inside the cell grid', () => {
    const c = new BrailleCanvas(4, 2);
    plotLine(c, 0, 0, c.subW - 1, c.subH - 1);
    const rows = c.rows();
    expect(rows).toHaveLength(2);
    expect(rows.join('').length).toBe(8);
    expect(rows.join('') === '\u2800'.repeat(8)).toBe(false);
    expect([...rows.join('')].every((ch) => (ch.codePointAt(0) ?? 0) >= BRAILLE_BASE)).toBe(true);
  });

  it('swings needles so rest and pegged frames differ', () => {
    const rest = needleCanvas(0.5, 7, 3).toString();
    const low = needleCanvas(0, 7, 3).toString();
    const high = needleCanvas(1, 7, 3).toString();
    expect(rest).not.toBe(low);
    expect(low).not.toBe(high);
    expect(rest.split('\n')).toHaveLength(3);
    expect([...rest].filter((ch) => ch !== '\n').every((ch) => (ch.codePointAt(0) ?? 0) >= BRAILLE_BASE)).toBe(
      true
    );
  });

  it('builds a VU row per band and a spectrum bar of braille cells', () => {
    const rows = vuRows([0.1, 0.5, 0.9], 5, 3);
    expect(rows).toHaveLength(3);
    expect(spectrumBar([0, 0.25, 0.5, 1, 0.1], 8)).toHaveLength(8);
  });

  it('emits a TTY frame for every presence phase', () => {
    for (const phase of PRESENCE_PHASES) {
      const frame = brailleFrame(
        { ...IDLE_SNAPSHOT, phase, duplex: { input: 0.4, output: 0.6 }, session: true },
        0.7
      );
      expect(frame.rows.length).toBeGreaterThan(0);
      expect(frame.rows.join('\n').includes('NaN')).toBe(false);
      expect(['needles', 'leds', 'sines']).toContain(frame.kind);
      expect(brailleKind(phase)).toBe(frame.kind);
    }
    expect(brailleKind('thinking')).toBe('sines');
    expect(brailleKind('waiting')).toBe('leds');
    expect(brailleKind('speaking')).toBe('needles');
  });
});
