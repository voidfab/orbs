import { fibDir, makeProj } from '../engine/core';
import { springPoint } from '../interaction';
import { defaultKnobs, knobsFromPhase, railCount, type SeamKnobs } from './knobs';
import { KnotRibbon, torusKnot, torusKnotRail, v2Topology, variantLayout, waveDisplace, wrapTau } from './knot';
import { internalForVariant, type SeamGeneration, type SeamInternal, type SeamPhase, type SeamVariant } from './types';

interface Mote {
  x: number;
  y: number;
  z: number;
  u: number;
  life: number;
  age: number;
  seed: number;
  rail: number;
  kind: 'field' | 'in' | 'out';
}

interface PaintDot {
  x: number;
  y: number;
  z: number;
  r: number;
  a: number;
  rgb: [number, number, number];
}

export interface SeamFrameOpts {
  phase: SeamPhase;
  variant: SeamVariant;
  input: number;
  output: number;
  vad: number;
  t: number;
  pointerX: number;
  pointerY: number;
  pointer: number;
  barge: number;
  dark: boolean;
  generation?: SeamGeneration;
  /** Official orb (or other child) already occupies the internal domain. */
  coreOccupied?: boolean;
  internal?: SeamInternal;
  knobs?: SeamKnobs;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const RIBBON = 240;

function approach(c: number, t: number, r: number, dt: number): number {
  return c + (t - c) * (1 - Math.exp(-r * dt));
}

export class SeamField {
  private field: Mote[] = [];
  private traffic: Mote[] = [];
  private wIdle = 1;
  private wListen = 0;
  private wThink = 0;
  private wSpeak = 0;
  private inS = 0;
  private outS = 0;
  private inAcc = 0;
  private outAcc = 0;
  private gen: SeamGeneration = 1;
  private p = 2;
  private q = 3;
  private tube = 0.34;
  private ribbon = new KnotRibbon();
  private pool: PaintDot[] = [];
  private knobs: SeamKnobs = defaultKnobs();

  constructor() {
    this.reseed(280);
  }

  reseed(n: number): void {
    this.field = [];
    for (let i = 0; i < n; i++) {
      const [x, y, z] = fibDir(i, n);
      this.field.push({
        x,
        y,
        z,
        u: (i / n) * TAU,
        life: 1,
        age: (i * 0.137) % 1,
        seed: ((i * GOLDEN) % TAU) as number,
        rail: 0,
        kind: 'field'
      });
    }
  }

  step(
    dt: number,
    phase: SeamPhase,
    input: number,
    output: number,
    generation: SeamGeneration = 1,
    knobs?: SeamKnobs
  ): void {
    if (generation !== this.gen) {
      this.traffic.length = 0;
      this.inAcc = 0;
      this.outAcc = 0;
      this.gen = generation;
    }

    this.wIdle = approach(this.wIdle, phase === 'idle' ? 1 : 0, 4.2, dt);
    this.wListen = approach(this.wListen, phase === 'listening' ? 1 : 0, 5.2, dt);
    this.wThink = approach(this.wThink, phase === 'thinking' ? 1 : 0, 4.8, dt);
    this.wSpeak = approach(this.wSpeak, phase === 'speaking' ? 1 : 0, 5.5, dt);
    const sum = this.wIdle + this.wListen + this.wThink + this.wSpeak || 1;
    this.wIdle /= sum;
    this.wListen /= sum;
    this.wThink /= sum;
    this.wSpeak /= sum;
    this.inS = approach(this.inS, input, 8, dt);
    this.outS = approach(this.outS, output, 8, dt);
    this.knobs = knobs ?? knobsFromPhase(phase, input, output);

    const topo = v2Topology(this.weights);
    this.p = topo.p;
    this.q = topo.q;
    this.tube = approach(this.tube, topo.tube, 4, dt);

    if (generation === 2) this.stepV2Traffic(dt);
    else this.stepV1Traffic(dt);
  }

