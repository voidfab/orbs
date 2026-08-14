import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getCapabilities } from "@earendil-works/pi-tui";
import packageMetadata from "./package.json" with { type: "json" };
import {
  createActivitySnapshot,
  reduceActivity,
  type ActivityEvent,
  type ActivitySnapshot,
  type OrbVisualState,
} from "./src/activity.ts";
import {
  registerOrbsCommand,
  type OrbsCommandRuntime,
} from "./src/command-handler.ts";
import type { PreviewTarget } from "./src/commands.ts";
import {
  displayedOrbState,
  isAgentActive,
  PREVIEW_SEQUENCE,
  PREVIEW_STATE_DURATION_MS,
} from "./src/display-policy.ts";
import {
  chooseRenderMode,
  DEFAULT_ORB_CONFIG,
  type OrbRenderMode,
} from "./src/render-policy.ts";
import {
  DEFAULT_ORB_SETTINGS,
  effectiveImageFps,
  getSettingsPath,
  InvalidSettingsFileError,
  loadSettings,
  mergeAndSaveSettings,
  resolveDarkAppearance,
  saveSettings,
  type OrbSettings,
  type OrbSettingsPatch,
} from "./src/settings.ts";
import {
  OrbImageWidget,
  OrbSpinnerWidget,
  type AnimatedOrbWidget,
  type RenderOrbFrame,
} from "./src/widget.ts";

const WIDGET_ID = "thinking-orbs";
const HIDDEN_WORKING_INDICATOR = { frames: [] };
const STATIC_FRAME_SECONDS = 1.25;
const EXTENSION_VERSION = packageMetadata.version;
const THINKING_ORBS_VERSION = "0.4.0";

type ImageProtocol = "kitty" | "iterm2" | null;
type RendererStatus = "not attempted" | "available" | "unavailable";
type ConfigurationStatus = "missing" | "valid" | "invalid";

