import { MODE_DRAWS, resolvePreset, type OrbState } from '../../../src/engine';

export const ORB_STATES = [
  'idle',
  'listening',
  'thinking',
  'searching',
  'working',
  'shaping',
  'composing',
  'speaking',
  'relaying'
] as const;

export type HostOrbState = (typeof ORB_STATES)[number];

export function paintOrb(
  ctx: CanvasRenderingContext2D,
  size: number,
  state: HostOrbState,
  timeSeconds: number,
  dark: boolean
): void {
  const { mode, speed, opts } = resolvePreset(state as OrbState, size);
  const draw = MODE_DRAWS[mode];
  if (!draw) return;
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size, timeSeconds * speed, dark, opts);
}

export function phaseToOrbState(
  phase: string,
  toolName?: string
): HostOrbState {
  const p = phase.toLowerCase();
  if (p === 'listening' || p === 'recording' || p === 'transcribing') return 'listening';
  if (p === 'speaking' || p === 'talking') return 'speaking';
  if (p === 'thinking' || p === 'processing') return 'thinking';
  if (p === 'composing' || p === 'streaming') return 'composing';
  if (p === 'searching' || p === 'reading') return 'searching';
  if (p === 'shaping' || p === 'writing' || p === 'editing') return 'shaping';
  if (p === 'working' || p === 'tool') return classifyTool(toolName);
  if (p === 'relaying') return 'relaying';
  return 'idle';
}

export function classifyTool(toolName?: string): HostOrbState {
  const name = (toolName ?? '').toLowerCase();
  if (['edit', 'write', 'apply_patch', 'str_replace'].some((n) => name.includes(n))) {
    return 'shaping';
  }
  if (
    ['read', 'search', 'grep', 'glob', 'find', 'ls', 'web_search', 'web_fetch'].some((n) =>
      name.includes(n)
    )
  ) {
    return 'searching';
  }
  return 'working';
}
