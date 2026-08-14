/**
 * Dual-bus audio tap for Conversation Seam.
 *
 * Browsers cannot silently snoop the default output device. The honest
 * options are:
 *   - demo: synthesize a voice and play it through the default speakers,
 *     analysing the same graph so the knot hears what you hear
 *   - speakers: `getDisplayMedia` tab/system audio (Chrome / Edge)
 *   - mic: `getUserMedia` for the inbound / STT bus
 *
 * This is the web-demo analyser that can feed `inputVolume` / `outputVolume`
 * (or the matching refs) on ConversationSeam.
 */

import { SILENT_BUS, type BusAnalysis } from './knobs';

export type OutputTap = 'none' | 'demo' | 'speakers';

export interface AudioLevels {
  input: number;
  output: number;
  vad: number;
  in: BusAnalysis;
  out: BusAnalysis;
}

export interface AudioStatus {
  mic: boolean;
  output: OutputTap;
  error: string | null;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : Number.isFinite(v) ? v : 0);

export function analyseTimeDomain(data: Uint8Array): { rms: number; peak: number } {
  let sum = 0;
  let peak = 0;
  const n = data.length || 1;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: Math.sqrt(sum / n), peak };
}

export function levelFromRms(rms: number, gain = 3.8): number {
  return clamp01(rms * gain);
}

export function vadFromLevel(level: number, floor = 0.07): number {
  return clamp01((level - floor) / Math.max(1e-3, 1 - floor));
}

/** Split an FFT magnitude frame into bass / mid / high + a 0–1 centroid. */
export function analyseSpectrum(
  freq: Uint8Array,
  sampleRate = 48000,
  fftSize = 1024
): { bass: number; mid: number; high: number; centroid: number } {
  const binHz = sampleRate / fftSize;
  let bass = 0;
  let mid = 0;
  let high = 0;
  let bassN = 0;
  let midN = 0;
  let highN = 0;
  let weighted = 0;
  let mass = 0;
  for (let i = 1; i < freq.length; i++) {
    const hz = i * binHz;
    const mag = freq[i] / 255;
    weighted += hz * mag;
    mass += mag;
    if (hz < 180) {
      bass += mag;
      bassN += 1;
    } else if (hz < 2000) {
      mid += mag;
      midN += 1;
    } else if (hz < 8000) {
      high += mag;
      highN += 1;
    }
  }
  const centroidHz = mass > 1e-6 ? weighted / mass : 0;
  return {
    bass: clamp01((bass / Math.max(1, bassN)) * 2.4),
    mid: clamp01((mid / Math.max(1, midN)) * 2.1),
    high: clamp01((high / Math.max(1, highN)) * 2.6),
    centroid: clamp01(centroidHz / 4000)
  };
}

export function spectralFlux(cur: Uint8Array, prev: Uint8Array | null): number {
  if (!prev || prev.length !== cur.length) return 0;
  let rise = 0;
  for (let i = 0; i < cur.length; i++) {
    const d = cur[i] - prev[i];
    if (d > 0) rise += d;
  }
  return clamp01(rise / (cur.length * 24));
}

/** Deterministic formant-ish sample. Used by tests and as a synth seed. */
export function speechSample(t: number, channel: 'in' | 'out' = 'out'): number {
  const f0 = channel === 'out' ? 78 : 132;
  const syllHz = channel === 'out' ? 4.6 : 6.2;
  const syll = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * syllHz);
  const gate = syll > 0.4 ? (syll - 0.4) / 0.6 : 0;
  const s1 = Math.sin(t * Math.PI * 2 * f0);
  const s2 = Math.sin(t * Math.PI * 2 * f0 * 2) * 0.42;
  const s3 = Math.sin(t * Math.PI * 2 * f0 * 3.02) * 0.16;
  const buzz = (s1 + s2 + s3) / 1.58;
  const form = buzz * (0.72 + 0.28 * Math.sin(t * Math.PI * 2 * 1.7));
  return form * gate * 0.55;
}

