export const DEFAULT_ORB_CONFIG = {
  size: 64,
  editorPollMs: 100,
} as const;

export type OrbRenderMode = "image" | "spinner" | "off";

export interface RenderCapabilities {
  interactive: boolean;
  imageProtocol?: "kitty" | "iterm2" | null;
}

export function chooseRenderMode(capabilities: RenderCapabilities): OrbRenderMode {
  if (!capabilities.interactive) return "off";
  return capabilities.imageProtocol ? "image" : "spinner";
}
