// ThinkingOrb — shared clock, renderer-agnostic engine, polar morphs.
//
// Default palette is `mono` (original). State changes morph by default
// (animated fork). Hover/focus is an overlay (transitions fork).

import { useEffect, useRef } from 'react';
import { getLut } from './color';
import { sharedClock, subscribe as subscribeFrames } from './driver';
import { DotBuffer } from './engine/buffer';
import { paintFrame, type OrbFrame } from './engine/core';
import { MODE_FRAMES } from './engine/registry';
import { applyVolume, frameToSvg } from './render/svg';
import {
  applyInteraction,
  applySpring,
  distortContext,
  easeToward,
  springPoint
} from './interaction';
import { CONTOUR_DRAWS, setContourTint } from './engine/contour';
import { STATE_LABELS } from './labels';
import { resolveCubePreset } from './cube-presets';
import { PROGRESS_MODES, resolvePreset } from './presets';
import {
  advance,
  isSettled,
  orbLeaf,
  renderNode,
  targetState,
  transitionTo,
  type OrbNode
} from './scene';
import { useReducedMotion, useResolvedDark } from './theme';
import type { OrbState, ThinkingOrbProps, TransitionKind } from './types';

function currentDpr(): number {
  return Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
}

function resolveTransition(
  transition: ThinkingOrbProps['transition'],
  duration: number | undefined,
  crossfade: number | undefined
): { kind: TransitionKind; ms: number } {
  if (transition === false || transition === 'cut') return { kind: 'cut', ms: 0 };
  if (typeof transition === 'number') {
    return transition <= 0 ? { kind: 'cut', ms: 0 } : { kind: 'morph', ms: transition };
  }
  if (transition === 'crossfade') {
    const ms = duration ?? crossfade ?? 300;
    return ms <= 0 ? { kind: 'cut', ms: 0 } : { kind: 'crossfade', ms };
  }
  const ms = duration ?? crossfade ?? 620;
  if (ms <= 0) return { kind: 'cut', ms: 0 };
  return { kind: transition ?? 'morph', ms };
}

