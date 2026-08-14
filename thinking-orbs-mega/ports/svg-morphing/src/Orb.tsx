/**
 * <Orb/> — the thinking-orbs animations on an SVG surface.
 *
 * Every frame runs the npm package's own exported engine (MODE_DRAWS +
 * resolvePreset — the identical math, tunings, and paint order the canvas
 * component uses) against a recording context, then commits the recorded
 * primitives to pooled SVG <circle>/<line> nodes. Exactness is by
 * construction: no animation code is reimplemented here.
 *
 * Why SVG: the upstream component rasterizes to a fixed bitmap capped at
 * 2× devicePixelRatio, so any browser zoom, display scaling, or CSS sizing
 * resamples it into blur. Vector output re-rasterizes at the compositor's
 * true resolution — crisp at every size, zoom, and DPR.
 *
 * The frame loop mirrors the upstream component: one shared wall clock so
 * instances stay in phase, IntersectionObserver + visibilitychange pausing,
 * and a static representative frame under prefers-reduced-motion.
 */
import { useEffect, useRef, type CSSProperties, type SVGAttributes } from "react";
import { MODE_DRAWS, resolvePreset, STATE_TO_MODE, type OrbSize, type OrbState } from "thinking-orbs";
import { easeInOutCubic, morphOps } from "./morph.js";
import { createRecorder, type RecordedOp } from "./record.js";
import { useReducedMotion } from "./theme.js";

const LABELS: Record<OrbState, string> = {
  working: "Working…",
  searching: "Searching…",
  solving: "Solving…",
  listening: "Listening…",
  connecting: "Connecting…",
  weaving: "Weaving…",
  composing: "Composing…",
  breathing: "Thinking…",
  shaping: "Shaping…",
};

export interface OrbProps extends Omit<SVGAttributes<SVGSVGElement>, "style"> {
  /** Which animation to show. @default "working" */
  state?: OrbState;
  /** Tuned preset — 64 or 20. Governs dot counts/sizes/speed. @default 64 */
  size?: OrbSize;
  /**
   * Rendered CSS size; defaults to the preset size. Unlike the canvas
   * original this may be ANY value — vector output scales losslessly.
   */
  display?: number | string;
  /** Speed multiplier on the preset's baked speed. @default 1 */
  speed?: number;
  /** Freeze on the current frame. @default false */
  paused?: boolean;
  /**
   * How long a state change morphs from the old animation into the new one —
   * dots travel to their counterparts, edges dissolve and re-form. 0 restores
   * the upstream hard swap. Skipped under prefers-reduced-motion. @default 450
   */
  morphMs?: number;
  style?: CSSProperties;
}

/** SVG namespace helper for the node pools. */
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Ink strength from the engine's grayscale. Frames always render with the
 * engine's light-theme convention (gray = white value, 0 = strongest ink),
 * so opacity = alpha × (1 − g/255) and the COLOR is simply currentColor —
 * the orb inherits whatever `color` cascades to it, exactly like an icon.
 * Default page foreground ≈ the original monochrome look in both themes;
 * a text-color class restyles it in one step.
 */
const inkOpacity = (paint: string): number => {
  const m = /^rgba\((\d+),\d+,\d+,([\d.]+)\)$/.exec(paint);
  if (!m) return 1;
  return Number(m[2]) * (1 - Number(m[1]) / 255);
};

function commit(svg: SVGSVGElement, ops: RecordedOp[]) {
  const children = svg.children;
  let i = 0;
  for (const op of ops) {
    let el = children[i] as SVGElement | undefined;
    const want = op.kind === "circle" ? "circle" : "line";
    if (!el || el.tagName !== want) {
      const fresh = document.createElementNS(SVG_NS, want);
      if (el) svg.insertBefore(fresh, el);
      else svg.appendChild(fresh);
      el = fresh;
    }
    if (op.kind === "circle") {
      el.setAttribute("cx", String(op.x));
      el.setAttribute("cy", String(op.y));
      el.setAttribute("r", String(op.r));
      el.setAttribute("fill", "currentColor");
      el.setAttribute("fill-opacity", String(inkOpacity(op.fill)));
    } else {
      el.setAttribute("x1", String(op.x1));
      el.setAttribute("y1", String(op.y1));
      el.setAttribute("x2", String(op.x2));
      el.setAttribute("y2", String(op.y2));
      el.setAttribute("stroke", "currentColor");
      el.setAttribute("stroke-opacity", String(inkOpacity(op.stroke)));
      el.setAttribute("stroke-width", String(op.w));
      el.setAttribute("stroke-linecap", "round");
    }
    i++;
  }
  while (svg.children.length > i) svg.lastChild?.remove();
}

export function Orb({
  state = "working",
  size = 64,
  display,
  speed = 1,
  paused = false,
  morphMs = 450,
  style,
  "aria-label": ariaLabel,
  ...rest
}: OrbProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const reduced = useReducedMotion();

  // The live target state plus, during a morph, where we came from and when
  // it started. Refs, not deps: a state change must NOT tear the loop down —
  // the render loop reads these and blends until the window closes.
  const target = useRef({ state, since: 0, from: null as OrbState | null });
  useEffect(() => {
    if (state === target.current.state) return;
    target.current = {
      state,
      since: performance.now(),
      from: reduced || morphMs <= 0 ? null : target.current.state,
    };
  }, [state, reduced, morphMs]);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const recA = createRecorder();
    const recB = createRecorder();

    const renderState = (rec: ReturnType<typeof createRecorder>, s: OrbState, nowMs: number) => {
      const { mode, speed: baseSpeed, opts } = resolvePreset(s, size);
      (rec.ctx as unknown as { clearRect(): void }).clearRect();
      MODE_DRAWS[mode](rec.ctx, size, (nowMs / 1000) * baseSpeed * speed, false, opts);
      return rec.ops();
    };

    const frame = (nowMs: number) => {
      const t = target.current;
      const toOps = renderState(recA, t.state, nowMs);
      if (t.from) {
        const f = (nowMs - t.since) / morphMs;
        if (f >= 1) {
          target.current = { ...t, from: null };
          commit(svg, toOps);
          return;
        }
        const fromOps = renderState(recB, t.from, nowMs);
        commit(svg, morphOps(fromOps, toOps, easeInOutCubic(Math.max(0, f))));
        return;
      }
      commit(svg, toOps);
    };

    // Reduced motion → one static, deterministic frame (t = 0.6, upstream's
    // representative frame). The morph path is already disabled by the
    // target-state effect, so this renders the current state directly.
    if (reduced) {
      const { mode, opts } = resolvePreset(target.current.state, size);
      (recA.ctx as unknown as { clearRect(): void }).clearRect();
      MODE_DRAWS[mode](recA.ctx, size, 0.6, false, opts);
      commit(svg, recA.ops());
      return;
    }

    let raf = 0;
    let running = false;
    const loop = () => {
      frame(performance.now());
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || paused) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    frame(performance.now());

    let visible = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible && document.visibilityState !== "hidden") start();
          else stop();
        })
      : null;
    io?.observe(svg);
    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVis);
    if (!io) start();

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    // `state` is deliberately absent while animating: a state change morphs
    // inside the live loop via the target ref instead of tearing the loop
    // down. Under reduced motion there is no loop, so the state IS a dep —
    // the static frame must repaint on change.
  }, [size, speed, paused, reduced, morphMs, reduced ? state : null]);

  const css = display ?? size;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel ?? LABELS[state]}
      style={{ width: css, height: css, display: "block", ...style }}
      {...rest}
    />
  );
}

export { STATE_TO_MODE };
export type { OrbSize, OrbState };