  private stepV1Traffic(dt: number): void {
    this.inAcc += dt * (this.inS * 16);
    this.outAcc += dt * (this.outS * 18 + this.wSpeak * 3);

    while (this.inAcc > 1 && this.traffic.length < 90) {
      this.inAcc -= 1;
      this.spawnInternal();
    }
    while (this.outAcc > 1 && this.traffic.length < 90) {
      this.outAcc -= 1;
      this.spawnGlobe('out');
    }

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const m = this.traffic[i];
      m.age += dt;
      if (m.kind === 'in') {
        m.life -= dt * (0.7 + this.inS * 0.5);
        const pull = 0.35 * dt;
        m.x *= 1 - pull;
        m.y *= 1 - pull;
        m.z *= 1 - pull;
        if (m.life <= 0 || Math.hypot(m.x, m.y, m.z) < 0.04) this.dropTraffic(i);
      } else {
        const speed = 0.55 + this.outS * 0.7;
        m.life -= dt * speed;
        m.y += dt * (0.55 + speed * 0.35);
        const len = Math.hypot(m.x, m.y, m.z) || 1;
        m.x /= len;
        m.y /= len;
        m.z /= len;
        if (m.life <= 0 || m.y > 1.05) this.dropTraffic(i);
      }
    }
  }

