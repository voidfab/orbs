/**
 * Conversation Seam — dual-channel field for Fox9's STT → Brain → TTS turn.
 *
 * Two domains, independent buses:
 *   Internal  — Channel In  (mic / STT)  — orb / helix / cube
 *   External  — Channel Out (speakers / TTS) — globe (v1) or closed trefoil (v2)
 *
 * Phase still names the turn. Acoustic energy does not cross the seam.
 */

export type SeamPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * Layout, not a paint tint.
 *   conduit — orb inside, bipolar field / compact knot
 *   halo    — helix inside a wider hollow wrap
 *   well    — cube inside; cursor folds the field
 */
export type SeamVariant = 'halo' | 'conduit' | 'well';

export type SeamInternal = 'orb' | 'helix' | 'cube';

/** 1 = globe field. 2 = closed trefoil + internal core. */
export type SeamGeneration = 1 | 2;

export interface SeamDrivers {
  phase: SeamPhase;
  /** User / STT amplitude, 0–1. Internal domain only. */
  inputVolume: number;
  /** Agent / TTS amplitude, 0–1. External domain only. */
  outputVolume: number;
  /** Optional VAD / endpointing 0–1 (internal listen). */
  vad?: number;
}

export function internalForVariant(variant: SeamVariant): SeamInternal {
  if (variant === 'halo') return 'helix';
  if (variant === 'well') return 'cube';
  return 'orb';
}

export function seamPhaseFromFox9(
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'talking' | 'processing' | null | undefined
): SeamPhase {
  if (state === 'listening') return 'listening';
  if (state === 'thinking' || state === 'processing') return 'thinking';
  if (state === 'speaking' || state === 'talking') return 'speaking';
  return 'idle';
}