function settingsEqual(left: OrbSettings, right: OrbSettings): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function thinkingOrbsExtension(pi: ExtensionAPI): void {
  let activity: ActivitySnapshot = createActivitySnapshot();
  let settings: OrbSettings = { ...DEFAULT_ORB_SETTINGS };
  let renderMode: OrbRenderMode = "off";
  let imageProtocol: ImageProtocol = null;
  let renderFrame: RenderOrbFrame | undefined;
  let rendererStatus: RendererStatus = "not attempted";
  let rendererError: string | undefined;
  let rendererWarningShown = false;
  let configurationStatus: ConfigurationStatus = "missing";
  let configurationError: string | undefined;
  let widget: AnimatedOrbWidget | undefined;
  let animationTimer: ReturnType<typeof setInterval> | undefined;
  let editorPollTimer: ReturnType<typeof setInterval> | undefined;
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let animationStartedAt: number | undefined;
  let previewState: OrbVisualState | undefined;
  let sessionActive = false;
  const settingsPath = getSettingsPath();

  function clearAnimationTimer(): void {
    if (animationTimer) clearInterval(animationTimer);
    animationTimer = undefined;
  }

  function unmountWidget(ctx: ExtensionContext, resetTimeline: boolean): void {
    clearAnimationTimer();
    widget = undefined;
    ctx.ui.setWidget(WIDGET_ID, undefined);
    if (resetTimeline) animationStartedAt = undefined;
  }

  function updateWorkingIndicator(ctx: ExtensionContext): void {
    ctx.ui.setWorkingIndicator(
      settings.enabled || previewState ? HIDDEN_WORKING_INDICATOR : undefined,
    );
  }

  function currentTimeSeconds(): number {
    if (settings.motion === "static") return STATIC_FRAME_SECONDS;
    if (animationStartedAt === undefined) animationStartedAt = performance.now();
    return (performance.now() - animationStartedAt) / 1000;
  }

  function frameIntervalMs(): number | undefined {
    if (settings.motion === "static") return undefined;
    if (renderMode === "image") {
      const fps = effectiveImageFps(settings);
      return fps === undefined ? undefined : 1000 / fps;
    }
    return 100;
  }

  function reportRendererFailure(error: Error, ctx: ExtensionContext): void {
    if (!sessionActive || renderMode !== "image") return;
    rendererStatus = "unavailable";
    rendererError = error.message;
    renderFrame = undefined;
    renderMode = "spinner";
    if (!rendererWarningShown) {
      rendererWarningShown = true;
      ctx.ui.notify(
        `Thinking Orbs image renderer failed; using spinner. ${error.message}`,
        "warning",
      );
    }
    rebuildWidget(ctx, false);
  }

  function mountWidget(ctx: ExtensionContext, resetTimeline: boolean): void {
    const state = displayedOrbState(activity, settings, previewState);
    if (!state || renderMode === "off") return;

    if (resetTimeline || settings.motion === "static") {
      animationStartedAt = settings.motion === "static" ? undefined : performance.now();
    } else if (animationStartedAt === undefined) {
      animationStartedAt = performance.now();
    }

    const dark = resolveDarkAppearance(settings.appearance, process.env.COLORFGBG);
    ctx.ui.setWidget(
      WIDGET_ID,
      (tui, theme) => {
        widget =
          renderMode === "image" && renderFrame
            ? new OrbImageWidget(
                tui,
                (text) => theme.fg("dim", text),
                state,
                renderFrame,
                dark,
                (error) => queueMicrotask(() => reportRendererFailure(error, ctx)),
              )
            : new OrbSpinnerWidget(
                tui,
                (text) => theme.fg("accent", text),
                state,
              );
        widget.tick(currentTimeSeconds());
        return widget;
      },
      { placement: settings.placement },
    );

    const intervalMs = frameIntervalMs();
    if (intervalMs !== undefined) {
      animationTimer = setInterval(() => {
        widget?.tick(currentTimeSeconds());
      }, intervalMs);
    }
  }

  function rebuildWidget(ctx: ExtensionContext, resetTimeline: boolean): void {
    const hadTimeline = animationStartedAt;
    unmountWidget(ctx, resetTimeline);
    if (!resetTimeline && settings.motion !== "static") {
      animationStartedAt = hadTimeline;
    }
    mountWidget(ctx, resetTimeline);
  }

  function reconcile(ctx: ExtensionContext): void {
    const state = displayedOrbState(activity, settings, previewState);
    if (!state || renderMode === "off") {
      unmountWidget(ctx, true);
      return;
    }
    if (!widget && !animationTimer) {
      mountWidget(ctx, true);
      return;
    }
    widget?.setState(state);
  }

  function clearPreviewTimer(): void {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = undefined;
  }

  function stopPreview(ctx: ExtensionContext, shouldReconcile = true): void {
    clearPreviewTimer();
    previewState = undefined;
    updateWorkingIndicator(ctx);
    if (shouldReconcile) reconcile(ctx);
  }

  function dispatch(event: ActivityEvent, ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;
    if (event.type !== "editor_content_changed" && previewState) {
      stopPreview(ctx, false);
    }
    activity = reduceActivity(activity, event);
    reconcile(ctx);
  }

  function pollEditor(ctx: ExtensionContext): void {
    const hasText = ctx.ui.getEditorText().trim().length > 0;
    if (hasText === activity.editorHasText) return;
    dispatch({ type: "editor_content_changed", hasText }, ctx);
  }

  async function detectRenderer(
    ctx: ExtensionContext,
    notifyResult: boolean,
  ): Promise<boolean> {
    const capabilities = getCapabilities();
    imageProtocol = capabilities.images ?? null;
    renderFrame = undefined;
    rendererError = undefined;

    renderMode = chooseRenderMode({
      interactive: true,
      imageProtocol,
    });
    if (renderMode !== "image") {
      rendererStatus = "not attempted";
      rendererError = "terminal image protocol is unavailable";
      if (notifyResult) {
        ctx.ui.notify("No terminal image protocol detected; using spinner.", "warning");
      }
      return false;
    }

    try {
      const renderer = await import("./src/renderer.ts");
      renderFrame = renderer.renderOrbFrame;
      rendererStatus = "available";
      if (notifyResult) ctx.ui.notify("Thinking Orbs image renderer is available.", "info");
      return true;
    } catch (error) {
      renderMode = "spinner";
      rendererStatus = "unavailable";
      rendererError = describeError(error);
      if (!rendererWarningShown || notifyResult) {
        rendererWarningShown = true;
        ctx.ui.notify(
          `Thinking Orbs image renderer failed; using spinner. ${rendererError}`,
          "warning",
        );
      }
      return false;
    }
  }

  async function applySettingsUpdate(
    patch: OrbSettingsPatch,
    summary: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    let result: Awaited<ReturnType<typeof mergeAndSaveSettings>>;
    try {
      result = await mergeAndSaveSettings(settingsPath, patch);
    } catch (error) {
      if (error instanceof InvalidSettingsFileError) {
        const overwrite = await ctx.ui.confirm(
          "Invalid Thinking Orbs configuration",
          `${error.message}\n\nOverwrite it with the current settings and this change?`,
        );
        if (!overwrite) {
          ctx.ui.notify("Settings change cancelled; the invalid file was preserved.", "warning");
          return;
        }
        try {
          result = await mergeAndSaveSettings(settingsPath, patch, {
            overwriteInvalid: true,
            fallback: settings,
          });
        } catch (overwriteError) {
          ctx.ui.notify(`Could not save settings: ${describeError(overwriteError)}`, "error");
          return;
        }
      } else {
        ctx.ui.notify(`Could not save settings: ${describeError(error)}`, "error");
        return;
      }
    }

    const previousRuntimeSettings = settings;
    const synchronized = !settingsEqual(result.previous, previousRuntimeSettings);
    const disabling = result.settings.enabled === false;
    if (disabling && previewState) stopPreview(ctx, false);
    settings = result.settings;
    configurationStatus = "valid";
    configurationError = undefined;
    updateWorkingIndicator(ctx);

    const leftStatic =
      previousRuntimeSettings.motion === "static" && settings.motion !== "static";
    if (!settings.enabled && !previewState) {
      unmountWidget(ctx, true);
    } else {
      rebuildWidget(ctx, leftStatic);
    }

    const syncMessage = synchronized ? " Other session changes were synchronized." : "";
    ctx.ui.notify(`${summary}.${syncMessage}`, "info");
  }

  function schedulePreviewSequence(ctx: ExtensionCommandContext, index: number): void {
    previewState = PREVIEW_SEQUENCE[index];
    updateWorkingIndicator(ctx);
    reconcile(ctx);
    previewTimer = setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= PREVIEW_SEQUENCE.length) {
        stopPreview(ctx);
        ctx.ui.notify("Preview complete.", "info");
        return;
      }
      schedulePreviewSequence(ctx, nextIndex);
    }, PREVIEW_STATE_DURATION_MS);
  }

  async function preview(
    target: PreviewTarget,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    if (target === "off") {
      if (!previewState) {
        ctx.ui.notify("No preview is running.", "info");
        return;
      }
      stopPreview(ctx);
      ctx.ui.notify("Preview stopped.", "info");
      return;
    }

    if (isAgentActive(activity)) {
      ctx.ui.notify("Preview is unavailable while the agent is active.", "warning");
      return;
    }

    clearPreviewTimer();
    updateWorkingIndicator(ctx);
    if (target === "all") {
      schedulePreviewSequence(ctx, 0);
      ctx.ui.notify("Previewing all states for 3 seconds each.", "info");
      return;
    }

    previewState = target;
    updateWorkingIndicator(ctx);
    reconcile(ctx);
    ctx.ui.notify(`Previewing ${target}. Run /orbs preview off to stop.`, "info");
  }

  function status(): string {
    const activeState = displayedOrbState(activity, settings, previewState) ?? "hidden";
    const effectiveFps =
      settings.motion === "static"
        ? "static"
        : renderMode === "image"
          ? String(effectiveImageFps(settings))
          : "10 (spinner)";
    const resolvedAppearance = resolveDarkAppearance(
      settings.appearance,
      process.env.COLORFGBG,
    )
      ? "dark"
      : "light";

    return [
      `Thinking Orbs ${EXTENSION_VERSION}`,
      `enabled: ${settings.enabled}`,
      `configured FPS: ${settings.fps}`,
      `effective FPS: ${effectiveFps}`,
      `motion: ${settings.motion}`,
      `appearance: ${settings.appearance} (resolved: ${resolvedAppearance})`,
      `listening: ${settings.listening}`,
      `placement: ${settings.placement}`,
      `current state: ${activeState}`,
      `preview: ${previewState ?? "off"}`,
      `render mode: ${renderMode}`,
      `terminal image protocol: ${imageProtocol ?? "none"}`,
      `Canvas renderer: ${rendererStatus}`,
      `renderer detail: ${rendererError ?? "none"}`,
      `configuration: ${configurationStatus}`,
      `configuration detail: ${configurationError ?? "none"}`,
      `configuration path: ${settingsPath}`,
      `thinking-orbs: ${THINKING_ORBS_VERSION}`,
    ].join("\n");
  }

  const commandRuntime: OrbsCommandRuntime = {
    getSettings: () => settings,
    updateSettings: applySettingsUpdate,
    preview,
    retryRenderer: async (ctx) => {
      if (isAgentActive(activity)) {
        ctx.ui.notify("Renderer retry is unavailable while the agent is active.", "warning");
        return;
      }
      const previousMode = renderMode;
      await detectRenderer(ctx, true);
      if (previousMode !== renderMode || displayedOrbState(activity, settings, previewState)) {
        rebuildWidget(ctx, false);
      }
    },
    resetSettings: async (ctx) => {
      const confirmed = await ctx.ui.confirm(
        "Reset Thinking Orbs",
        "Restore all Thinking Orbs settings to their defaults?",
      );
      if (!confirmed) return;

      try {
        await saveSettings(settingsPath, { ...DEFAULT_ORB_SETTINGS });
      } catch (error) {
        ctx.ui.notify(`Could not reset settings: ${describeError(error)}`, "error");
        return;
      }

      stopPreview(ctx, false);
      const previousSettings = settings;
      settings = { ...DEFAULT_ORB_SETTINGS };
      configurationStatus = "valid";
      configurationError = undefined;
      updateWorkingIndicator(ctx);
      rebuildWidget(ctx, previousSettings.motion === "static");
      ctx.ui.notify("Thinking Orbs settings reset.", "info");
    },
    status,
  };

  registerOrbsCommand(pi, commandRuntime);

  function cleanup(ctx: ExtensionContext): void {
    sessionActive = false;
    clearPreviewTimer();
    previewState = undefined;
    if (ctx.mode !== "tui") {
      activity = createActivitySnapshot();
      renderMode = "off";
      return;
    }
    if (editorPollTimer) clearInterval(editorPollTimer);
    editorPollTimer = undefined;
    unmountWidget(ctx, true);
    ctx.ui.setWorkingIndicator(undefined);
    activity = createActivitySnapshot();
    renderMode = "off";
  }

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    sessionActive = true;

    const loaded = await loadSettings(settingsPath);
    settings = loaded.settings;
    configurationStatus = loaded.status;
    configurationError = loaded.status === "invalid" ? loaded.error : undefined;
    if (loaded.status === "invalid") {
      ctx.ui.notify(
        `Invalid Thinking Orbs configuration at ${settingsPath}; using defaults. ${loaded.error}`,
        "warning",
      );
    }

    await detectRenderer(ctx, false);
    updateWorkingIndicator(ctx);
    pollEditor(ctx);
    editorPollTimer = setInterval(
      () => pollEditor(ctx),
      DEFAULT_ORB_CONFIG.editorPollMs,
    );
    reconcile(ctx);
  });

  pi.on("agent_start", async (_event, ctx) => {
    dispatch({ type: "agent_started" }, ctx);
  });

  pi.on("message_update", async (event, ctx) => {
    if (
      event.assistantMessageEvent.type === "text_start" ||
      event.assistantMessageEvent.type === "text_delta"
    ) {
      dispatch({ type: "assistant_text_started" }, ctx);
    }
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    dispatch(
      {
        type: "tool_started",
        id: event.toolCallId,
        toolName: event.toolName,
      },
      ctx,
    );
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    dispatch({ type: "tool_finished", id: event.toolCallId }, ctx);
  });

  pi.on("agent_settled", async (_event, ctx) => {
    dispatch({ type: "agent_settled" }, ctx);
    pollEditor(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    cleanup(ctx);
  });
}
