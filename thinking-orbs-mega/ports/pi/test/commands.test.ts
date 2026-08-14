import assert from "node:assert/strict";
import test from "node:test";
import { parseOrbsCommand } from "../src/commands.ts";

test("parses the menu and direct setting commands case-insensitively", () => {
  assert.deepEqual(parseOrbsCommand(""), { kind: "menu" });
  assert.deepEqual(parseOrbsCommand("FPS 45"), {
    kind: "update",
    patch: { fps: 45 },
    summary: "FPS: 45",
  });
  assert.deepEqual(parseOrbsCommand("appearance Light"), {
    kind: "update",
    patch: { appearance: "light" },
    summary: "Appearance: light",
  });
  assert.deepEqual(parseOrbsCommand("placement below"), {
    kind: "update",
    patch: { placement: "belowEditor" },
    summary: "Placement: below",
  });
  assert.deepEqual(parseOrbsCommand("motion REDUCED"), {
    kind: "update",
    patch: { motion: "reduced" },
    summary: "Motion: reduced",
  });
});

test("parses lifecycle, preview, and diagnostic actions", () => {
  assert.deepEqual(parseOrbsCommand("on"), {
    kind: "update",
    patch: { enabled: true },
    summary: "Enabled: on",
  });
  assert.deepEqual(parseOrbsCommand("off"), {
    kind: "update",
    patch: { enabled: false },
    summary: "Enabled: off",
  });
  assert.deepEqual(parseOrbsCommand("preview all"), {
    kind: "preview",
    target: "all",
  });
  assert.deepEqual(parseOrbsCommand("preview shaping"), {
    kind: "preview",
    target: "shaping",
  });
  assert.deepEqual(parseOrbsCommand("retry"), { kind: "retry" });
  assert.deepEqual(parseOrbsCommand("reset"), { kind: "reset" });
  assert.deepEqual(parseOrbsCommand("status"), { kind: "status" });
  assert.deepEqual(parseOrbsCommand("help"), { kind: "help" });
});

test("rejects invalid values without guessing", () => {
  const errorMessage = (args: string): string => {
    const result = parseOrbsCommand(args);
    assert.equal(result.kind, "error");
    return result.kind === "error" ? result.message : "";
  };

  assert.match(errorMessage("fps 7"), /integer from 8 to 60/);
  assert.match(errorMessage("fps 30.5"), /integer from 8 to 60/);
  assert.match(errorMessage("appearance blue"), /auto, dark, or light/);
  assert.match(errorMessage("previev all"), /Unknown command/);
  assert.match(errorMessage("status extra"), /Usage: \/orbs status/);
});
