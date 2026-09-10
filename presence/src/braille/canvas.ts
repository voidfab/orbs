/**
 * Unicode braille canvas: U+2800..U+28FF, 2×4 dots per cell.
 * Bit layout matches cliamp vu-meter.lua (Unicode spec).
 */

export const BRAILLE_BASE = 0x2800;

/** Bit value at sub-cell (col 0..1, row 0..3). */
export const BR_BIT: ReadonlyArray<ReadonlyArray<number>> = [
  [1, 2, 4, 64],
  [8, 16, 32, 128]
];

export function brailleChar(bits: number): string {
  return String.fromCodePoint(BRAILLE_BASE + (bits & 0xff));
}

export class BrailleCanvas {
  readonly cellW: number;
  readonly cellH: number;
  readonly bits: Uint8Array;

  constructor(cellW: number, cellH: number) {
    this.cellW = Math.max(1, cellW | 0);
    this.cellH = Math.max(1, cellH | 0);
    this.bits = new Uint8Array(this.cellW * this.cellH);
  }

  get subW(): number {
    return this.cellW * 2;
  }

  get subH(): number {
    return this.cellH * 4;
  }

  clear(): void {
    this.bits.fill(0);
  }

  setDot(sx: number, sy: number): void {
    if (sx < 0 || sy < 0 || sx >= this.subW || sy >= this.subH) return;
    const cx = (sx / 2) | 0;
    const cy = (sy / 4) | 0;
    const sc = sx - cx * 2;
    const sr = sy - cy * 4;
    const bit = BR_BIT[sc]![sr]!;
    this.bits[cy * this.cellW + cx]! |= bit;
  }

  charAt(cx: number, cy: number): string {
    if (cx < 0 || cy < 0 || cx >= this.cellW || cy >= this.cellH) return ' ';
    return brailleChar(this.bits[cy * this.cellW + cx]!);
  }

  rows(): string[] {
    const out: string[] = [];
    for (let y = 0; y < this.cellH; y++) {
      let row = '';
      for (let x = 0; x < this.cellW; x++) row += this.charAt(x, y);
      out.push(row);
    }
    return out;
  }

  toString(): string {
    return this.rows().join('\n');
  }
}

/** Inclusive integer Bresenham, same walk as cliamp vu-meter.lua. */
export function plotLine(canvas: BrailleCanvas, x0: number, y0: number, x1: number, y1: number): void {
  let x = x0 | 0;
  let y = y0 | 0;
  const tx = x1 | 0;
  const ty = y1 | 0;
  const dx = Math.abs(tx - x);
  const dy = Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx - dy;
  while (true) {
    canvas.setDot(x, y);
    if (x === tx && y === ty) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
