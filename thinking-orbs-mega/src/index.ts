export { ThinkingCube, ThinkingOrb } from './ThinkingOrb';
export type {
  OrbShape,
  OrbSize,
  OrbState,
  OrbTheme,
  OrbVariant,
  Palette,
  PaletteName,
  Ramp,
  Stop,
  ThinkingOrbProps,
  TransitionKind
} from './types';
export { SIZE_PRESETS } from './types';
export {
  MAX_SIZE,
  MIN_SIZE,
  ORIGINAL_STATES,
  ORB_STATES,
  PRESETS_128,
  PROGRESS_MODES,
  resolvePreset,
  STATE_TO_MODE,
  type ModeKey,
  type OfficialMode,
  type Resolved
} from './presets';
export { MODE_DRAWS, MODE_FRAMES } from './engine/registry';
export { CONTOUR_DRAWS, setContourTint } from './engine/contour';
export type { Dot, Line, ModeDraw, ModeFrame, OrbFrame } from './engine/types';
export { finalizeFrame, paintFrame } from './engine/core';
export { applyVolume, frameToSvg } from './render/svg';
export {
  A_LEVELS,
  getLut,
  L_LEVELS,
  PALETTE_NAMES,
  PALETTES,
  paletteFromCss,
  registerPalette
} from './color';
export { CUBE_VERBS, isCubeVerb, resolveCubePreset } from './cube-presets';
export { STATE_LABELS } from './labels';
export { sharedClock, subscribe as subscribeFrames } from './driver';
export { ConversationSeam, seamPhaseFromFox9 } from './seam/ConversationSeam';
export type { ConversationSeamProps } from './seam/ConversationSeam';
export { internalForVariant } from './seam/types';
export type { SeamGeneration, SeamInternal, SeamPhase, SeamVariant } from './seam/types';
export { SeamField } from './seam/field';
export { SeamAudio, analyseTimeDomain, levelFromRms, speechRmsWindow, speechSample, vadFromLevel } from './seam/audio';
export type { AudioLevels, AudioStatus, OutputTap } from './seam/audio';
export { useSeamAudio } from './seam/useSeamAudio';
export { domainEnergy, torusKnot, torusKnotFitted, torusKnotRail, v2Topology, variantLayout, waveDisplace, wrapPi, wrapTau } from './seam/knot';
export type { PhaseWeights, Topology, VariantLayout } from './seam/knot';
export {
  ANALYSIS_SOURCES,
  KNOB_META,
  LOCKED_CAMERA,
  SILENT_BUS,
  clampKnob,
  defaultKnobs,
  knobRange,
  knobsFromPhase,
  railCount,
  readAnalysis,
  resolveKnobs
} from './seam/knobs';
export type { AnalysisSource, BusAnalysis, KnobKey, SeamBindings, SeamKnobs } from './seam/knobs';
