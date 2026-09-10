import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { AURORA_MOODS, auroraPalette, auroraPaletteId, auroraSpeed, toAuroraMood } from '../glow/map';
import { AURORA_PALETTES, rgb01 } from '../glow/palettes';

describe('aurora glow', () => {
  it('keeps the five Aurora moods', () => {
    expect([...AURORA_MOODS]).toEqual(['neutral', 'listening', 'thinking', 'error', 'success']);
  });

  it('maps every presence phase onto a mood, palette, and speed', () => {
    for (const phase of PRESENCE_PHASES) {
      expect(AURORA_MOODS.includes(toAuroraMood(phase)), phase).toBe(true);
      const pal = auroraPalette(phase);
      expect(pal.base.startsWith('#')).toBe(true);
      expect(pal.anchors).toHaveLength(4);
      expect(auroraSpeed(phase)).toBeGreaterThan(0);
    }
    expect(toAuroraMood('listening')).toBe('listening');
    expect(toAuroraMood('waiting')).toBe('listening');
    expect(toAuroraMood('thinking')).toBe('thinking');
    expect(toAuroraMood('working')).toBe('thinking');
    expect(toAuroraMood('err')).toBe('error');
    expect(toAuroraMood('done')).toBe('success');
    expect(auroraPaletteId('thinking')).toBe('ocean');
    expect(auroraPaletteId('err')).toBe('error');
    expect(auroraSpeed('listening')).toBeGreaterThan(auroraSpeed('thinking'));
    expect(auroraSpeed('thinking')).toBe(0.6);
    expect(auroraSpeed('listening')).toBe(1.5);
  });

  it('round-trips the Apple Intelligence cyan base', () => {
    expect(rgb01(0, 0.588, 1)).toBe('#0096ff');
    expect(AURORA_PALETTES.appleIntelligence.base).toBe('#0096ff');
    expect(AURORA_PALETTES.appleIntelligence.anchors).toHaveLength(4);
    expect(new Set(Object.values(AURORA_PALETTES).map((p) => p.base)).size).toBe(
      Object.keys(AURORA_PALETTES).length
    );
  });
});
