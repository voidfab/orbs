/**
 * Node-safe PresenceHost surface (no React painters).
 * Pi and Hermes import this path so they can drive the bus without
 * pulling Face/Ghost/CSS into a terminal or plugin bundle.
 */
export {
  PresenceHost,
  type AudioPolicy,
  type PresenceHostOptions,
  type PresenceListener
} from './PresenceHost.ts';
export {
  piActivityToConversation,
  toOrbState,
  voiceBusToConversation,
  type OrbPresenceState,
  type PiActivityEvent
} from '../bus/map.ts';
export { applyEvent, type ConversationEvent } from '../bus/reduce.ts';
export {
  IDLE_SNAPSHOT,
  type PresencePhase,
  type PresenceSnapshot
} from '../bus/types.ts';
export { pushHermesGateway, pushPiActivity, pushVoiceBus } from './drive.ts';
