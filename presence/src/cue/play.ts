import type { PresencePhase } from '../bus/types';
import { RECIPES, type CueName, type NoiseLayer, type ToneLayer } from './recipes';

const PHASE_CUE: Partial<Record<PresencePhase, CueName>> = {
  listening: 'droplet',
  thinking: 'tick',
  working: 'tick',
  waiting: 'pulse',
  speaking: 'whisper',
  done: 'success',
  err: 'error'
};

let ctx: AudioContext | null = null;
let enabled = true;

export function setCueEnabled(on: boolean): void {
  enabled = on;
}

export function cueForPhase(phase: PresencePhase): CueName | null {
  return PHASE_CUE[phase] ?? null;
}

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(audio: AudioContext, dest: AudioNode, layer: ToneLayer, start: number): void {
  const osc = audio.createOscillator();
  osc.type = layer.waveform;
  osc.frequency.setValueAtTime(layer.frequency, start);
  if (layer.detune) osc.detune.value = layer.detune;
  if (layer.glideTo !== undefined) {
    const glide = layer.glideTime ?? layer.attack + layer.decay;
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.glideTo), start + glide);
  }
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.peak), start + layer.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.attack + layer.decay);
  osc.connect(gain).connect(dest);
  osc.start(start);
  osc.stop(start + layer.attack + layer.decay + 0.05);
}

function playNoise(audio: AudioContext, dest: AudioNode, layer: NoiseLayer, start: number): void {
  const duration = layer.attack + layer.decay + 0.05;
  const length = Math.max(1, Math.floor(duration * audio.sampleRate));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = 2 * Math.random() - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = layer.filterType;
  filter.frequency.value = layer.filterFrequency;
  if (layer.filterQ !== undefined) filter.Q.value = layer.filterQ;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.peak), start + layer.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.attack + layer.decay);
  source.connect(filter).connect(gain).connect(dest);
  source.start(start);
  source.stop(start + duration);
}

export function playCue(name: CueName): void {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
  const recipe = RECIPES[name];
  const master = audio.createGain();
  master.gain.value = recipe.masterGain * 0.8;
  master.connect(audio.destination);
  const now = audio.currentTime;
  for (const layer of recipe.layers) {
    const start = now + ('offset' in layer && layer.offset ? layer.offset : 0);
    if (layer.kind === 'tone') playTone(audio, master, layer, start);
    else playNoise(audio, master, layer, start);
  }
}

export function playPhaseCue(phase: PresencePhase): void {
  const name = cueForPhase(phase);
  if (name) playCue(name);
}
