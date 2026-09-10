/** Cuelume recipes used on the presence bus. Full 17-sound palette stays in the zip. */

export type ToneLayer = {
  kind: 'tone';
  waveform: OscillatorType;
  frequency: number;
  attack: number;
  decay: number;
  peak: number;
  offset?: number;
  detune?: number;
  glideTo?: number;
  glideTime?: number;
};

export type NoiseLayer = {
  kind: 'noise';
  filterType: BiquadFilterType;
  filterFrequency: number;
  attack: number;
  decay: number;
  peak: number;
  offset?: number;
  filterQ?: number;
};

export type SoundLayer = ToneLayer | NoiseLayer;

export type SoundRecipe = {
  masterGain: number;
  layers: SoundLayer[];
  shimmer?: { delay: number; feedback: number; wet: number; lowpass: number };
};

export const RECIPES = {
  droplet: {
    masterGain: 0.55,
    layers: [
      {
        kind: 'tone',
        waveform: 'sine',
        frequency: 1200,
        glideTo: 550,
        glideTime: 0.14,
        attack: 0.004,
        decay: 0.2,
        peak: 0.075
      }
    ]
  },
  tick: {
    masterGain: 0.4,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 5400, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.14 },
      { kind: 'tone', waveform: 'sine', frequency: 2600, attack: 0.001, decay: 0.012, peak: 0.018 }
    ]
  },
  pulse: {
    masterGain: 0.45,
    layers: [{ kind: 'tone', waveform: 'sine', frequency: 440, attack: 0.02, decay: 0.18, peak: 0.05 }]
  },
  whisper: {
    masterGain: 0.48,
    layers: [
      { kind: 'noise', filterType: 'lowpass', filterFrequency: 1600, filterQ: 0.7, attack: 0.025, decay: 0.13, peak: 0.04 },
      {
        kind: 'tone',
        waveform: 'sine',
        frequency: 880,
        glideTo: 660,
        glideTime: 0.14,
        offset: 0.01,
        attack: 0.012,
        decay: 0.14,
        peak: 0.025
      }
    ]
  },
  success: {
    masterGain: 0.5,
    layers: [
      { kind: 'tone', waveform: 'sine', frequency: 880, attack: 0.004, decay: 0.09, peak: 0.06 },
      { kind: 'tone', waveform: 'sine', frequency: 1108.73, offset: 0.06, attack: 0.004, decay: 0.1, peak: 0.06 },
      { kind: 'tone', waveform: 'sine', frequency: 1318.51, offset: 0.12, attack: 0.004, decay: 0.18, peak: 0.07 }
    ]
  },
  error: {
    masterGain: 0.42,
    layers: [
      { kind: 'noise', filterType: 'bandpass', filterFrequency: 850, filterQ: 1.1, attack: 0.001, decay: 0.035, peak: 0.13 },
      { kind: 'tone', waveform: 'triangle', frequency: 440, offset: 0.025, attack: 0.004, decay: 0.09, peak: 0.045 },
      { kind: 'tone', waveform: 'triangle', frequency: 349.23, offset: 0.1, attack: 0.004, decay: 0.14, peak: 0.04 }
    ]
  }
} as const satisfies Record<string, SoundRecipe>;

export type CueName = keyof typeof RECIPES;
