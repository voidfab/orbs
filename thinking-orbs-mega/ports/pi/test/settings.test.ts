import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_ORB_SETTINGS,
  effectiveImageFps,
  getSettingsPath,
  loadSettings,
  mergeAndSaveSettings,
  resolveDarkAppearance,
  validateSettings,
} from "../src/settings.ts";

test("uses a versioned global settings path and stable defaults", () => {
  assert.equal(
    getSettingsPath({ PI_CODING_AGENT_DIR: "/custom/pi" }, "/home/user"),
    join("/custom/pi", "thinking-orbs.json"),
  );
  assert.equal(
    getSettingsPath({}, "/home/user"),
    join("/home/user", ".pi", "agent", "thinking-orbs.json"),
  );
  assert.deepEqual(DEFAULT_ORB_SETTINGS, {
    version: 1,
    enabled: true,
    fps: 30,
    appearance: "auto",
    listening: true,
    placement: "aboveEditor",
    motion: "normal",
  });
});

test("fills omitted settings while rejecting unknown and invalid fields", () => {
  assert.deepEqual(validateSettings({ version: 1, fps: 45 }), {
    ...DEFAULT_ORB_SETTINGS,
    fps: 45,
  });
  assert.throws(
    () => validateSettings({ version: 1, fps: 61 }),
    /fps must be an integer from 8 to 60/,
  );
  assert.throws(
    () => validateSettings({ version: 1, colour: "dark" }),
    /unknown setting: colour/,
  );
  assert.throws(
    () => validateSettings({ version: 2 }),
    /unsupported settings version: 2/,
  );
});

test("keeps invalid configuration content untouched", async () => {
  const directory = await mkdtemp(join(tmpdir(), "thinking-orbs-settings-"));
  const path = join(directory, "thinking-orbs.json");
  const invalidContent = "{ not-json";
  await writeFile(path, invalidContent);

  try {
    const result = await loadSettings(path);
    assert.equal(result.status, "invalid");
    assert.deepEqual(result.settings, DEFAULT_ORB_SETTINGS);
    assert.equal(await readFile(path, "utf8"), invalidContent);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("merges the latest on-disk settings before an atomic update", async () => {
  const directory = await mkdtemp(join(tmpdir(), "thinking-orbs-settings-"));
  const path = join(directory, "thinking-orbs.json");

  try {
    await mergeAndSaveSettings(path, { fps: 45 });
    const result = await mergeAndSaveSettings(path, { appearance: "light" });

    assert.equal(result.previous.fps, 45);
    assert.deepEqual(result.settings, {
      ...DEFAULT_ORB_SETTINGS,
      fps: 45,
      appearance: "light",
    });
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), result.settings);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("resolves effective motion and appearance without mutating configured FPS", () => {
  assert.equal(effectiveImageFps({ ...DEFAULT_ORB_SETTINGS, fps: 45 }), 45);
  assert.equal(
    effectiveImageFps({ ...DEFAULT_ORB_SETTINGS, fps: 45, motion: "reduced" }),
    12,
  );
  assert.equal(
    effectiveImageFps({ ...DEFAULT_ORB_SETTINGS, motion: "static" }),
    undefined,
  );

  assert.equal(resolveDarkAppearance("dark", "0;15"), true);
  assert.equal(resolveDarkAppearance("light", "15;0"), false);
  assert.equal(resolveDarkAppearance("auto", "15;0"), true);
  assert.equal(resolveDarkAppearance("auto", "0;15"), false);
  assert.equal(resolveDarkAppearance("auto", undefined), true);
});
