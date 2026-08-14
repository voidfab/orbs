// Adapter: extra-fork ModeBuild painters (DotBuffer) → official ModeFrame.

import { finalizeFrame, type OrbFrame } from './core';
import { DotBuffer } from './buffer';
import type { ModeOpts } from './profiles';
import type { ModeFrame } from './types';

export type ModeBuild = (
  out: DotBuffer,
  size: number,
  t: number,
  opts: ModeOpts,
  progress?: number
) => void;

export function asFrame(build: ModeBuild): ModeFrame {
  return (size, t, o) => {
    const buf = new DotBuffer();
    build(buf, size, t, o, o.progress);
    const dots = buf.dots.slice(0, buf.n);
    const lines = buf.lines.slice(0, buf.lineN);
    return finalizeFrame(dots, lines, o.rMin);
  };
}

export function frameToBuffer(frame: OrbFrame, out: DotBuffer): void {
  out.reset();
  for (const d of frame.dots) out.add(d.x, d.y, d.z, d.r, d.white, d.a ?? 1);
  for (const l of frame.lines) out.addLine(l.x1, l.y1, l.x2, l.y2, l.white, l.w, l.a ?? 1);
}
