import {
  visibleOrbState,
  type ActivitySnapshot,
  type OrbVisualState,
} from "./activity.ts";
import type { OrbSettings } from "./settings.ts";

export const PREVIEW_STATE_DURATION_MS = 3000;
export const PREVIEW_SEQUENCE: readonly OrbVisualState[] = [
  "listening",
  "solving",
  "searching",
  "working",
  "shaping",
  "composing",
];

export function isAgentActive(snapshot: ActivitySnapshot): boolean {
  return snapshot.agentState !== undefined || Object.keys(snapshot.activeTools).length > 0;
}

export function displayedOrbState(
  snapshot: ActivitySnapshot,
  settings: OrbSettings,
  previewState?: OrbVisualState,
): OrbVisualState | undefined {
  if (isAgentActive(snapshot)) {
    return settings.enabled ? visibleOrbState(snapshot) : undefined;
  }
  if (previewState) return previewState;
  if (!settings.enabled) return undefined;

  const state = visibleOrbState(snapshot);
  if (state === "listening" && !settings.listening) return undefined;
  return state;
}
