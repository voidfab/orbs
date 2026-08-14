import { cubeBuilderFor, resolveCubePreset } from './cube-presets';
import { blendInto } from './engine/blend';
import { DotBuffer } from './engine/buffer';
import { MODE_FRAMES } from './engine/registry';
import { asFrame, frameToBuffer } from './engine/adapt';
import { resolvePreset } from './presets';
import type { OrbShape, OrbState } from './types';

export interface OrbLeaf {
  kind: 'leaf';
  state: OrbState;
}

export interface OrbBlend {
  kind: 'blend';
  from: OrbNode;
  to: OrbLeaf;
  m: number;
}

export type OrbNode = OrbLeaf | OrbBlend;

const MAX_DEPTH = 3;

export function orbLeaf(state: OrbState): OrbLeaf {
  return { kind: 'leaf', state };
}

export function targetState(node: OrbNode): OrbState {
  return node.kind === 'leaf' ? node.state : node.to.state;
}

function collapse(node: OrbNode): OrbLeaf {
  if (node.kind === 'leaf') return node;
  return node.m >= 0.5 ? node.to : collapse(node.from);
}

function prune(node: OrbNode, budget: number): OrbNode {
  if (node.kind === 'leaf') return node;
  if (budget <= 1) return collapse(node);
  const from = prune(node.from, budget - 1);
  return from === node.from ? node : { ...node, from };
}

export function transitionTo(node: OrbNode, next: OrbState, instant: boolean): OrbNode {
  if (instant) return orbLeaf(next);
  if (targetState(node) === next) return node;
  return { kind: 'blend', from: prune(node, MAX_DEPTH), to: orbLeaf(next), m: 0 };
}

export function advance(node: OrbNode, step: number): OrbNode {
  if (node.kind === 'leaf') return node;
  const m = node.m + step;
  if (m >= 1) return node.to;
  return { ...node, m };
}

export function isSettled(node: OrbNode): boolean {
  return node.kind === 'leaf';
}

export function buildLeaf(
  out: DotBuffer,
  state: OrbState,
  size: number,
  clock: number,
  progress?: number,
  once = false,
  shape: OrbShape = 'orb',
  energy?: number
): void {
  const cube = shape === 'cube' ? cubeBuilderFor(state) : null;
  const p = cube ? resolveCubePreset(state, size) : resolvePreset(state, size);
  let t = clock;
  if (once && p.cycle !== undefined) t = Math.min(t, p.cycle / p.speed);
  const opts = {
    ...p.opts,
    ...(progress === undefined ? {} : { progress }),
    ...(energy === undefined ? {} : { energy })
  };
  const frame = cube ? asFrame(cube)(size, t * p.speed, opts) : MODE_FRAMES[p.mode](size, t * p.speed, opts);
  frameToBuffer(frame, out);
}

const pool: DotBuffer[] = [];
function acquire(): DotBuffer {
  return pool.pop() ?? new DotBuffer();
}
function release(buf: DotBuffer): void {
  buf.reset();
  pool.push(buf);
}

export function renderNode(
  out: DotBuffer,
  node: OrbNode,
  size: number,
  clock: number,
  progress?: number,
  once = false,
  shape: OrbShape = 'orb',
  energy?: number
): void {
  if (node.kind === 'leaf') {
    buildLeaf(out, node.state, size, clock, progress, once, shape, energy);
    return;
  }
  const a = acquire();
  const b = acquire();
  renderNode(a, node.from, size, clock, progress, once, shape, energy);
  renderNode(b, node.to, size, clock, progress, once, shape, energy);
  blendInto(out, a, b, node.m, size);
  release(a);
  release(b);
}
