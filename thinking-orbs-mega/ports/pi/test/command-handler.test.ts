import assert from "node:assert/strict";
import test from "node:test";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import {
  registerOrbsCommand,
  type OrbsCommandRuntime,
} from "../src/command-handler.ts";
import { DEFAULT_ORB_SETTINGS, type OrbSettings } from "../src/settings.ts";

function createHarness(selections: string[] = []) {
  let handler:
    | ((args: string, ctx: ExtensionCommandContext) => Promise<void>)
    | undefined;
  let settings: OrbSettings = { ...DEFAULT_ORB_SETTINGS };
  const updates: string[] = [];
  const notifications: Array<{ message: string; type?: string }> = [];

  const runtime: OrbsCommandRuntime = {
    getSettings: () => settings,
    updateSettings: async (patch, summary) => {
      settings = { ...settings, ...patch };
      updates.push(summary);
    },
    preview: async () => {},
    retryRenderer: async () => {},
    resetSettings: async () => {},
    status: () => "status output",
  };
  const pi = {
    registerCommand(_name: string, options: { handler: typeof handler }) {
      handler = options.handler;
    },
  } as unknown as ExtensionAPI;
  const ctx = {
    mode: "tui",
    ui: {
      select: async () => selections.shift(),
      input: async () => undefined,
      notify(message: string, type?: string) {
        notifications.push({ message, type });
      },
    },
  } as unknown as ExtensionCommandContext;

  registerOrbsCommand(pi, runtime);
  const registeredHandler = handler;
  assert.ok(registeredHandler);
  return {
    run: (args: string) => registeredHandler(args, ctx),
    getSettings: () => settings,
    updates,
    notifications,
  };
}

test("direct commands use the shared runtime update path", async () => {
  const harness = createHarness();
  await harness.run("fps 45");

  assert.equal(harness.getSettings().fps, 45);
  assert.deepEqual(harness.updates, ["FPS: 45"]);
});

test("interactive menu uses the same parser and update path", async () => {
  const harness = createHarness(["FPS: 30", "45", "Close"]);
  await harness.run("");

  assert.equal(harness.getSettings().fps, 45);
  assert.deepEqual(harness.updates, ["FPS: 45"]);
});

test("invalid commands are reported without changing settings", async () => {
  const harness = createHarness();
  await harness.run("fps 100");

  assert.equal(harness.getSettings().fps, 30);
  assert.match(harness.notifications[0].message, /integer from 8 to 60/);
  assert.equal(harness.notifications[0].type, "error");
});
