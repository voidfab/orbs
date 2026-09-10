export {
  IDLE_SNAPSHOT,
  PHASE_LABELS,
  PRESENCE_PHASES,
  SILENT_DUPLEX,
  type DuplexChannels,
  type PresencePhase,
  type PresenceSnapshot,
  type ToolActivity,
  type ToolStatus
} from './bus/types';
export {
  IDLE_FLAGS,
  applyEvent,
  duplexFromFlags,
  flagsFromSnapshot,
  phaseFromFlags,
  reduceConversation,
  reduceEvents,
  snapshotFromFlags,
  type ConversationEvent,
  type ConversationFlags
} from './bus/reduce';
export {
  fromAgentPet,
  fromClaudeFace,
  fromHitchEvent,
  fromSeam,
  hitchEventToConversation,
  piActivityToConversation,
  toOrbState,
  voiceBusToConversation,
  type AgentPetState,
  type ClaudeFaceKey,
  type OrbPresenceState,
  type PiActivityEvent,
  type SeamLike
} from './bus/map';

export { FacePresence, type FacePresenceProps } from './face/FacePresence';
export { GhostPresence } from './face/GhostPresence';
export { toFaceState } from './face/map';
export { BotEngine } from './face/bloub/engine';
export { SEQUENCE, STATES, STATE_BY_ID, POSES, type StateId } from './face/bloub/states';
export { SHAPE_BY_ID, SHAPES, type ShapeId } from './face/bloub/skins';
export { RAYON, DEMI_VIEWBOX } from './face/bloub/repere';

export { MeterPresence } from './meter/MeterPresence';
export { meterFrame, type MeterFrame } from './meter/frame';

export { TerminalPresence } from './terminal/TerminalPresence';
export { TERMINAL_GLYPH, TERMINAL_KEYS, nearestPhase } from './terminal/palette';
export {
  OSC12_CORE,
  decodePhaseCursor,
  encodeOsc12,
  encodePhaseCursor,
  claudeHookToConversation,
  phaseFromClaudeHook,
  type ClaudeHookPayload
} from './terminal/osc';

export { GlyphPresence } from './glyph/GlyphPresence';
export { GLYPH_PATHS, glyphFor } from './glyph/icons';
export { morphD } from './glyph/morph';

export { OrbPresence } from './orb/OrbPresence';

export { IdentityPresence, type IdentityPresenceProps } from './identity/IdentityPresence';
export {
  IDENTITY_EXPRESSIONS,
  identityExpressionId,
  toIdentityExpression,
  type IdentityExpressionId
} from './identity/map';
export { blobatar } from './identity/blobatar/blobatar';
export { normalizeSeed } from './identity/blobatar/hash';

export { CssOrbPresence } from './css-orb/CssOrbPresence';
export { CSS_ORB_STATES, cssOrbSpeed, toCssOrbState, type CssOrbState } from './css-orb/map';

export { GlowPresence } from './glow/GlowPresence';
export {
  AURORA_MOODS,
  auroraPalette,
  auroraPaletteId,
  auroraSpeed,
  toAuroraMood,
  type AuroraMood
} from './glow/map';
export { AURORA_PALETTES, rgb01, type AuroraPalette, type AuroraPaletteId } from './glow/palettes';

export { EchoPresence } from './echo/EchoPresence';
export { EchoTrail, echoTau, type EchoFrame } from './echo/trail';
export { echoAlpha, paintEcho, type EchoSkin } from './echo/paint';

export { TextmodePresence } from './textmode/TextmodePresence';
export {
  TEXTMODE_RAMP,
  cellAt,
  emptyGrid,
  gridToString,
  paintTextmode,
  setCell,
  type CharacterGrid,
  type GridCell
} from './textmode/grid';
export { textmodeGrid } from './textmode/engines';
export {
  CAST_ENGINES,
  CAST_RUNE,
  autoCastEngine,
  castMoodPalette,
  castPhaseDrive,
  toCastPhase,
  type CastEngine,
  type CastPhase
} from './textmode/cast';

export { BraillePresence } from './braille/BraillePresence';
export {
  BRAILLE_BASE,
  BR_BIT,
  BrailleCanvas,
  brailleChar,
  plotLine
} from './braille/canvas';
export {
  brailleFrame,
  brailleKind,
  ledBurstRows,
  needleCanvas,
  paintBraille,
  sineRows,
  spectrumBar,
  vuRows,
  type BrailleFrame,
  type BrailleKind
} from './braille/meters';

export { PresenceHost, type AudioPolicy, type PresenceHostOptions, type PresenceListener } from './host/PresenceHost';
export { usePresenceHost } from './host/usePresenceHost';

export { DEMO_TURN, DEMO_TURN_DURATION, snapshotAt, type TimedEvent } from './conversation/script';
