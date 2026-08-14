import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTool,
  createActivitySnapshot,
  reduceActivity,
  visibleOrbState,
} from "../src/activity.ts";

test("shows listening only while the idle editor contains text", () => {
  const idle = createActivitySnapshot();
  assert.equal(visibleOrbState(idle), undefined);

  const typing = reduceActivity(idle, {
    type: "editor_content_changed",
    hasText: true,
  });
  assert.equal(visibleOrbState(typing), "listening");

  const cleared = reduceActivity(typing, {
    type: "editor_content_changed",
    hasText: false,
  });
  assert.equal(visibleOrbState(cleared), undefined);
});

test("moves through solving and composing, then returns to the editor state", () => {
  const typing = reduceActivity(createActivitySnapshot(), {
    type: "editor_content_changed",
    hasText: true,
  });
  const solving = reduceActivity(typing, { type: "agent_started" });
  assert.equal(visibleOrbState(solving), "solving");

  const composing = reduceActivity(solving, { type: "assistant_text_started" });
  assert.equal(visibleOrbState(composing), "composing");

  const settled = reduceActivity(composing, { type: "agent_settled" });
  assert.equal(visibleOrbState(settled), "listening");
});

test("classifies search, work, and shaping tool families", () => {
  assert.equal(classifyTool("read"), "searching");
  assert.equal(classifyTool("web_search"), "searching");
  assert.equal(classifyTool("bash"), "working");
  assert.equal(classifyTool("custom_tool"), "working");
  assert.equal(classifyTool("edit"), "shaping");
  assert.equal(classifyTool("write"), "shaping");
  assert.equal(classifyTool("apply_patch"), "shaping");
});

test("restores the highest-priority parallel activity when a tool finishes", () => {
  const composing = reduceActivity(
    reduceActivity(createActivitySnapshot(), { type: "agent_started" }),
    { type: "assistant_text_started" },
  );
  const searching = reduceActivity(composing, {
    type: "tool_started",
    id: "read-1",
    toolName: "read",
  });
  assert.equal(visibleOrbState(searching), "searching");

  const shaping = reduceActivity(searching, {
    type: "tool_started",
    id: "edit-1",
    toolName: "edit",
  });
  assert.equal(visibleOrbState(shaping), "shaping");

  const restoredSearch = reduceActivity(shaping, {
    type: "tool_finished",
    id: "edit-1",
  });
  assert.equal(visibleOrbState(restoredSearch), "searching");

  const restoredCompose = reduceActivity(restoredSearch, {
    type: "tool_finished",
    id: "read-1",
  });
  assert.equal(visibleOrbState(restoredCompose), "composing");
});