export function speechRmsWindow(seconds = 1, rate = 8000, channel: 'in' | 'out' = 'out'): number {
  const n = Math.max(8, Math.floor(seconds * rate));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = speechSample(i / rate, channel);
    sum += s * s;
  }
  return Math.sqrt(sum / n);
}

type DisplayAudioConstraint = boolean | (MediaTrackConstraints & { suppressLocalAudioPlayback?: boolean });

function approach(c: number, t: number, r: number, dt: number): number {
  return c + (t - c) * (1 - Math.exp(-r * dt));
}

export class SeamAudio {
  readonly levels: AudioLevels = {
    input: 0,
    output: 0,
    vad: 0,
    in: { ...SILENT_BUS },
    out: { ...SILENT_BUS }
  };
  mic = false;
  output: OutputTap = 'none';
  error: string | null = null;

  private ctx: AudioContext | null = null;
  private inAnalyser: AnalyserNode | null = null;
  private outAnalyser: AnalyserNode | null = null;
  private inBuf: Uint8Array<ArrayBuffer> | null = null;
  private outBuf: Uint8Array<ArrayBuffer> | null = null;
  private inFreq: Uint8Array<ArrayBuffer> | null = null;
  private outFreq: Uint8Array<ArrayBuffer> | null = null;
  private inPrev: Uint8Array<ArrayBuffer> | null = null;
  private outPrev: Uint8Array<ArrayBuffer> | null = null;
  private inStream: MediaStream | null = null;
  private outStream: MediaStream | null = null;
  private demoStops: Array<() => void> = [];
  private lastPoll = 0;

  get status(): AudioStatus {
    return { mic: this.mic, output: this.output, error: this.error };
  }

