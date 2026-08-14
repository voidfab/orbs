// SVG renderer — morphing-orbs idea, but driven by official OrbFrame
// geometry so canvas and SVG stay in lockstep.

import { A_LEVELS, L_LEVELS, type RampLut, styleFor } from '../color';
import type { OrbFrame } from '../engine/core';

function inkCss(white: number, alpha: number, dark: boolean, lut?: RampLut): string {
  const w = Math.min(1, Math.max(0, white));
  if (!lut) {
    const g = Math.round((dark ? 1 - w : w) * 255);
    return `rgba(${g},${g},${g},${alpha})`;
  }
  const ink = dark ? 1 - w : w;
  const lB = (ink * (L_LEVELS - 1) + 0.5) | 0;
  const aB = ((alpha > 1 ? 1 : alpha) * (A_LEVELS - 1) + 0.5) | 0;
  return styleFor(lut, lB, aB);
}

export function applyVolume(frame: OrbFrame, size: number, volume?: number): OrbFrame {
  if (volume === undefined) return frame;
  const v = volume < 0 ? 0 : volume > 1 ? 1 : volume;
  const s = 0.72 + 0.5 * v;
  const c = size / 2;
  return {
    dots: frame.dots.map((d) => ({
      ...d,
      x: c + (d.x - c) * s,
      y: c + (d.y - c) * s,
      r: d.r * (0.85 + 0.4 * v)
    })),
    lines: frame.lines.map((l) => ({
      ...l,
      x1: c + (l.x1 - c) * s,
      y1: c + (l.y1 - c) * s,
      x2: c + (l.x2 - c) * s,
      y2: c + (l.y2 - c) * s
    }))
  };
}

export function frameToSvg(
  frame: OrbFrame,
  size: number,
  dark: boolean,
  lut?: RampLut
): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">`
  ];
  for (const l of frame.lines) {
    const a = l.a ?? 1;
    if (a < 0.02) continue;
    parts.push(
      `<line x1="${l.x1.toFixed(2)}" y1="${l.y1.toFixed(2)}" x2="${l.x2.toFixed(2)}" y2="${l.y2.toFixed(2)}" stroke="${inkCss(l.white, a, dark, lut)}" stroke-width="${l.w.toFixed(2)}" stroke-linecap="round"/>`
    );
  }
  for (const d of frame.dots) {
    const a = d.a ?? 1;
    if (a < 0.02) continue;
    parts.push(
      `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${d.r.toFixed(2)}" fill="${inkCss(d.white, a, dark, lut)}"/>`
    );
  }
  parts.push('</svg>');
  return parts.join('');
}
