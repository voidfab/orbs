import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import type { OrbSettings, OrbSettingsPatch } from "./settings.ts";
import {
  parseOrbsCommand,
  type OrbsCommand,
  type PreviewTarget,
} from "./commands.ts";

export interface OrbsCommandRuntime {
  getSettings(): OrbSettings;
  updateSettings(
    patch: OrbSettingsPatch,
    summary: string,
    ctx: ExtensionCommandContext,
  ): Promise<void>;
  preview(target: PreviewTarget, ctx: ExtensionCommandContext): Promise<void>;
  retryRenderer(ctx: ExtensionCommandContext): Promise<void>;
  resetSettings(ctx: ExtensionCommandContext): Promise<void>;
  status(): string;
}

export const ORBS_HELP = [
  "/orbs                                Open settings",
  "/orbs status                         Show diagnostics",
  "/orbs on | off                       Enable or disable Orbs",
  "/orbs fps <8-60>                     Set image animation FPS",
  "/orbs appearance <auto|dark|light>   Set terminal appearance",
  "/orbs listening <on|off>             Toggle typing animation",
  "/orbs placement <above|below>        Move the widget",
  "/orbs motion <normal|reduced|static> Set motion mode",
  "/orbs preview <all|state|off>        Preview Orb states",
  "/orbs retry                          Retry the image renderer",
  "/orbs reset                          Restore defaults",
  "/orbs help                           Show this help",
].join("\n");

async function executeCommand(
  command: OrbsCommand,
  ctx: ExtensionCommandContext,
  runtime: OrbsCommandRuntime,
): Promise<void> {
  switch (command.kind) {
    case "menu":
      await openSettingsMenu(ctx, runtime);
      return;
    case "help":
      ctx.ui.notify(ORBS_HELP, "info");
      return;
    case "status":
      ctx.ui.notify(runtime.status(), "info");
      return;
    case "retry":
      await runtime.retryRenderer(ctx);
      return;
    case "reset":
      await runtime.resetSettings(ctx);
      return;
    case "update":
      await runtime.updateSettings(command.patch, command.summary, ctx);
      return;
    case "preview":
      await runtime.preview(command.target, ctx);
      return;
    case "error":
      ctx.ui.notify(command.message, "error");
      return;
  }
}

async function selectAndExecute(
  title: string,
  options: string[],
  toCommand: (selection: string) => string,
  ctx: ExtensionCommandContext,
  runtime: OrbsCommandRuntime,
): Promise<void> {
  const selection = await ctx.ui.select(title, options);
  if (selection !== undefined) {
    await executeCommand(parseOrbsCommand(toCommand(selection)), ctx, runtime);
  }
}

async function openPreviewMenu(
  ctx: ExtensionCommandContext,
  runtime: OrbsCommandRuntime,
): Promise<void> {
  const options = [
    "All states",
    "Listening",
    "Solving",
    "Searching",
    "Working",
    "Shaping",
    "Composing",
    "Stop preview",
  ];
  await selectAndExecute(
    "Preview",
    options,
    (selection) => {
      if (selection === "All states") return "preview all";
      if (selection === "Stop preview") return "preview off";
      return `preview ${selection.toLowerCase()}`;
    },
    ctx,
    runtime,
  );
}

async function openSettingsMenu(
  ctx: ExtensionCommandContext,
  runtime: OrbsCommandRuntime,
): Promise<void> {
  for (;;) {
    const settings = runtime.getSettings();
    const choice = await ctx.ui.select("Thinking Orbs", [
      `Enabled: ${settings.enabled ? "on" : "off"}`,
      `FPS: ${settings.fps}`,
      `Appearance: ${settings.appearance}`,
      `Listening: ${settings.listening ? "on" : "off"}`,
      `Placement: ${settings.placement === "aboveEditor" ? "above" : "below"}`,
      `Motion: ${settings.motion}`,
      "Preview",
      "Status",
      "Retry renderer",
      "Reset",
      "Close",
    ]);

    if (choice === undefined || choice === "Close") return;

    if (choice.startsWith("Enabled:")) {
      await executeCommand(parseOrbsCommand(settings.enabled ? "off" : "on"), ctx, runtime);
    } else if (choice.startsWith("FPS:")) {
      const selection = await ctx.ui.select("FPS", ["8", "12", "24", "30", "45", "60", "Custom"]);
      if (selection === "Custom") {
        const custom = await ctx.ui.input("FPS", "Integer from 8 to 60");
        if (custom !== undefined) {
          await executeCommand(parseOrbsCommand(`fps ${custom}`), ctx, runtime);
        }
      } else if (selection !== undefined) {
        await executeCommand(parseOrbsCommand(`fps ${selection}`), ctx, runtime);
      }
    } else if (choice.startsWith("Appearance:")) {
      await selectAndExecute(
        "Appearance",
        ["auto", "dark", "light"],
        (selection) => `appearance ${selection}`,
        ctx,
        runtime,
      );
    } else if (choice.startsWith("Listening:")) {
      await executeCommand(
        parseOrbsCommand(`listening ${settings.listening ? "off" : "on"}`),
        ctx,
        runtime,
      );
    } else if (choice.startsWith("Placement:")) {
      await selectAndExecute(
        "Placement",
        ["above", "below"],
        (selection) => `placement ${selection}`,
        ctx,
        runtime,
      );
    } else if (choice.startsWith("Motion:")) {
      await selectAndExecute(
        "Motion",
        ["normal", "reduced", "static"],
        (selection) => `motion ${selection}`,
        ctx,
        runtime,
      );
    } else if (choice === "Preview") {
      await openPreviewMenu(ctx, runtime);
    } else if (choice === "Status") {
      await executeCommand({ kind: "status" }, ctx, runtime);
    } else if (choice === "Retry renderer") {
      await executeCommand({ kind: "retry" }, ctx, runtime);
    } else if (choice === "Reset") {
      await executeCommand({ kind: "reset" }, ctx, runtime);
    }
  }
}

export function registerOrbsCommand(
  pi: ExtensionAPI,
  runtime: OrbsCommandRuntime,
): void {
  pi.registerCommand("orbs", {
    description: "Configure and preview Thinking Orbs",
    handler: async (args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/orbs requires interactive mode", "error");
        return;
      }
      await executeCommand(parseOrbsCommand(args), ctx, runtime);
    },
  });
}
