import type { OrbVisualState } from "./activity.ts";
import type {
  OrbAppearance,
  OrbMotion,
  OrbSettingsPatch,
} from "./settings.ts";

export type PreviewTarget = OrbVisualState | "all" | "off";

export type OrbsCommand =
  | { kind: "menu" | "help" | "status" | "retry" | "reset" }
  | { kind: "update"; patch: OrbSettingsPatch; summary: string }
  | { kind: "preview"; target: PreviewTarget }
  | { kind: "error"; message: string };

const APPEARANCES: readonly OrbAppearance[] = ["auto", "dark", "light"];
const MOTIONS: readonly OrbMotion[] = ["normal", "reduced", "static"];
const PREVIEW_TARGETS: readonly PreviewTarget[] = [
  "all",
  "off",
  "working",
  "searching",
  "solving",
  "listening",
  "composing",
  "shaping",
];

function usage(command: string): OrbsCommand {
  return { kind: "error", message: `Usage: /orbs ${command}` };
}

export function parseOrbsCommand(args: string): OrbsCommand {
  const parts = args.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { kind: "menu" };

  const [command, value, ...extra] = parts;
  if (["help", "status", "retry", "reset"].includes(command)) {
    if (value !== undefined) return usage(command);
    return { kind: command as "help" | "status" | "retry" | "reset" };
  }

  if (command === "on" || command === "off") {
    if (value !== undefined) return usage(command);
    const enabled = command === "on";
    return {
      kind: "update",
      patch: { enabled },
      summary: `Enabled: ${command}`,
    };
  }

  if (command === "fps") {
    if (value === undefined || extra.length > 0) return usage("fps <8-60>");
    const fps = Number(value);
    if (!Number.isInteger(fps) || fps < 8 || fps > 60) {
      return { kind: "error", message: "FPS must be an integer from 8 to 60." };
    }
    return { kind: "update", patch: { fps }, summary: `FPS: ${fps}` };
  }

  if (command === "appearance") {
    if (value === undefined || extra.length > 0) {
      return usage("appearance <auto|dark|light>");
    }
    if (!APPEARANCES.includes(value as OrbAppearance)) {
      return { kind: "error", message: "Appearance must be auto, dark, or light." };
    }
    const appearance = value as OrbAppearance;
    return {
      kind: "update",
      patch: { appearance },
      summary: `Appearance: ${appearance}`,
    };
  }

  if (command === "listening") {
    if (value === undefined || extra.length > 0) return usage("listening <on|off>");
    if (value !== "on" && value !== "off") {
      return { kind: "error", message: "Listening must be on or off." };
    }
    return {
      kind: "update",
      patch: { listening: value === "on" },
      summary: `Listening: ${value}`,
    };
  }

  if (command === "placement") {
    if (value === undefined || extra.length > 0) return usage("placement <above|below>");
    if (value !== "above" && value !== "below") {
      return { kind: "error", message: "Placement must be above or below." };
    }
    return {
      kind: "update",
      patch: { placement: value === "above" ? "aboveEditor" : "belowEditor" },
      summary: `Placement: ${value}`,
    };
  }

  if (command === "motion") {
    if (value === undefined || extra.length > 0) {
      return usage("motion <normal|reduced|static>");
    }
    if (!MOTIONS.includes(value as OrbMotion)) {
      return { kind: "error", message: "Motion must be normal, reduced, or static." };
    }
    const motion = value as OrbMotion;
    return { kind: "update", patch: { motion }, summary: `Motion: ${motion}` };
  }

  if (command === "preview") {
    if (value === undefined || extra.length > 0) return usage("preview <all|state|off>");
    if (!PREVIEW_TARGETS.includes(value as PreviewTarget)) {
      return { kind: "error", message: "Preview must be all, off, or a valid Orb state." };
    }
    return { kind: "preview", target: value as PreviewTarget };
  }

  return {
    kind: "error",
    message: `Unknown command: ${command}. Run /orbs help for usage.`,
  };
}
