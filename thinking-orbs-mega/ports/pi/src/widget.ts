import {
  allocateImageId,
  Image,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";
import type { OrbVisualState } from "./activity.ts";
import type { RenderedOrbFrame } from "./renderer.ts";

const IMAGE_WIDTH_CELLS = 6;
const IMAGE_HEIGHT_CELLS = 4;
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface AnimatedOrbWidget extends Component {
  setState(state: OrbVisualState): void;
  tick(timeSeconds: number): void;
}

export type RenderOrbFrame = (
  state: OrbVisualState,
  timeSeconds: number,
  dark: boolean,
) => RenderedOrbFrame;

export class OrbImageWidget implements AnimatedOrbWidget {
  private readonly imageId = allocateImageId();
  private readonly tui: TUI;
  private readonly fallbackColor: (text: string) => string;
  private readonly renderFrame: RenderOrbFrame;
  private readonly onRenderError?: (error: Error) => void;
  private state: OrbVisualState;
  private dark: boolean;
  private timeSeconds = 0;
  private dirty = true;
  private renderFailed = false;
  private cachedWidth = -1;
  private cachedLines: string[] = [];

  constructor(
    tui: TUI,
    fallbackColor: (text: string) => string,
    initialState: OrbVisualState,
    renderFrame: RenderOrbFrame,
    dark: boolean,
    onRenderError?: (error: Error) => void,
  ) {
    this.tui = tui;
    this.fallbackColor = fallbackColor;
    this.state = initialState;
    this.renderFrame = renderFrame;
    this.dark = dark;
    this.onRenderError = onRenderError;
  }

  setAppearance(dark: boolean): void {
    if (dark === this.dark) return;
    this.dark = dark;
    this.dirty = true;
    this.tui.requestRender();
  }

  setState(state: OrbVisualState): void {
    if (state === this.state) return;
    this.state = state;
    this.dirty = true;
    this.tui.requestRender();
  }

  tick(timeSeconds: number): void {
    this.timeSeconds = timeSeconds;
    this.dirty = true;
    this.tui.requestRender();
  }

  invalidate(): void {
    this.dirty = true;
  }

  private renderFailure(width: number): string[] {
    const message = Array.from("Orb renderer unavailable")
      .slice(0, Math.max(0, width))
      .join("");
    return [this.fallbackColor(message)];
  }

  render(width: number): string[] {
    if (this.renderFailed) return this.renderFailure(width);
    if (!this.dirty && width === this.cachedWidth) return this.cachedLines;

    try {
      const frame = this.renderFrame(this.state, this.timeSeconds, this.dark);
      const image = new Image(
        frame.base64,
        "image/png",
        { fallbackColor: this.fallbackColor },
        {
          maxWidthCells: IMAGE_WIDTH_CELLS,
          maxHeightCells: IMAGE_HEIGHT_CELLS,
          imageId: this.imageId,
        },
        { widthPx: frame.widthPx, heightPx: frame.heightPx },
      );

      this.cachedLines = image.render(width);
      this.cachedWidth = width;
      this.dirty = false;
      return this.cachedLines;
    } catch (error) {
      this.renderFailed = true;
      const renderError = error instanceof Error ? error : new Error(String(error));
      this.onRenderError?.(renderError);
      return this.renderFailure(width);
    }
  }
}

export class OrbSpinnerWidget implements AnimatedOrbWidget {
  private readonly tui: TUI;
  private readonly color: (text: string) => string;
  private state: OrbVisualState;
  private frameIndex = 0;

  constructor(
    tui: TUI,
    color: (text: string) => string,
    initialState: OrbVisualState,
  ) {
    this.tui = tui;
    this.color = color;
    this.state = initialState;
  }

  setState(state: OrbVisualState): void {
    this.state = state;
    this.tui.requestRender();
  }

  tick(timeSeconds: number): void {
    this.frameIndex = Math.floor(timeSeconds * 10) % SPINNER_FRAMES.length;
    this.tui.requestRender();
  }

  invalidate(): void {}

  render(width: number): string[] {
    const label = `${SPINNER_FRAMES[this.frameIndex]} ${this.state}`;
    const visibleLabel = Array.from(label).slice(0, Math.max(0, width)).join("");
    return [this.color(visibleLabel)];
  }
}
