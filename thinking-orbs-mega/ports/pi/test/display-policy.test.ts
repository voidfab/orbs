import assert from "node:assert/strict";
import test from "node:test";
import { createActivitySnapshot, reduceActivity } from "../src/activity.ts";
import {
  PREVIEW_SEQUENCE,
  PREVIEW_STATE_DURATION_MS,
  displayedOrbState,
  isAgentActive,
} from "../src/display-policy.ts";
import { DEFAULT_ORB_SETTINGS } from "../src/settings.ts";

test("preview uses the agreed workflow order and three-second duration", () => {
  assert.deepEqual(PREVIEW_SEQUENCE, [
    "listening",
    "solving",
    "searching",
    "working",
    "shaping",
    "composing",
  ]);
  assert.equal(PREVIEW_STATE_DURATION_MS, 3000);
});

test("preview can show while disabled but never replaces real agent activity", () => {
  const idle = createActivitySnapshot();
  const disabled = { ...DEFAULT_ORB_SETTINGS, enabled: false };
  assert.equal(displayedOrbState(idle, disabled), undefined);
  assert.equal(displayedOrbState(idle, disabled, "shaping"), "shaping");

  const solving = reduceActivity(idle, { type: "agent_started" });
  assert.equal(isAgentActive(solving), true);
  assert.equal(displayedOrbState(solving, DEFAULT_ORB_SETTINGS), "solving");
  assert.equal(
    displayedOrbState(solving, DEFAULT_ORB_SETTINGS, "shaping"),
    "solving",
  );
  assert.equal(displayedOrbState(solving, disabled, "shaping"), undefined);
});

test("listening can be disabled without affecting other states", () => {
  const typing = reduceActivity(createActivitySnapshot(), {
    type: "editor_content_changed",
    hasText: true,
  });
  const settings = { ...DEFAULT_ORB_SETTINGS, listening: false };
  assert.equal(displayedOrbState(typing, settings), undefined);

  const solving = reduceActivity(typing, { type: "agent_started" });
  assert.equal(displayedOrbState(solving, settings), "solving");
});