  private stepV2Traffic(dt: number): void {
    const k = this.knobs;
    const density = 2 + k.moteDensity * 28;
    this.inAcc += dt * density * (0.25 + this.inS);
    this.outAcc += dt * density * (0.25 + this.outS);
    const cap = 16 + Math.round(k.moteDensity * 70);
    const threads = Math.max(1, railCount(k.railThreads));

    while (this.inAcc > 1 && this.traffic.length < cap) {
      this.inAcc -= 1;
      this.spawnInternal();
    }
    while (this.outAcc > 1 && this.traffic.length < cap) {
      this.outAcc -= 1;
      this.traffic.push({
        x: 0,
        y: 0,
        z: 0,
        u: Math.random() * TAU,
        life: 1,
        age: 0,
        seed: Math.random() * TAU,
        rail: (Math.random() * threads) | 0,
        kind: 'out'
      });
    }

    const speed = 0.25 + k.moteSpeed * 2.1;
    const die = 1 / (0.28 + k.moteDuration * 1.7);
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const m = this.traffic[i];
      m.age += dt;
      if (m.kind === 'in') {
        m.life -= dt * die;
        const spin = dt * (0.8 + k.moteSpeed * 1.4);
        const c = Math.cos(spin);
        const s = Math.sin(spin);
        const x = m.x * c - m.z * s;
        const z = m.x * s + m.z * c;
        m.x = x * 0.985;
        m.z = z * 0.985;
        if (m.life <= 0) this.dropTraffic(i);
      } else {
        m.u = wrapTau(m.u + dt * speed);
        m.life -= dt * die;
        if (m.life <= 0) this.dropTraffic(i);
      }
    }
  }

  private spawnInternal(): void {
    const [x, y, z] = fibDir((Math.random() * 200) | 0, 200);
    const r = 0.18 + Math.random() * 0.12;
    this.traffic.push({
      x: x * r,
      y: y * r,
      z: z * r,
      u: 0,
      life: 1,
      age: 0,
      seed: Math.random() * TAU,
      rail: 0,
      kind: 'in'
    });
  }

  private spawnGlobe(kind: 'in' | 'out'): void {
    const a = Math.random() * TAU;
    const lat = kind === 'in' ? -0.2 - Math.random() * 0.3 : 0.55 + Math.random() * 0.4;
    const r = Math.sqrt(Math.max(0, 1 - lat * lat));
    this.traffic.push({
      x: Math.cos(a) * r,
      y: lat,
      z: Math.sin(a) * r,
      u: 0,
      life: 1,
      age: 0,
      seed: Math.random() * TAU,
      rail: 0,
      kind
    });
  }

  private dropTraffic(i: number): void {
    const last = this.traffic.pop();
    if (last && i < this.traffic.length) this.traffic[i] = last;
  }

  paint(ctx: CanvasRenderingContext2D, size: number, opts: SeamFrameOpts): void {
    if ((opts.generation ?? 1) === 2) {
      this.paintV2(ctx, size, opts);
      return;
    }
    this.paintV1(ctx, size, opts);
  }

  private paintV1(ctx: CanvasRenderingContext2D, size: number, opts: SeamFrameOpts): void {
    const cx = size / 2;
    const cy = size / 2;
    const layout = variantLayout(opts.variant);
    const hollow = opts.variant === 'halo' ? 0.42 : opts.variant === 'well' ? 0.16 : 0.18;
    const R = (size / 2) * (opts.variant === 'well' ? 0.86 : opts.variant === 'halo' ? 0.84 : 0.8);
    const yaw = opts.t * ((opts.knobs ?? this.knobs).yawRate * 0.65);
    const tilt = 0.34 + 0.08 * Math.sin(opts.t * 0.21) + (opts.variant === 'conduit' ? 0.08 : 0);
    const proj = makeProj(yaw, tilt, cx, cy, R);
    const px = opts.pointerX * size;
    const py = opts.pointerY * size;
    const well = opts.pointer * layout.fold;

    ctx.clearRect(0, 0, size, size);
    let n = 0;
    const push = this.pusher(proj, px, py, size, well, opts, cx, cy);

    const listenRgb: [number, number, number] = [120, 210, 255];
    const thinkRgb: [number, number, number] = [186, 140, 255];
    const speakRgb: [number, number, number] = [255, 196, 130];
    const idleRgb: [number, number, number] = opts.dark ? [210, 214, 220] : [40, 44, 52];
    const shells =
      opts.variant === 'halo' ? [0.7, 0.88, 1] : opts.variant === 'well' ? [0.55, 0.78, 1] : [0.72, 1];

    for (const m of this.field) {
      const lat = m.y;
      const north = Math.max(0, lat);
      const eq = 1 - Math.abs(lat);
      const breath = 0.012 * Math.sin(opts.t * 0.9 + m.seed);
      const speakBand = (0.55 * this.wSpeak + 0.9 * this.outS) * north;
      const thinkBand = this.wThink * eq;
      let cr = idleRgb[0];
      let cg = idleRgb[1];
      let cb = idleRgb[2];
      const mix = speakBand + thinkBand;
      if (mix > 0.001) {
        const s = speakBand / (mix || 1);
        const th = thinkBand / (mix || 1);
        const amt = Math.min(1, mix * 1.4);
        cr = (speakRgb[0] * s + thinkRgb[0] * th) * amt + idleRgb[0] * (1 - amt);
        cg = (speakRgb[1] * s + thinkRgb[1] * th) * amt + idleRgb[1] * (1 - amt);
        cb = (speakRgb[2] * s + thinkRgb[2] * th) * amt + idleRgb[2] * (1 - amt);
      }
      for (const shell of shells) {
        if (shell < hollow + 0.08) continue;
        const rr = shell * (1 + breath + this.outS * 0.04 * north);
        const depth = (m.z * shell + 1) / 2;
        n = push(n, m.x * rr, m.y * rr, m.z * rr, 0.65 + depth * 1.45, 0.16 + depth * 0.58 + mix * 0.22, [cr, cg, cb]);
      }
    }

    if (this.wThink > 0.08) {
      const meridians = 7;
      for (let k = 0; k < meridians; k++) {
        const lon = (k / meridians) * Math.PI + opts.t * 0.35;
        for (let s = 0; s < 16; s++) {
          const lat = -0.7 + (s / 15) * 1.4;
          const rr = Math.sqrt(Math.max(0, 1 - lat * lat));
          n = push(
            n,
            Math.cos(lon) * rr * 0.58,
            lat * 0.58,
            Math.sin(lon) * rr * 0.58,
            0.7,
            this.wThink * (0.15 + 0.35 * (0.5 + 0.5 * Math.sin(s * 0.7 + opts.t * 3))),
            thinkRgb
          );
        }
      }
    }

    if (!opts.coreOccupied) {
      n = this.paintInternal(n, push, opts, layout.internalScale, listenRgb, idleRgb);
    }

    for (const m of this.traffic) {
      const rgb = m.kind === 'in' ? listenRgb : speakRgb;
      const depth = (m.z + 1) / 2;
      if (m.kind === 'in') {
        n = push(n, m.x, m.y, m.z, 1.1 + depth * 0.4, 0.35 + m.life * 0.5, rgb);
      } else {
        n = push(n, m.x, m.y, m.z, 1.35 + depth * 0.6, 0.35 + m.life * 0.6, rgb);
      }
    }

    this.flush(ctx, n);
  }

  private paintV2(ctx: CanvasRenderingContext2D, size: number, opts: SeamFrameOpts): void {
    const cx = size / 2;
    const cy = size / 2;
    const knobs = opts.knobs ?? this.knobs;
    const layout = variantLayout(opts.variant);
    const pulse = 1 + knobs.pulse * 0.14 * (0.55 + 0.45 * Math.sin(opts.t * 6.2));
    const R = size * 0.38 * layout.knotScale * pulse;
    const hitchMul =
      knobs.hitch > 0.01 && Math.sin(opts.t * 11.3) > 0.72 ? 1 - knobs.hitch * 1.35 : 1;
    const yaw = opts.t * knobs.yawRate * hitchMul;
    const tilt = knobs.tilt + 0.08 * Math.sin(opts.t * 0.17);
    const proj = makeProj(yaw, tilt, cx, cy, R);
    const px = opts.pointerX * size;
    const py = opts.pointerY * size;
    const fold = opts.pointer * layout.fold;

    ctx.clearRect(0, 0, size, size);
    let n = 0;
    const push = this.pusher(proj, px, py, size, fold, opts, cx, cy, true);

    const bone: [number, number, number] = opts.dark ? [232, 224, 208] : [28, 24, 22];
    const ichor: [number, number, number] = [168, 255, 72];
    const vein: [number, number, number] = [255, 48, 132];
    const voidRgb: [number, number, number] = [90, 70, 255];

    const tube = 0.22 + knobs.tube * 0.28;
    this.ribbon.ensure(this.p, this.q, tube, RIBBON);
    const xs = this.ribbon.xs;
    const ys = this.ribbon.ys;
    const zs = this.ribbon.zs;
    const count = RIBBON + 1;
    const travelSpeed = 0.8 + knobs.travel * 3.2;

    for (let i = 0; i < count; i++) {
      const u = (i / RIBBON) * TAU;
      const along = 0.5 + 0.5 * Math.sin(u * 3 + opts.t * travelSpeed);
      const speakGlow = this.outS * (0.35 + 0.65 * along) * (0.4 + knobs.travel);
      const thinkGlow = knobs.thinking * 0.35 * (0.45 + 0.4 * Math.abs(Math.sin(u * 5 + opts.t * 2.2)));
      const rgb = mixExternal(bone, vein, voidRgb, speakGlow, thinkGlow);
      const [wx, wy, wz] = waveDisplace(xs[i], ys[i], zs[i], u, opts.t, knobs.wave);
      const depth = (wz + 1) / 2;
      n = push(n, wx, wy, wz, 0.7 + depth * 1.1, 0.18 + depth * 0.55, rgb);

      if (knobs.ghost > 0.04 && i % 2 === 0 && i < RIBBON) {
        const [gx, gy, gz] = torusKnot(u + 0.18, 3, 5, 1, 0.22);
        n = push(
          n,
          gx * 0.78,
          gy * 0.78,
          gz * 0.78,
          0.85,
          knobs.ghost * (0.35 + 0.5 * along),
          voidRgb
        );
      }
    }

    const filamentN = knobs.filaments < 0.03 ? 0 : 2 + Math.round(knobs.filaments * 8);
    for (let f = 0; f < filamentN; f++) {
      const base = (f / Math.max(1, filamentN)) * TAU + opts.t * 0.07 * (f % 2 === 0 ? 1 : -1);
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const u = i / (steps - 1);
        const fade = Math.sin(u * Math.PI);
        if (fade < 0.08) continue;
        const a = base + u * 1.7 + Math.sin(opts.t * 0.5 + f) * 0.2;
        const r = 0.55 + 0.35 * u;
        const y = (u - 0.5) * 1.5;
        const x = Math.cos(a) * r * (1 - Math.abs(y) * 0.25);
        const z = Math.sin(a) * r * (1 - Math.abs(y) * 0.25);
        n = push(n, x, y, z, 0.7, fade * (0.12 + knobs.filaments * 0.55), bone);
      }
    }

    const threads = railCount(knobs.railThreads);
    if (threads > 0) {
      const railN = 120;
      const spread = 0.13;
      for (let k = 0; k < threads; k++) {
        const phi = railPhi(k, threads, opts.t, knobs.railSpeed);
        for (let i = 0; i <= railN; i++) {
          const u = (i / railN) * TAU;
          const [x, y, z] = torusKnotRail(u, 2, 3, phi, spread);
          const depth = (z + 1) / 2;
          n = push(n, x, y, z, 0.55 + depth * 0.4, 0.22 + knobs.thinking * 0.35 + depth * 0.2, voidRgb);
        }
      }
    }

    if (!opts.coreOccupied) {
      n = this.paintInternal(n, push, opts, layout.internalScale, ichor, bone);
    }

    for (const m of this.traffic) {
      if (m.kind === 'out') {
        const nRails = railCount(knobs.railThreads);
        const [kx, ky, kz] =
          nRails > 0
            ? torusKnotRail(m.u, 2, 3, railPhi(m.rail, nRails, opts.t, knobs.railSpeed), 0.13)
            : torusKnot(m.u, 2, 3);
        n = push(n, kx, ky, kz, 1.55, 0.45 + m.life * 0.5, vein);
      } else {
        n = push(n, m.x, m.y, m.z, 1.2, 0.4 + m.life * 0.5, ichor);
      }
    }

    if (knobs.rift > 0.03) {
      const rift = 10 + Math.round(knobs.rift * 16);
      for (let i = 0; i < rift; i++) {
        const v = (i / (rift - 1) - 0.5) * (0.28 + knobs.rift * 0.28);
        const wobble = 0.025 * Math.sin(opts.t * 2.4 + i) * (0.25 + knobs.rift);
        const glow = 0.2 + knobs.rift * 0.7 + 0.15 * Math.sin(opts.t * 3 + i * 0.4);
        n = push(n, wobble, v, 0.05, 1.45, glow, bone);
        n = push(n, -wobble * 0.55, v, -0.04, 0.85, glow * 0.55, voidRgb);
      }
    }

    this.flush(ctx, n);
  }

  private paintInternal(
    n: number,
    push: Push,
    opts: SeamFrameOpts,
    scale: number,
    rgb: [number, number, number],
    bone: [number, number, number]
  ): number {
    const shape = opts.internal ?? internalForVariant(opts.variant);
    const knobs = opts.knobs ?? this.knobs;
    const energy = Math.min(1, 0.2 * this.wListen + 0.95 * this.inS);
    const vad = opts.vad * (0.4 + energy);
    const amp = 0.18 + energy * 0.7 + vad * 0.15;
    const breath = 1 + knobs.breath * 0.28 * (0.45 + 0.55 * Math.sin(opts.t * 2.35));
    const rScale = scale * breath * (1 + this.inS * 0.08);

    if (shape === 'helix') {
      const strands = 3;
      const steps = 36;
      for (let s = 0; s < strands; s++) {
        for (let i = 0; i < steps; i++) {
          const u = i / (steps - 1);
          const a = u * TAU * 2.4 + (s * TAU) / strands;
          const rad = rScale * (0.42 + 0.18 * Math.sin(u * Math.PI));
          const y = (u - 0.5) * rScale * 2.1;
          const x = Math.cos(a) * rad;
          const z = Math.sin(a) * rad;
          const depth = (z + 1) / 2;
          n = push(n, x, y, z, 0.85 + depth * 0.5, amp * (0.45 + 0.55 * Math.sin(u * Math.PI)), rgb);
        }
      }
      return n;
    }

    if (shape === 'cube') {
      const s = rScale * 0.72;
      const corners: Array<[number, number, number]> = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1]
      ];
      const edges: Array<[number, number]> = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7]
      ];
      const rot = (x: number, y: number, z: number): [number, number, number] => [x * s, y * s, z * s];
      for (const [a, b] of edges) {
        const segs = 7;
        for (let i = 0; i <= segs; i++) {
          const u = i / segs;
          const x = corners[a][0] + (corners[b][0] - corners[a][0]) * u;
          const y = corners[a][1] + (corners[b][1] - corners[a][1]) * u;
          const z = corners[a][2] + (corners[b][2] - corners[a][2]) * u;
          const [px, py, pz] = rot(x, y, z);
          n = push(n, px, py, pz, 0.95, amp * 0.85, rgb);
        }
      }
      return n;
    }

    const count = 86;
    for (let i = 0; i < count; i++) {
      const [x, y, z] = fibDir(i, count);
      const breath = 1 + 0.04 * Math.sin(opts.t * 2.4 + i * 0.2) * this.inS;
      const depth = (z + 1) / 2;
      const col: [number, number, number] = [
        rgb[0] * amp + bone[0] * (1 - amp),
        rgb[1] * amp + bone[1] * (1 - amp),
        rgb[2] * amp + bone[2] * (1 - amp)
      ];
      n = push(n, x * rScale * breath, y * rScale * breath, z * rScale * breath, 0.7 + depth * 0.7, 0.2 + amp * 0.65, col);
    }
    if (opts.vad > 0.04) {
      const segs = 28;
      const ring = rScale * (1.18 + opts.vad * 0.08);
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * TAU + opts.t * 0.6;
        n = push(n, Math.cos(a) * ring, 0, Math.sin(a) * ring, 0.8, this.inS * opts.vad * 0.55, rgb);
      }
    }
    return n;
  }

  private pusher(
    proj: (x: number, y: number, z: number) => [number, number, number],
    px: number,
    py: number,
    size: number,
    well: number,
    opts: SeamFrameOpts,
    cx: number,
    cy: number,
    fold = false
  ): Push {
    return (n, x, y, z, r, a, rgb) => {
      let [sx, sy, sz] = proj(x, y, z);
      let rr = r;
      let col = rgb;
      if (fold && well > 0.02) {
        const dx = sx - px;
        const dy = sy - py;
        const dist = Math.hypot(dx, dy);
        const rad = size * 0.42;
        if (dist < rad && dist > 0.2) {
          const k = 1 - dist / rad;
          const inf = k * k * (3 - 2 * k) * well;
          const ang = inf * 2.4 * (this.wThink > 0.3 ? -1 : 1);
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          sx = px + dx * ca - dy * sa;
          sy = py + dx * sa + dy * ca;
          rr *= 1 + inf * 0.35;
        }
      } else if (!fold && well > 0.01) {
        const [nx, ny] = springPoint(sx, sy, px, py, size, well);
        sx = nx;
        sy = ny;
      }
      if (opts.barge > 0.02) {
        if (fold) {
          const k = 1 - opts.barge * 0.35;
          sx = cx + (sx - cx) * k;
          sy = cy + (sy - cy) * k;
          const inv = opts.barge;
          col = [255 * inv + col[0] * (1 - inv), 255 * inv + col[1] * (1 - inv), 255 * inv + col[2] * (1 - inv)];
        } else {
          const k = 1 + opts.barge * 0.22;
          sx = cx + (sx - cx) * k;
          sy = cy + (sy - cy) * k;
        }
      }
      const slot = this.pool[n];
      if (slot) {
        slot.x = sx;
        slot.y = sy;
        slot.z = sz;
        slot.r = rr;
        slot.a = a;
        slot.rgb = col;
      } else {
        this.pool[n] = { x: sx, y: sy, z: sz, r: rr, a, rgb: col };
      }
      return n + 1;
    };
  }

  private flush(ctx: CanvasRenderingContext2D, n: number): void {
    const dots = this.pool;
    if (n < 2) {
      if (n === 1 && dots[0].a >= 0.03) fillDot(ctx, dots[0]);
      return;
    }
    const view = dots.slice(0, n);
    view.sort((a, b) => a.z - b.z);
    for (const d of view) {
      if (d.a < 0.03) continue;
      fillDot(ctx, d);
    }
  }

  get weights() {
    return { idle: this.wIdle, listening: this.wListen, thinking: this.wThink, speaking: this.wSpeak };
  }

  get topology() {
    return { p: this.p, q: this.q, tube: this.tube };
  }

  get ribbonClosed(): boolean {
    return this.ribbon.closed;
  }

  get trafficSnapshot(): Array<{ kind: Mote['kind']; u: number; life: number; r: number }> {
    return this.traffic.map((m) => ({ kind: m.kind, u: m.u, life: m.life, r: Math.hypot(m.x, m.y, m.z) }));
  }
}

