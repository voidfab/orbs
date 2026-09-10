/**
 * Aurora mood palettes as CSS colours.
 *
 * Tables follow tornikegomareli/Aurora (Swift/Metal, no LICENSE in the drop).
 * We do not copy the shader — only the named palettes and mood speed knobs.
 * RGB channels in the source are 0–1 floats; we round to 8-bit hex.
 */

export interface AuroraPalette {
  id: string;
  base: string;
  anchors: [string, string, string, string];
}

function rgb01(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export const AURORA_PALETTES = {
  appleIntelligence: {
    id: 'appleIntelligence',
    base: rgb01(0.0, 0.588, 1.0),
    anchors: [rgb01(0.983, 0.392, 1.0), rgb01(1.0, 0.145, 0.333), rgb01(1.0, 0.577, 0.0), rgb01(0.0, 0.588, 1.0)]
  },
  sunset: {
    id: 'sunset',
    base: rgb01(0.95, 0.55, 0.25),
    anchors: [rgb01(1.0, 0.45, 0.15), rgb01(0.95, 0.25, 0.35), rgb01(0.85, 0.2, 0.55), rgb01(1.0, 0.7, 0.3)]
  },
  ocean: {
    id: 'ocean',
    base: rgb01(0.1, 0.4, 0.6),
    anchors: [rgb01(0.2, 0.8, 0.9), rgb01(0.3, 0.9, 0.85), rgb01(0.15, 0.5, 0.85), rgb01(0.2, 0.75, 0.7)]
  },
  forest: {
    id: 'forest',
    base: rgb01(0.15, 0.5, 0.2),
    anchors: [rgb01(0.6, 0.85, 0.25), rgb01(0.4, 0.9, 0.55), rgb01(0.55, 0.7, 0.3), rgb01(0.15, 0.7, 0.4)]
  },
  monochrome: {
    id: 'monochrome',
    base: rgb01(0.3, 0.3, 0.3),
    anchors: [rgb01(1, 1, 1), rgb01(0.75, 0.75, 0.75), rgb01(0.5, 0.5, 0.5), rgb01(0.9, 0.9, 0.9)]
  },
  cyberpunk: {
    id: 'cyberpunk',
    base: rgb01(0.2, 0.1, 0.4),
    anchors: [rgb01(1, 0.2, 0.7), rgb01(0.2, 0.7, 1), rgb01(0.4, 1, 0.3), rgb01(0.7, 0.2, 1)]
  },
  error: {
    id: 'error',
    base: rgb01(0.7, 0.15, 0.1),
    anchors: [rgb01(1, 0.2, 0.15), rgb01(1, 0.45, 0.25), rgb01(0.85, 0.1, 0.35), rgb01(1, 0.3, 0.2)]
  },
  success: {
    id: 'success',
    base: rgb01(0.15, 0.6, 0.3),
    anchors: [rgb01(0.2, 0.9, 0.4), rgb01(0.4, 0.85, 0.55), rgb01(0.15, 0.75, 0.5), rgb01(0.6, 0.95, 0.35)]
  }
} as const satisfies Record<string, AuroraPalette>;

export type AuroraPaletteId = keyof typeof AURORA_PALETTES;

export { rgb01 };