  async startMic(): Promise<void> {
    this.error = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      this.stopMic();
      this.inStream = stream;
      const ctx = await this.ensureCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.62;
      src.connect(analyser);
      this.inAnalyser = analyser;
      this.inBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;
      this.inFreq = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.inPrev = null;
      this.mic = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'mic unavailable';
      this.mic = false;
      throw err;
    }
  }

  async startDemo(channel: 'out' | 'both' = 'out'): Promise<void> {
    this.error = null;
    this.stopOutput();
    try {
      const ctx = await this.ensureCtx();
      const master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);

      const outTap = ctx.createAnalyser();
      outTap.fftSize = 1024;
      outTap.smoothingTimeConstant = 0.6;
      const voice = this.buildVoice(ctx, 'out');
      voice.connect(outTap);
      voice.connect(master);
      this.outAnalyser = outTap;
      this.outBuf = new Uint8Array(outTap.fftSize) as Uint8Array<ArrayBuffer>;
      this.outFreq = new Uint8Array(outTap.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.outPrev = null;

      if (channel === 'both') {
        const inTap = ctx.createAnalyser();
        inTap.fftSize = 1024;
        inTap.smoothingTimeConstant = 0.6;
        const murmur = this.buildVoice(ctx, 'in');
        murmur.connect(inTap);
        this.inAnalyser = inTap;
        this.inBuf = new Uint8Array(inTap.fftSize) as Uint8Array<ArrayBuffer>;
        this.inFreq = new Uint8Array(inTap.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        this.inPrev = null;
      }

      this.output = 'demo';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'demo audio failed';
      this.output = 'none';
      throw err;
    }
  }

  async startSpeakers(): Promise<void> {
    this.error = null;
    this.stopOutput();
    try {
      const audio: DisplayAudioConstraint = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      };
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: 16, height: 16 },
        audio
      });
      stream.getVideoTracks().forEach((t) => t.stop());
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('no audio track — share a tab with audio, or use demo voice');
      }
      this.outStream = stream;
      stream.getAudioTracks()[0]?.addEventListener('ended', () => {
        if (this.outStream === stream) this.stopOutput();
      });
      const ctx = await this.ensureCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.58;
      src.connect(analyser);
      this.outAnalyser = analyser;
      this.outBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;
      this.outFreq = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.outPrev = null;
      this.output = 'speakers';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'speaker tap unavailable';
      this.output = 'none';
      throw err;
    }
  }

  attachElement(el: HTMLMediaElement, bus: 'in' | 'out' = 'out'): void {
    void this.ensureCtx().then((ctx) => {
      const src = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      if (bus === 'out') {
        src.connect(ctx.destination);
        this.outAnalyser = analyser;
        this.outBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;
        this.outFreq = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        this.outPrev = null;
        this.output = 'demo';
      } else {
        this.inAnalyser = analyser;
        this.inBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;
        this.inFreq = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        this.inPrev = null;
        this.mic = true;
      }
    });
  }

  stopMic(): void {
    this.inStream?.getTracks().forEach((t) => t.stop());
    this.inStream = null;
    this.inAnalyser = null;
    this.inBuf = null;
    this.inFreq = null;
    this.inPrev = null;
    this.mic = false;
    this.levels.input = 0;
    this.levels.vad = 0;
    this.levels.in = { ...SILENT_BUS };
  }

  stopOutput(): void {
    this.outStream?.getTracks().forEach((t) => t.stop());
    this.outStream = null;
    this.outAnalyser = null;
    this.outBuf = null;
    this.outFreq = null;
    this.outPrev = null;
    for (const stop of this.demoStops) stop();
    this.demoStops = [];
    this.output = 'none';
    this.levels.output = 0;
    this.levels.out = { ...SILENT_BUS };
  }

  stop(): void {
    this.stopMic();
    this.stopOutput();
    const ctx = this.ctx;
    this.ctx = null;
    void ctx?.close();
  }

  poll(now = typeof performance !== 'undefined' ? performance.now() : 0): AudioLevels {
    const dt = this.lastPoll ? Math.min(0.05, Math.max(0.008, (now - this.lastPoll) / 1000)) : 0.016;
    this.lastPoll = now;

    if (this.inAnalyser && this.inBuf) {
      this.inAnalyser.getByteTimeDomainData(this.inBuf);
      const { rms, peak } = analyseTimeDomain(this.inBuf);
      const target = levelFromRms(rms, 4.2);
      this.levels.input = approach(this.levels.input, target, 14, dt);
      this.levels.vad = approach(this.levels.vad, vadFromLevel(this.levels.input), 10, dt);
      this.levels.in = this.readBus(this.inAnalyser, this.inFreq, this.inPrev, this.levels.in, target, peak, this.levels.vad, dt, 4.2);
      if (this.inFreq) this.inPrev = new Uint8Array(this.inFreq) as Uint8Array<ArrayBuffer>;
    } else {
      this.levels.input = approach(this.levels.input, 0, 8, dt);
      this.levels.vad = approach(this.levels.vad, 0, 8, dt);
      this.levels.in = decayBus(this.levels.in, dt);
    }

    if (this.outAnalyser && this.outBuf) {
      this.outAnalyser.getByteTimeDomainData(this.outBuf);
      const { rms, peak } = analyseTimeDomain(this.outBuf);
      const target = levelFromRms(rms, 3.6);
      this.levels.output = approach(this.levels.output, target, 12, dt);
      this.levels.out = this.readBus(this.outAnalyser, this.outFreq, this.outPrev, this.levels.out, target, peak, 0, dt, 3.6);
      if (this.outFreq) this.outPrev = new Uint8Array(this.outFreq) as Uint8Array<ArrayBuffer>;
    } else {
      this.levels.output = approach(this.levels.output, 0, 8, dt);
      this.levels.out = decayBus(this.levels.out, dt);
    }

    return this.levels;
  }

  private readBus(
    analyser: AnalyserNode,
    freq: Uint8Array<ArrayBuffer> | null,
    prev: Uint8Array<ArrayBuffer> | null,
    current: BusAnalysis,
    rms: number,
    peakRaw: number,
    vad: number,
    dt: number,
    _gain: number
  ): BusAnalysis {
    let bass = 0;
    let mid = 0;
    let high = 0;
    let centroid = 0;
    let onset = 0;
    if (freq) {
      analyser.getByteFrequencyData(freq);
      const spec = analyseSpectrum(freq, this.ctx?.sampleRate ?? 48000, analyser.fftSize);
      bass = spec.bass;
      mid = spec.mid;
      high = spec.high;
      centroid = spec.centroid;
      onset = spectralFlux(freq, prev);
    }
    return {
      rms: approach(current.rms, rms, 14, dt),
      peak: approach(current.peak, clamp01(peakRaw * 1.05), 18, dt),
      vad: approach(current.vad, vad, 10, dt),
      bass: approach(current.bass, bass, 10, dt),
      mid: approach(current.mid, mid, 10, dt),
      high: approach(current.high, high, 10, dt),
      onset: approach(current.onset, onset, 20, dt),
      centroid: approach(current.centroid, centroid, 8, dt)
    };
  }

  private async ensureCtx(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  private buildVoice(ctx: AudioContext, kind: 'in' | 'out'): AudioNode {
    const out = ctx.createGain();
    out.gain.value = 0.001;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = kind === 'out' ? 78 : 128;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = kind === 'out' ? 156 : 256;

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = kind === 'out' ? 430 : 760;
    bp1.Q.value = 3.6;

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = kind === 'out' ? 1680 : 2140;
    bp2.Q.value = 2.1;

    const mix = ctx.createGain();
    mix.gain.value = 0.7;
    osc.connect(bp1);
    bp1.connect(mix);
    osc2.connect(bp2);
    bp2.connect(mix);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = kind === 'out' ? 0.045 : 0.03;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    noise.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(mix);

    mix.connect(out);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = kind === 'out' ? 4.5 : 6.1;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = kind === 'out' ? 18 : 14;
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);

    osc.start();
    osc2.start();
    noise.start();
    lfo.start();
    this.armSpeech(ctx, out.gain, kind);

    this.demoStops.push(() => {
      try {
        osc.stop();
        osc2.stop();
        noise.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
    });
    return out;
  }

  private armSpeech(ctx: AudioContext, param: AudioParam, kind: 'in' | 'out'): void {
    const fire = () => {
      if (kind === 'out' && this.output !== 'demo') return;
      if (kind === 'in' && !this.inAnalyser) return;
      this.scheduleGates(ctx, param, kind);
    };
    fire();
    const timer = window.setInterval(fire, 5600);
    this.demoStops.push(() => window.clearInterval(timer));
  }

  private scheduleGates(ctx: AudioContext, param: AudioParam, kind: 'in' | 'out'): void {
    let t = ctx.currentTime + 0.02;
    const peak = kind === 'out' ? 0.34 : 0.22;
    const salt = Math.floor(t * 10);
    for (let i = 0; i < 20; i++) {
      const on = 0.07 + hash01(i * 17 + salt + (kind === 'out' ? 3 : 9)) * 0.2;
      const gap = 0.04 + hash01(i * 13 + salt + 5) * 0.14;
      const amp = peak * (0.55 + hash01(i * 11 + salt + 2) * 0.45);
      param.setValueAtTime(0.001, t);
      param.linearRampToValueAtTime(amp, t + 0.025);
      param.linearRampToValueAtTime(amp * 0.72, t + on);
      param.exponentialRampToValueAtTime(0.001, t + on + 0.05);
      t += on + gap;
    }
  }
}

function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function decayBus(bus: BusAnalysis, dt: number): BusAnalysis {
  return {
    rms: approach(bus.rms, 0, 8, dt),
    peak: approach(bus.peak, 0, 8, dt),
    vad: approach(bus.vad, 0, 8, dt),
    bass: approach(bus.bass, 0, 8, dt),
    mid: approach(bus.mid, 0, 8, dt),
    high: approach(bus.high, 0, 8, dt),
    onset: approach(bus.onset, 0, 10, dt),
    centroid: approach(bus.centroid, 0, 8, dt)
  };
}
