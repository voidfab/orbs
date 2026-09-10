import assert from "node:assert/strict";
import test from "node:test";
import { PresenceHost, pushPiActivity } from "presence/host";

test("Pi activity events drive a PresenceHost snapshot", () => {
  const host = new PresenceHost({ audio: "off" });
  pushPiActivity(host, { type: "agent_started" });
  assert.equal(host.snapshot.phase, "thinking");
  pushPiActivity(host, { type: "tool_started", id: "1", toolName: "Bash" });
  assert.equal(host.snapshot.phase, "working");
  assert.equal(host.snapshot.tool?.name, "Bash");
  pushPiActivity(host, { type: "assistant_text_started" });
  assert.equal(host.snapshot.phase, "speaking");
  pushPiActivity(host, { type: "agent_settled" });
  assert.equal(host.snapshot.phase, "done");
});
