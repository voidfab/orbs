export type OrbVisualState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "composing"
  | "shaping";

export interface ActivitySnapshot {
  editorHasText: boolean;
  agentState?: "solving" | "composing";
  activeTools: Readonly<Record<string, OrbVisualState>>;
}

export type ActivityEvent =
  | {
      type: "editor_content_changed";
      hasText: boolean;
    }
  | { type: "agent_started" }
  | { type: "assistant_text_started" }
  | { type: "tool_started"; id: string; toolName: string }
  | { type: "tool_finished"; id: string }
  | { type: "agent_settled" };

export function createActivitySnapshot(): ActivitySnapshot {
  return { editorHasText: false, activeTools: {} };
}

export function reduceActivity(
  snapshot: ActivitySnapshot,
  event: ActivityEvent,
): ActivitySnapshot {
  switch (event.type) {
    case "editor_content_changed":
      return { ...snapshot, editorHasText: event.hasText };
    case "agent_started":
      return { ...snapshot, agentState: "solving" };
    case "assistant_text_started":
      return { ...snapshot, agentState: "composing" };
    case "tool_started":
      return {
        ...snapshot,
        activeTools: {
          ...snapshot.activeTools,
          [event.id]: classifyTool(event.toolName),
        },
      };
    case "tool_finished": {
      const { [event.id]: _finishedTool, ...activeTools } = snapshot.activeTools;
      return { ...snapshot, activeTools };
    }
    case "agent_settled": {
      const { agentState: _agentState, ...idleSnapshot } = snapshot;
      return { ...idleSnapshot, activeTools: {} };
    }
  }
}

export function classifyTool(toolName: string): OrbVisualState {
  const normalizedName = toolName.toLowerCase();
  if (["edit", "write", "apply_patch"].includes(normalizedName)) return "shaping";
  if (
    ["read", "web_search", "web_fetch", "grep", "find", "glob", "ls"].includes(
      normalizedName,
    )
  ) {
    return "searching";
  }
  return "working";
}

const TOOL_PRIORITY: Readonly<Record<OrbVisualState, number>> = {
  listening: 0,
  solving: 0,
  composing: 0,
  searching: 1,
  working: 2,
  shaping: 3,
};

export function visibleOrbState(snapshot: ActivitySnapshot): OrbVisualState | undefined {
  const activeToolState = Object.values(snapshot.activeTools).sort(
    (left, right) => TOOL_PRIORITY[right] - TOOL_PRIORITY[left],
  )[0];
  return activeToolState ?? snapshot.agentState ?? (snapshot.editorHasText ? "listening" : undefined);
}
