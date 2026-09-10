import type { PresencePhase, PresenceSnapshot } from '../bus/types';
import { SILENT_DUPLEX } from '../bus/types';
import { meterFrame } from '../meter/frame';
import { BrailleCanvas, plotLine } from './canvas';

export type BrailleKind = 'needles' | 'leds' | 'sines';

export function brailleKind(phase: PresencePhase): BrailleKind {
  switch (phase) {
    case 'thinking':
    case 'working':
      return 'sines';
    case 'waiting':
    case 'err':
      return 'leds';
    default:
      return 'needles';
  }
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Analog needle on a braille canvas. Pivot at bottom-centre, constant
 * length, swing capped so the tip stays inside — cliamp vu-meter.lua.
 */
export function needleCanvas(level: number, meterW = 7, cellH = 3): BrailleCanvas {
  const canvas = new BrailleCanvas(meterW, cellH);
  const mag = clamp01(level);
  const pivotSubX = (canvas.subW / 2) | 0;
  const pivotSubY = canvas.subH - 1;
  const halfSwingX = canvas.subW - 1 - pivotSubX;
  const L = pivotSubY * 0.92;
  const widthCap = Math.asin(Math.min(1, halfSwingX / Math.max(1e-6, L)));
  const thetaMax = Math.min((60 * Math.PI) / 180, widthCap);
  const theta = (mag * 2 - 1) * thetaMax;
  const tipSubX = pivotSubX + Math.floor(L * Math.sin(theta) + 0.5);
  const tipSubY = pivotSubY - Math.floor(L * Math.cos(theta) + 0.5);
  plotLine(canvas, pivotSubX, pivotSubY, tipSubX, tipSubY);
  canvas.setDot(pivotSubX - 1, pivotSubY);
  canvas.setDot(pivotSubX, pivotSubY);
  canvas.setDot(pivotSubX + 1, pivotSubY);
  return canvas;
}

function stitch(blocks: string[][], gap = ' '): string[] {
  if (blocks.length === 0) return [];
  const h = blocks[0]!.length;
  const lines: string[] = [];
  for (let y = 0; y < h; y++) {
    lines.push(blocks.map((b) => b[y] ?? '').join(gap));
  }
  return lines;
}

export function vuRows(bands: number[], meterW = 5, cellH = 3): string[] {
  return stitch(bands.map((level) => needleCanvas(level, meterW, cellH).rows()));
}

const LED_ON = '■';
const LED_OFF = '·';

export function ledBurstRows(left: number, right: number, nLeds = 6): string[] {
  const litL = Math.round(clamp01(left) * nLeds);
  const litR = Math.round(clamp01(right) * nLeds);
  const leftCells: string[] = [];
  for (let i = nLeds; i >= 1; i--) leftCells.push(i <= litL ? LED_ON : LED_OFF);
  const rightCells: string[] = [];
  for (let i = 1; i <= nLeds; i++) rightCells.push(i <= litR ? LED_ON : LED_OFF);
  return [leftCells.join(' ') + ' │ ' + rightCells.join(' ')];
}

export function sineRows(bands: number[], cols = 16, rows = 4, t = 0): string[] {
  const canvas = new BrailleCanvas(cols, rows);
  const n = Math.max(1, Math.min(bands.length, 8));
  const mid = (canvas.subH - 1) / 2;
  const maxAmp = Math.max(1, mid - 0.5);
  for (let w = 0; w < n; w++) {
    const level = clamp01(bands[w] ?? 0);
    const freq = 1.2 + w * 0.37;
    const phase = w * 0.7 + t * (1.4 + w * 0.11);
    for (let sx = 0; sx < canvas.subW; sx++) {
      const u = canvas.subW <= 1 ? 0 : sx / (canvas.subW - 1);
      const y = mid - Math.sin(u * freq * Math.PI * 2 + phase) * maxAmp * (0.2 + 0.8 * level);
      canvas.setDot(sx, Math.round(y));
    }
  }
  return canvas.rows();
}

function barCell(level: number): string {
  const canvas = new BrailleCanvas(1, 1);
  const n = Math.round(clamp01(level) * 8);
  const order: Array<[number, number]> = [
    [0, 3],
    [1, 3],
    [0, 2],
    [1, 2],
    [0, 1],
    [1, 1],
    [0, 0],
    [1, 0]
  ];
  for (let i = 0; i < n; i++) canvas.setDot(order[i]![0], order[i]![1]);
  return canvas.charAt(0, 0);
}

export function spectrumBar(spectrum: number[], cols = 16): string {
  let row = '';
  for (let i = 0; i < cols; i++) {
    const idx = Math.floor((i * spectrum.length) / cols);
    row += barCell(spectrum[idx] ?? 0);
  }
  return row;
}

export interface BrailleFrame {
  kind: BrailleKind;
  rows: string[];
}

export function brailleFrame(snapshot: PresenceSnapshot, t: number, kind?: BrailleKind): BrailleFrame {
  const resolved = kind ?? brailleKind(snapshot.phase);
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const frame = meterFrame(duplex, snapshot.phase, t);
  if (resolved === 'leds') {
    return {
      kind: resolved,
      rows: [
        ...ledBurstRows(frame.input, frame.output, 4),
        spectrumBar(frame.spectrum, 12)
      ]
    };
  }
  if (resolved === 'sines') {
    return { kind: resolved, rows: sineRows(frame.spectrum.slice(0, 6), 12, 4, t) };
  }
  const needles = stitch([
    needleCanvas(frame.input, 5, 3).rows(),
    needleCanvas(frame.output, 5, 3).rows()
  ]);
  return {
    kind: resolved,
    rows: [...needles, spectrumBar(frame.spectrum, 11)]
  };
}

export function paintBraille(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  size: number,
  color: string,
  dark: boolean
): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = dark ? '#0e1116' : '#eef1f4';
  ctx.fillRect(0, 0, size, size);
  if (rows.length === 0) return;
  const maxLen = Math.max(...rows.map((r) => [...r].length), 1);
  const cell = Math.min(size / maxLen, size / rows.length);
  const ox = (size - cell * maxLen) / 2;
  const oy = (size - cell * rows.length) / 2;
  ctx.font = `${Math.max(7, Math.floor(cell * 0.95))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  for (let y = 0; y < rows.length; y++) {
    ctx.fillText(rows[y]!, ox, oy + (y + 0.5) * cell);
  }
}
