import { createCanvas } from "@napi-rs/canvas";
import { MODE_DRAWS, resolvePreset } from "thinking-orbs";
import type { OrbVisualState } from "./activity.ts";
import { DEFAULT_ORB_CONFIG } from "./render-policy.ts";

const ORB_SIZE_PX = DEFAULT_ORB_CONFIG.size;

export interface RenderedOrbFrame {
  base64: string;
  widthPx: number;
  heightPx: number;
}

export function renderOrbFrame(
  state: OrbVisualState,
  timeSeconds: number,
  dark: boolean,
): RenderedOrbFrame {
  const canvas = createCanvas(ORB_SIZE_PX, ORB_SIZE_PX);
  const context = canvas.getContext("2d");
  const { mode, speed, opts } = resolvePreset(state, ORB_SIZE_PX);

  MODE_DRAWS[mode](
    context as unknown as CanvasRenderingContext2D,
    ORB_SIZE_PX,
    timeSeconds * speed,
    dark,
    opts,
  );

  return {
    base64: canvas.toBuffer("image/png").toString("base64"),
    widthPx: ORB_SIZE_PX,
    heightPx: ORB_SIZE_PX,
  };
}