type Push = (
  n: number,
  x: number,
  y: number,
  z: number,
  r: number,
  a: number,
  rgb: [number, number, number]
) => number;

function railPhi(rail: number, threads: number, t: number, speed: number): number {
  const n = Math.max(1, threads);
  return (rail / n) * TAU + t * (0.12 + speed * 1.35);
}

function mixExternal(
  bone: [number, number, number],
  vein: [number, number, number],
  voidRgb: [number, number, number],
  speak: number,
  think: number
): [number, number, number] {
  const mix = speak + think;
  if (mix <= 0.04) return bone;
  const s = speak / mix;
  const th = think / mix;
  const amt = mix > 1 ? 1 : mix;
  return [
    (vein[0] * s + voidRgb[0] * th) * amt + bone[0] * (1 - amt),
    (vein[1] * s + voidRgb[1] * th) * amt + bone[1] * (1 - amt),
    (vein[2] * s + voidRgb[2] * th) * amt + bone[2] * (1 - amt)
  ];
}

function fillDot(ctx: CanvasRenderingContext2D, d: PaintDot): void {
  const r = d.rgb[0] < 0 ? 0 : d.rgb[0] > 255 ? 255 : d.rgb[0];
  const g = d.rgb[1] < 0 ? 0 : d.rgb[1] > 255 ? 255 : d.rgb[1];
  const b = d.rgb[2] < 0 ? 0 : d.rgb[2] > 255 ? 255 : d.rgb[2];
  ctx.beginPath();
  ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${d.a})`;
  ctx.arc(d.x, d.y, d.r, 0, TAU);
  ctx.fill();
}
