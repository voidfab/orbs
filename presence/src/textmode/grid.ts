/**
 * Portable character-grid contract, in the spirit of textmode.js
 * (`t.grid.cols/rows`, per-cell char + colour). We do not vendor the
 * WebGL2 engine — hosts paint this grid with canvas, DOM, or a TTY.
 * Glyph Cast engines (Seal / Hyphae / Beat) paint into this same grid.
 */

export interface GridCell {
  ch: string;
  fg: string;
}

export interface CharacterGrid {
  cols: number;
  rows: number;
  cells: GridCell[];
  bg?: string;
}

/** Glyph ramp used by textmode.js examples (density → character). */
export const TEXTMODE_RAMP = ' .:-=+*#%@';

export function emptyGrid(cols: number, rows: number, fill: GridCell = { ch: ' ', fg: '#3a3a40' }): CharacterGrid {
  return {
    cols,
    rows,
    cells: Array.from({ length: cols * rows }, () => ({ ...fill }))
  };
}

export function cellAt(grid: CharacterGrid, x: number, y: number): GridCell | undefined {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return undefined;
  return grid.cells[y * grid.cols + x];
}

export function setCell(grid: CharacterGrid, x: number, y: number, cell: GridCell): void {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
  grid.cells[y * grid.cols + x] = cell;
}

export function gridToString(grid: CharacterGrid): string {
  const lines: string[] = [];
  for (let y = 0; y < grid.rows; y++) {
    let row = '';
    for (let x = 0; x < grid.cols; x++) row += grid.cells[y * grid.cols + x]!.ch;
    lines.push(row);
  }
  return lines.join('\n');
}

export function paintTextmode(
  ctx: CanvasRenderingContext2D,
  grid: CharacterGrid,
  size: number,
  dark: boolean,
  opts?: { clear?: boolean; skipEmpty?: boolean }
): void {
  if (opts?.clear !== false) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = grid.bg ?? (dark ? '#0e1116' : '#eef1f4');
    ctx.fillRect(0, 0, size, size);
  }
  const cell = Math.min(size / grid.cols, size / grid.rows);
  const ox = (size - cell * grid.cols) / 2;
  const oy = (size - cell * grid.rows) / 2;
  ctx.font = `${Math.max(6, Math.floor(cell * 0.92))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const cellData = grid.cells[y * grid.cols + x]!;
      if (opts?.skipEmpty && (cellData.ch === ' ' || cellData.ch === '')) continue;
      ctx.fillStyle = cellData.fg;
      ctx.fillText(cellData.ch, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell);
    }
  }
}