export function ThinkingOrb({
  state = 'working',
  size = 64,
  theme = 'auto',
  palette = 'mono',
  ramp,
  speed = 1,
  paused = false,
  once = false,
  crossfade,
  duration,
  transition = 'morph',
  batchPaths = false,
  progress,
  shape = 'orb',
  variant = 'classic',
  color,
  static: isStatic = false,
  renderer = 'canvas',
  volume,
  interaction,
  reducedMotion: reducedMotionProp,
  onOrbTransitionStart,
  onOrbTransitionEnd,
  style,
  'aria-label': ariaLabel,
  ...rest
}: ThinkingOrbProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dark = useResolvedDark(theme, ref);
  const reducedPref = useReducedMotion();
  const reduced = reducedMotionProp ?? reducedPref;

  if (process.env.NODE_ENV !== 'production' && progress !== undefined) {
    const { mode } = resolvePreset(state, size);
    if (!PROGRESS_MODES.has(mode)) {
      console.warn(
        `[thinking-orbs] state "${state}" (mode "${mode}") ignores \`progress\`; ` +
          `states backed by ${Array.from(PROGRESS_MODES).join(', ')} express it.`
      );
    }
  }

  const live = useRef({
    state,
    speed,
    paused,
    once,
    transition,
    duration,
    crossfade,
    batchPaths,
    palette,
    ramp,
    dark,
    progress,
    shape,
    variant,
    color,
    static: isStatic,
    renderer,
    volume,
    interaction,
    onOrbTransitionStart,
    onOrbTransitionEnd
  });
  live.current = {
    state,
    speed,
    paused,
    once,
    transition,
    duration,
    crossfade,
    batchPaths,
    palette,
    ramp,
    dark,
    progress,
    shape,
    variant,
    color,
    static: isStatic,
    renderer,
    volume,
    interaction,
    onOrbTransitionStart,
    onOrbTransitionEnd
  };

  const clock = useRef({ t: 0, seeded: false });
  const scene = useRef<OrbNode>(orbLeaf(state));
  const lastState = useRef(state);
  const hover = useRef({ amount: 0, x: 0.5, y: 0.5, over: false, focus: false });

  // Crossfade leftover from new-modes (used only when kind === 'crossfade').
  const prev = useRef<{ state: OrbState; t: number; mix: number } | null>(null);
  const bufA = useRef(new DotBuffer());
  const bufB = useRef(new DotBuffer());
  const bufOut = useRef(new DotBuffer());
  const svgHost = useRef<HTMLDivElement | null>(null);

  if (lastState.current !== state) {
    const from = lastState.current;
    const spec = resolveTransition(transition, duration, crossfade);
    if (variant === 'contour') {
      scene.current = orbLeaf(state);
      prev.current = null;
      live.current.onOrbTransitionStart?.(from, state);
      live.current.onOrbTransitionEnd?.(from, state);
    } else if (spec.kind === 'morph') {
      scene.current = transitionTo(scene.current, state, reduced);
      live.current.onOrbTransitionStart?.(from, state);
    } else if (spec.kind === 'crossfade' && spec.ms > 0) {
      prev.current = { state: from, t: clock.current.t, mix: 1 };
      scene.current = orbLeaf(state);
      live.current.onOrbTransitionStart?.(from, state);
    } else {
      scene.current = orbLeaf(state);
      prev.current = null;
    }
    lastState.current = state;
  }

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = currentDpr();
    const sizeCanvas = () => {
      dpr = currentDpr();
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    };
    sizeCanvas();

    if (!clock.current.seeded) {
      clock.current.t = sharedClock();
      clock.current.seeded = true;
    }

    const sampleColor = (css: string | undefined): [number, number, number] | null => {
      if (!css) return null;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      ctx.restore();
      return [r, g, b];
    };

    const paint = () => {
      const l = live.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sampled = sampleColor(l.color);
      const tintHex = sampled
        ? `#${sampled.map((n) => n.toString(16).padStart(2, '0')).join('')}`
        : null;
      setContourTint(sampled);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const lut = getLut(tintHex ?? l.palette, l.dark, l.ramp);
      const spec = resolveTransition(l.transition, l.duration, l.crossfade);
      const pNow = resolvePreset(l.state, size);
      const contour = l.variant === 'contour' ? CONTOUR_DRAWS[pNow.mode] : undefined;
      if (contour) {
        let t = l.static || reduced ? 0.6 : clock.current.t * pNow.speed;
        const hoverCfg = l.interaction?.hover;
        let drawCtx: CanvasRenderingContext2D = ctx;
        if (hoverCfg?.spring && hover.current.amount > 0.001) {
          const px = hover.current.x * size;
          const py = hover.current.y * size;
          const str = hover.current.amount;
          drawCtx = distortContext(ctx, (x, y) => springPoint(x, y, px, py, size, str));
        }
        const opts = l.progress === undefined ? pNow.opts : { ...pNow.opts, progress: l.progress };
        contour(drawCtx, size, t, l.dark, opts);
        return;
      }

      if (spec.kind === 'crossfade' && prev.current && prev.current.mix > 0) {
        const out = prev.current;
        const pOut = resolvePreset(out.state, size);
        const optsOut = l.progress === undefined ? pOut.opts : { ...pOut.opts, progress: l.progress };
        paintFrame(ctx, MODE_FRAMES[pOut.mode](size, out.t * pOut.speed, optsOut), l.dark, lut, out.mix);
        const p = resolvePreset(l.state, size);
        let t = clock.current.t;
        if (l.once && p.cycle !== undefined) t = Math.min(t, p.cycle / p.speed);
        const opts = l.progress === undefined ? p.opts : { ...p.opts, progress: l.progress };
        const incoming = MODE_FRAMES[p.mode](size, t * p.speed, opts);
        const a = bufA.current;
        a.reset();
        for (const d of incoming.dots) a.add(d.x, d.y, d.z, d.r, d.white, d.a ?? 1);
        applyHover(a);
        paintFrame(
          ctx,
          { dots: a.dots.slice(0, a.n), lines: incoming.lines },
          l.dark,
          lut,
          1 - out.mix
        );
        return;
      }

      const frame = bufOut.current;
      renderNode(frame, scene.current, size, clock.current.t, l.progress, l.once, l.shape, l.volume);
      applyHover(frame);
      let drawn: OrbFrame = {
        dots: frame.dots.slice(0, frame.n),
        lines: frame.lines.slice(0, frame.lineN)
      };
      drawn = applyVolume(drawn, size, l.volume);
      if (l.renderer === 'svg' && svgHost.current) {
        svgHost.current.innerHTML = frameToSvg(drawn, size, l.dark, lut);
        return;
      }
      paintFrame(ctx, drawn, l.dark, lut);
    };

    const applyHover = (buf: DotBuffer) => {
      const cfg = live.current.interaction;
      if (!cfg) return;
      const hoverCfg = cfg.hover;
      if (hoverCfg?.spring) {
        applySpring(buf, size, hover.current.x, hover.current.y, hover.current.amount);
        return;
      }
      applyInteraction(
        buf,
        size,
        hover.current.amount,
        hoverCfg?.scale ?? 1.04,
        hover.current.x,
        hover.current.y,
        hoverCfg?.parallax ?? 0.12
      );
    };

    if (reduced || isStatic) {
      clock.current.t = 0.6;
      scene.current = orbLeaf(live.current.state);
      prev.current = null;
      paint();
      return;
    }

    let visible = true;
    let unsub: (() => void) | null = null;

    const tick = (dt: number) => {
      const l = live.current;
      const spec = resolveTransition(l.transition, l.duration, l.crossfade);
      if (!l.paused) {
        clock.current.t += dt * l.speed;
        if (spec.kind === 'morph' && !isSettled(scene.current)) {
          const before = scene.current;
          scene.current = advance(scene.current, dt * (1000 / Math.max(1, spec.ms)));
          if (isSettled(scene.current) && before.kind === 'blend') {
            l.onOrbTransitionEnd?.(targetState(before.from), targetState(scene.current));
          }
        }
        const out = prev.current;
        if (out) {
          out.t += dt * l.speed;
          out.mix -= dt * (1000 / Math.max(1, spec.ms));
          if (out.mix <= 0) {
            prev.current = null;
            l.onOrbTransitionEnd?.(out.state, l.state);
          }
        }
        const hoverCfg = l.interaction?.hover;
        const want =
          (hoverCfg?.enabled !== false && hover.current.over) ||
          (l.interaction?.focus?.enabled && hover.current.focus)
            ? 1
            : 0;
        hover.current.amount = easeToward(
          hover.current.amount,
          want,
          dt,
          hoverCfg?.transitionDuration ?? 220
        );
      }
      paint();
    };

    const start = () => {
      if (unsub) return;
      unsub = subscribeFrames(tick);
    };
    const stop = () => {
      unsub?.();
      unsub = null;
    };

    paint();

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && document.visibilityState !== 'hidden') start();
            else stop();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVis);
    if (!io) start();

    const dprMq =
      typeof matchMedia !== 'undefined' ? matchMedia(`(resolution: ${currentDpr()}dppx)`) : null;
    const onDpr = () => {
      sizeCanvas();
      paint();
    };
    dprMq?.addEventListener('change', onDpr);

    const stopProp = live.current.interaction?.stopPropagation !== false;
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      hover.current.over = true;
      if (stopProp) e.stopPropagation();
    };
    const onLeave = (e: PointerEvent) => {
      hover.current.over = false;
      hover.current.x = 0.5;
      hover.current.y = 0.5;
      if (stopProp) e.stopPropagation();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      hover.current.x = (e.clientX - r.left) / Math.max(1, r.width);
      hover.current.y = (e.clientY - r.top) / Math.max(1, r.height);
      if (stopProp) e.stopPropagation();
    };
    const onFocus = () => {
      hover.current.focus = true;
    };
    const onBlur = () => {
      hover.current.focus = false;
    };
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('focus', onFocus);
    canvas.addEventListener('blur', onBlur);

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      dprMq?.removeEventListener('change', onDpr);
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('focus', onFocus);
      canvas.removeEventListener('blur', onBlur);
    };
  }, [size, reduced, renderer, isStatic, variant]);

  const focusable = interaction?.focus?.enabled ? 0 : undefined;

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? STATE_LABELS[state]}
      style={{ width: size, height: size, display: 'block', position: 'relative', ...style }}
    >
      <canvas
        ref={ref}
        tabIndex={rest.tabIndex ?? focusable}
        style={{
          width: size,
          height: size,
          display: renderer === 'svg' ? 'none' : 'block'
        }}
        {...rest}
      />
      {renderer === 'svg' ? (
        <div ref={svgHost} style={{ width: size, height: size, lineHeight: 0 }} />
      ) : null}
    </div>
  );
}

/** Cubed-fork entry: same props, cube substrate for the original nine verbs. */
export function ThinkingCube(props: ThinkingOrbProps) {
  return <ThinkingOrb {...props} shape="cube" />;
}
