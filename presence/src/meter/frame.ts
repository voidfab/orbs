import type { DuplexChannels, PresencePhase } from '../bus/types';

export interface MeterFrame {
  input: number;
  output: number;
  /** 8 synthetic bands, 0–1, driven by the live channel. */
  bands: number[];
  /** Signed PCM in [-1, 1] for the two duplex buses. */
  waveform: { input: number[]; output: number[] };
  /** Magnitude spectrum 0–1. */
  spectrum: number[];
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function bandsFrom(energy: number, t: number, seed: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const wobble = 0.5 + 0.5 * Math.sin(t * (2.2 + i * 0.37) + seed + i);
    out.push(clamp01(energy * (0.35 + 0.65 * wobble) * (1 - i * 0.045)));
  }
  return out;
}

function tone(n: number, t: number, freq: number, energy: number, phase: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const x = i / Math.max(1, n - 1);
    const sample =
      energy *
      (0.62 * Math.sin((x * freq + t * 7.4 + phase) * Math.PI * 2) +
        0.28 * Math.sin((x * freq * 2.1 + t * 5.1) * Math.PI * 2) +
        0.1 * Math.sin(t * 13 + i * 0.37));
    out[i] = sample < -1 ? -1 : sample > 1 ? 1 : sample;
  }
  return out;
}

export function meterFrame(duplex: DuplexChannels, phase: PresencePhase, t: number): MeterFrame {
  const thinking = phase === 'thinking' || phase === 'working' ? 0.22 + 0.12 * Math.abs(Math.sin(t * 2.4)) : 0;
  const input = clamp01(Math.max(duplex.input, phase === 'listening' ? 0.28 : 0));
  const output = clamp01(Math.max(duplex.output, phase === 'speaking' ? 0.32 : thinking));
  const live = Math.max(input, output);
  const seed = phase === 'speaking' ? 1.7 : 0.4;
  return {
    input,
    output,
    bands: bandsFrom(live, t, seed, 8),
    waveform: {
      input: tone(96, t, 6, input, 0.2),
      output: tone(96, t, 5, output, 1.1)
    },
    spectrum: bandsFrom(live, t, seed + 0.7, 16)
  };
}

export function paintMeter(
  ctx: CanvasRenderingContext2D,
  frame: MeterFrame,
  size: number,
  dark: boolean
): void {
  const ink = dark ? '#e8e8ea' : '#161616';
  const mute = dark ? '#3a3a40' : '#d0d0d4';
  const inCol = '#5ce0c9';
  const outCol = '#7b9cff';
  ctx.clearRect(0, 0, size, size);
  const pad = size * 0.14;
  const barW = size * 0.08;
  const maxH = size - pad * 2;

  const drawBar = (x: number, mag: number, color: string) => {
    const h = maxH * mag;
    ctx.fillStyle = mute;
    ctx.fillRect(x, pad, barW, maxH);
    ctx.fillStyle = color;
    ctx.fillRect(x, pad + maxH - h, barW, h);
  };
  drawBar(pad, frame.input, inCol);
  drawBar(size - pad - barW, frame.output, outCol);

  const inner = size - pad * 2 - barW * 2 - 8;
  const x0 = pad + barW + 4;
  const waveTop = pad + maxH * 0.08;
  const waveH = maxH * 0.42;
  const specTop = pad + maxH * 0.58;
  const specH = maxH * 0.34;

  const strokeWave = (samples: number[], color: string) => {
    if (!samples.length) return;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const x = x0 + (i / (samples.length - 1)) * inner;
      const y = waveTop + waveH * 0.5 - samples[i]! * waveH * 0.48;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.stroke();
  };
  ctx.globalAlpha = 0.9;
  strokeWave(frame.waveform.input, inCol);
  ctx.globalAlpha = 0.75;
  strokeWave(frame.waveform.output, outCol);
  ctx.globalAlpha = 1;

  const specW = inner / frame.spectrum.length;
  for (let i = 0; i < frame.spectrum.length; i++) {
    const h = specH * frame.spectrum[i]!;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x0 + i * specW + 0.5, specTop + specH - h, specW - 1, h);
  }
  ctx.globalAlpha = 1;
}
