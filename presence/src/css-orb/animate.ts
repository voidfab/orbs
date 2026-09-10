import config from './orbz.config.json';
import type { CssOrbState } from './map';

type LayerName = 'root' | 'aura' | 'ring' | 'field' | 'core' | 'highlight';

interface LayerMotion {
  animate?: Record<string, number | string | Array<number | string>>;
  transition?: {
    duration: number;
    ease: string;
    repeat?: string | number;
    repeatType?: string;
    times?: number[];
  };
}

type StateMotion = Record<LayerName, LayerMotion> & {
  contrast?: number;
  saturation?: number;
};

const EASINGS = config.motion.easings as Record<string, string>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function serialize(prop: string, value: number | string): string {
  if (typeof value === 'string') return value;
  if (prop === 'rotate' || prop === '--orbz-angle') return `${value}deg`;
  return String(value);
}

export interface CssOrbLayers {
  root: HTMLElement;
  aura: HTMLElement;
  ring: HTMLElement;
  field: HTMLElement;
  core: HTMLElement;
  highlight: HTMLElement;
}

export function applyCssOrbMotion(
  layers: CssOrbLayers,
  state: CssOrbState,
  opts: { speed?: number; reduced?: boolean; paused?: boolean }
): Animation[] {
  const pack = opts.reduced ? config.motion.reduced : config.motion.full;
  const profile = pack[state] as StateMotion;
  const appearance = config.appearance.byState[state];
  layers.root.style.setProperty('--orbz-contrast', String(appearance.contrast));
  layers.root.style.setProperty('--orbz-saturation', String(appearance.saturation));

  const speed = opts.speed && opts.speed > 0 ? opts.speed : 1;
  const animations: Animation[] = [];
  const names: LayerName[] = ['root', 'aura', 'ring', 'field', 'core', 'highlight'];

  for (const name of names) {
    const motion = profile[name];
    if (!motion?.animate || !motion.transition) continue;
    const el = layers[name];
    const values = motion.animate;
    const frames: Array<Record<string, string>> = [];
    const keys = Object.keys(values);
    const count = Math.max(1, ...keys.map((k) => asArray(values[k]).length));
    for (let i = 0; i < count; i++) {
      const frame: Record<string, string> = {};
      const x = asArray(values.x);
      const y = asArray(values.y);
      if (x.length || y.length) {
        const xv = x[Math.min(i, x.length - 1)] ?? 0;
        const yv = y[Math.min(i, y.length - 1)] ?? 0;
        frame.translate = `${serialize('x', xv)} ${serialize('y', yv)}`;
      }
      for (const key of keys) {
        if (key === 'x' || key === 'y') continue;
        const series = asArray(values[key]);
        const v = series[Math.min(i, series.length - 1)];
        if (v === undefined) continue;
        const prop = key === '--orb-angle' ? '--orbz-angle' : key;
        frame[prop] = serialize(prop, v);
      }
      if (motion.transition.times?.[i] != null) frame.offset = String(motion.transition.times[i]);
      frames.push(frame);
    }
    if (frames.length === 0 || typeof el.animate !== 'function') continue;
    const ease = EASINGS[motion.transition.ease] ?? motion.transition.ease ?? 'ease-in-out';
    const repeat = motion.transition.repeat === 'infinite' ? Infinity : Number(motion.transition.repeat ?? 1);
    const anim = el.animate(frames, {
      duration: (motion.transition.duration * 1000) / speed,
      easing: ease,
      iterations: Number.isFinite(repeat) ? repeat : Infinity,
      direction: motion.transition.repeatType === 'reverse' ? 'alternate' : 'normal'
    });
    if (opts.paused) anim.pause();
    animations.push(anim);
  }
  return animations;
}

export function cssOrbColors(preset: keyof typeof config.appearance.presets = 'neongate') {
  return config.appearance.presets[preset];
}
