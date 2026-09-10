import type { ShapeId } from './bloub/skins';

/**
 * Official Grok Bot brand table + idle motions from grokbot-wall.
 * Product chrome (Luma, email queue) was not copied. SDFs overlap the
 * bloub customiser; we keep the name → ShapeId map and the colour/motion tables.
 */

export const GROKBOT_BRAND = [
  { name: 'WHITE', hex: '#FFFFFF', ui: '#0B72E1' },
  { name: 'BROWN', hex: '#7B4B2A', ui: '#FFA100' },
  { name: 'RED', hex: '#E4232F' },
  { name: 'ORANGE', hex: '#FF5A00' },
  { name: 'AMBER', hex: '#FFA100' },
  { name: 'GREEN', hex: '#00A65A' },
  { name: 'TEAL', hex: '#00A88E' },
  { name: 'BLUE', hex: '#0B72E1' },
  { name: 'PURPLE', hex: '#8A4CF0' },
  { name: 'MAGENTA', hex: '#E5218C' },
  { name: 'GREY', hex: '#6E6E6E', ui: '#8A4CF0' }
] as const;

export type GrokbotBrandName = (typeof GROKBOT_BRAND)[number]['name'];
export type GrokbotForm =
  | 'circle'
  | 'egg'
  | 'squircle'
  | 'pill'
  | 'triangle'
  | 'hexagon'
  | 'cloud'
  | 'drop';
export type GrokbotMotion = 'float' | 'roll' | 'tumble' | 'rock' | 'bounce' | 'sway' | 'drift' | 'drip';

export const GROKBOT_FORM_SHAPE: Record<GrokbotForm, ShapeId> = {
  circle: 'cercle',
  egg: 'galet',
  squircle: 'squircle',
  pill: 'capsule',
  triangle: 'triangle',
  hexagon: 'hexagone',
  cloud: 'nuage',
  drop: 'goutte'
};

export const GROKBOT_FORM_MOTION: Record<GrokbotForm, GrokbotMotion> = {
  circle: 'float',
  egg: 'roll',
  squircle: 'tumble',
  pill: 'rock',
  triangle: 'bounce',
  hexagon: 'sway',
  cloud: 'drift',
  drop: 'drip'
};

export interface GrokbotPose {
  px: number;
  py: number;
  rz: number;
  sx: number;
  sy: number;
}

const REST: GrokbotPose = { px: 0, py: 0, rz: 0, sx: 1, sy: 1 };

/** Idle motions from the wall (2D slice: skip unused 3D axes). */
export function grokbotMotion(name: GrokbotMotion, t: number): GrokbotPose {
  if (name === 'float') return { ...REST, py: Math.sin(t * 1.1) * 0.05, rz: Math.sin(t * 0.9) * 0.05 };
  if (name === 'roll') {
    return { ...REST, rz: Math.sin(t * 1.2) * 0.28, px: Math.sin(t * 1.2) * 0.06, py: Math.abs(Math.cos(t * 1.2)) * 0.03 };
  }
  if (name === 'tumble') return { ...REST, py: Math.sin(t * 0.8) * 0.04, rz: Math.cos(t * 0.6) * 0.18 };
  if (name === 'rock') return { ...REST, rz: Math.sin(t * 1.6) * 0.2, py: Math.abs(Math.sin(t * 1.6)) * 0.05 };
  if (name === 'bounce') {
    const b = Math.abs(Math.sin(t * 1.6));
    const sq = Math.exp(-b * b * 30);
    return { px: 0, py: b * 0.22 - 0.08, rz: 0, sx: 1 + 0.12 * sq, sy: 1 - 0.18 * sq };
  }
  if (name === 'sway') return { ...REST, py: Math.sin(t * 1.3) * 0.04 };
  if (name === 'drift') {
    return {
      px: Math.sin(t * 0.5) * 0.08,
      py: Math.sin(t * 0.8) * 0.06,
      rz: 0,
      sx: 1 + 0.03 * Math.sin(t * 2.1),
      sy: 1 - 0.03 * Math.sin(t * 2.1)
    };
  }
  const drip = Math.max(0, Math.sin(t * 1.4));
  return { px: 0, py: -drip * 0.12, rz: 0, sy: 1 + drip * 0.16, sx: 1 - drip * 0.08 };
}

export function grokbotBrand(name: GrokbotBrandName = 'WHITE'): (typeof GROKBOT_BRAND)[number] {
  return GROKBOT_BRAND.find((c) => c.name === name) ?? GROKBOT_BRAND[0]!;
}

export function grokbotInk(name: GrokbotBrandName, dark: boolean): string {
  const row = grokbotBrand(name);
  if (row.name === 'WHITE') return dark ? '#f4f4f5' : '#111113';
  return row.hex;
}
