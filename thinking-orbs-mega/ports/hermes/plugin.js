import { atom, host, STATUSBAR_AREAS, PALETTE_AREA, useValue, Tip } from "@hermes/plugin-sdk";
import { useRef, useEffect } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function lerp(a, b, f) {
  return a + (b - a) * f;
}
function frac(x) {
  return x - Math.floor(x);
}
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hashD(xi, yi);
  const b = hashD(xi + 1, yi);
  const c = hashD(xi, yi + 1);
  const d = hashD(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function hashD(a, b) {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}
function fibDir(i, n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - 2 * (i + 0.5) / n;
  const rad = Math.sqrt(1 - y * y);
  const a = i * golden;
  return [rad * Math.cos(a), y, rad * Math.sin(a)];
}
function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
function latLonLattice(latRings, lonDensity, visit) {
  for (let li = 0; li <= latRings; li++) {
    const lat = -Math.PI / 2 + li / latRings * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = lj / lonCount * 2 * Math.PI;
      visit(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), lat, lon);
    }
  }
}
function slerp(a, b, f) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const s = Math.sin(omega);
  if (s < 1e-6) return [a[0], a[1], a[2]];
  const wa = Math.sin((1 - f) * omega) / s;
  const wb = Math.sin(f * omega) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}
function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothE$1(x) {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}
function makeProj(yaw, tilt, cx, cy, scale) {
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cyw = Math.cos(yaw);
  return (x, y, z) => {
    const x1 = x * cyw + z * sy;
    const z1 = -x * sy + z * cyw;
    const y1 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    return [cx + x1 * scale, cy - y1 * scale, z2];
  };
}
function inkStyle(white, alpha, dark, lut) {
  const w = Math.min(1, Math.max(0, white));
  {
    const g = Math.round((dark ? 1 - w : w) * 255);
    return `rgba(${g},${g},${g},${alpha})`;
  }
}
function paint(ctx, dots, dark, rMin = 0.3, lut) {
  for (const d of dots) {
    const alpha = d.a ?? 1;
    ctx.fillStyle = inkStyle(d.white, alpha, dark);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function paintLines(ctx, lines, dark, lut) {
  for (const l of lines) {
    const alpha = l.a ?? 1;
    ctx.strokeStyle = inkStyle(l.white, alpha, dark);
    ctx.lineWidth = l.w;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }
}
function finalizeFrame(dots, lines, rMin = 0.3) {
  const visible = [];
  for (const d of dots) {
    if ((d.a ?? 1) < 0.02) continue;
    d.r = Math.max(rMin, d.r);
    visible.push(d);
  }
  visible.sort((a, b) => a.z - b.z);
  return { dots: visible, lines: lines.filter((l) => (l.a ?? 1) >= 0.02) };
}
function paintFrame(ctx, frame, dark, lut, fade = 1) {
  if (fade <= 0) return;
  const faded = fade >= 1 ? frame : {
    dots: frame.dots.map((d) => ({ ...d, a: (d.a ?? 1) * fade })),
    lines: frame.lines.map((l) => ({ ...l, a: (l.a ?? 1) * fade }))
  };
  if (faded.lines.length) paintLines(ctx, faded.lines, dark);
  paint(ctx, faded.dots, dark, 0.3);
}
function radiusScale(size, pow) {
  return (size / 300) ** pow;
}
class DotBuffer {
  constructor() {
    this.dots = [];
    this.n = 0;
    this.order = [];
    this.lines = [];
    this.lineN = 0;
  }
  /** Drop all live dots and lines without releasing the pools. */
  reset() {
    this.n = 0;
    this.lineN = 0;
  }
  /**
   * Claim the next dot. Returns a pooled object to write into — callers must
   * set every field, since values from previous frames persist.
   */
  next() {
    const i = this.n++;
    let d = this.dots[i];
    if (d === void 0) {
      d = { x: 0, y: 0, z: 0, r: 0, white: 0, a: 1 };
      this.dots[i] = d;
    }
    return d;
  }
  /** Push a fully-specified dot. */
  add(x, y, z, r, white, a = 1) {
    const d = this.next();
    d.x = x;
    d.y = y;
    d.z = z;
    d.r = r;
    d.white = white;
    d.a = a;
  }
  /** Claim the next line. Callers must set every field. */
  nextLine() {
    const i = this.lineN++;
    let l = this.lines[i];
    if (l === void 0) {
      l = { x1: 0, y1: 0, x2: 0, y2: 0, white: 0, a: 1, w: 1 };
      this.lines[i] = l;
    }
    return l;
  }
  addLine(x1, y1, x2, y2, white, w, a = 1) {
    const l = this.nextLine();
    l.x1 = x1;
    l.y1 = y1;
    l.x2 = x2;
    l.y2 = y2;
    l.white = white;
    l.w = w;
    l.a = a;
  }
  /**
   * Sort `order` far→near. Painters rely on this for correct overlap.
   *
   * `order` is a persistent plain array so the sort is in place and allocates
   * nothing per frame — a typed array can't take a comparator that reads the
   * dot pool, and slicing one into a fresh array each frame would reintroduce
   * exactly the garbage this buffer exists to avoid.
   */
  sortByZ() {
    const n = this.n;
    const order = this.order;
    order.length = n;
    for (let i = 0; i < n; i++) order[i] = i;
    const dots = this.dots;
    order.sort((a, b) => dots[a].z - dots[b].z);
  }
}
function asFrame(build) {
  return (size, t, o) => {
    const buf = new DotBuffer();
    build(buf, size, t, o, o.progress);
    const dots = buf.dots.slice(0, buf.n);
    const lines = buf.lines.slice(0, buf.lineN);
    return finalizeFrame(dots, lines, o.rMin);
  };
}
const CALM$1 = 0.3;
const BLOW = 0.5;
const HANG = 0.55;
const BACK = 0.65;
function shatterCycle(settle) {
  return settle > 0 ? CALM$1 + BLOW + HANG + BACK : CALM$1 + BLOW + HANG;
}
const buildShatter = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.44);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const settle = o.settle ?? 1;
  const cyc = shatterCycle(settle);
  const tc = t % cyc;
  let out01;
  let flash = 0;
  if (tc < CALM$1) {
    out01 = 0;
  } else if (tc < CALM$1 + BLOW) {
    const x = (tc - CALM$1) / BLOW;
    out01 = 1 - (1 - x) ** 3;
    flash = 1 - x;
  } else if (tc < CALM$1 + BLOW + HANG || settle <= 0) {
    out01 = 1;
  } else {
    out01 = 1 - smoothE$1((tc - CALM$1 - BLOW - HANG) / BACK);
  }
  const pt = makeProj(t * (o.spin ?? 0.18) + out01 * 0.6, 0.32 + out01 * 0.1, cx, cy, R);
  const dotN = Math.max(4, Math.round(o.dotN ?? 150));
  const blast = o.blast ?? 0.95;
  const rDepth = o.rDepth ?? 1.7;
  const fall = o.fall ?? 0;
  const sag = fall * out01 * out01;
  let tail = 1;
  if (settle <= 0) {
    const fadeFrom = CALM$1 + BLOW + HANG * 0.45;
    if (tc > fadeFrom) tail = Math.max(0, 1 - (tc - fadeFrom) / (HANG * 0.55));
  }
  for (let i = 0; i < dotN; i++) {
    const d = fibDir(i, dotN);
    const speed = 0.55 + 0.6 * hashD(i, 9.4);
    const scale = 1 + blast * out01 * speed;
    const [px, py, z] = pt(d[0] * scale, d[1] * scale - sag * speed, d[2] * scale);
    const depth = (z + 1) / 2;
    const far = 1 / (1 + (o.farK ?? 0.45) * blast * out01 * speed);
    out.add(
      px,
      py,
      z,
      ((o.rBase ?? 1) + rDepth * depth) * far * (1 + (o.rFlash ?? 0.7) * flash) * rs,
      (o.inkFar ?? 0.66) - (o.inkSpan ?? 0.54) * depth + (o.inkOut ?? 0.2) * out01 - 0.16 * flash,
      (o.dotA ?? 1) * tail
    );
  }
};
const SPLIT = 0.7;
const HOLD$4 = 0.85;
const MERGE = 0.7;
const REST = 0.35;
const CYC$2 = SPLIT + HOLD$4 + MERGE + REST;
const buildCluster = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.84;
  const pt = makeProj(t * (o.spin ?? 0.2), 0.34, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dotN = Math.max(4, Math.round(o.dotN ?? 150));
  const groups = Math.max(2, Math.round(o.groups ?? 3));
  const spread = o.spread ?? 0.62;
  const tc = t % CYC$2;
  let apart;
  if (tc < SPLIT) apart = smoothE$1(tc / SPLIT);
  else if (tc < SPLIT + HOLD$4) apart = 1;
  else if (tc < SPLIT + HOLD$4 + MERGE) apart = 1 - smoothE$1((tc - SPLIT - HOLD$4) / MERGE);
  else apart = 0;
  const cycle = Math.floor(t / CYC$2);
  const winner = Math.floor(hashD(cycle, 6.1) * groups) % groups;
  const verdict = apart > 0.85 ? (apart - 0.85) / 0.15 : 0;
  for (let i = 0; i < dotN; i++) {
    const home = fibDir(i, dotN);
    const g = i % groups;
    const ga = g / groups * Math.PI * 2;
    const gx = Math.cos(ga) * spread;
    const gz = Math.sin(ga) * spread;
    const gy = (hashD(g, 2.2) - 0.5) * 0.3 * spread;
    const shrink = 1 - 0.52 * apart;
    const x = home[0] * shrink + gx * apart;
    const y = home[1] * shrink + gy * apart;
    const z0 = home[2] * shrink + gz * apart;
    const [px, py, z] = pt(x, y, z0);
    const depth = (z + 1) / 2;
    const won = g === winner ? verdict : 0;
    out.add(
      px,
      py,
      z,
      ((o.rBase ?? 0.7) + (o.rDepth ?? 1.7) * depth + (o.rWinner ?? 0.8) * won) * rs,
      (o.inkFar ?? 0.66) - (o.inkSpan ?? 0.54) * depth - (o.inkWinner ?? 0.22) * won,
      o.dotA ?? 0.95
    );
  }
};
const YAW = Math.PI / 4;
const TILT = Math.PI / 6;
const DEPTH_EXTENT = Math.sqrt(3);
const VERTICES = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1]
];
const EDGES = [
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
function cubeRadius(size, scale = 1) {
  return size / 2 * 0.52 * scale;
}
function makeCubeProj(yawOffset, tiltOffset, cx, cy, scale) {
  return makeProj(YAW + yawOffset, TILT + tiltOffset, cx, cy, scale);
}
function cubeSurface(point, halfExtent = 1) {
  const m = Math.max(Math.abs(point[0]), Math.abs(point[1]), Math.abs(point[2]));
  if (m < 1e-6) return [0, 0, 0];
  const scale = halfExtent / m;
  return [point[0] * scale, point[1] * scale, point[2] * scale];
}
function cubeFaceGrid(divisions) {
  const n = Math.max(2, Math.round(divisions));
  const samples = [];
  for (let face = 0; face < 6; face++) {
    for (let yi = 0; yi < n; yi++) {
      const v = -1 + yi / (n - 1) * 2;
      for (let xi = 0; xi < n; xi++) {
        const u = -1 + xi / (n - 1) * 2;
        let point;
        if (face === 0) point = [1, u, v];
        else if (face === 1) point = [-1, u, v];
        else if (face === 2) point = [u, 1, v];
        else if (face === 3) point = [u, -1, v];
        else if (face === 4) point = [u, v, 1];
        else point = [u, v, -1];
        samples.push(point);
      }
    }
  }
  return samples;
}
function cubeEdgePoint(edgeIndex, f, halfExtent = 1) {
  const edge = EDGES[(edgeIndex % EDGES.length + EDGES.length) % EDGES.length];
  const a = VERTICES[edge[0]];
  const b = VERTICES[edge[1]];
  const t = Math.max(0, Math.min(1, f));
  return [
    (a[0] + (b[0] - a[0]) * t) * halfExtent,
    (a[1] + (b[1] - a[1]) * t) * halfExtent,
    (a[2] + (b[2] - a[2]) * t) * halfExtent
  ];
}
function cubeWirePoints(perEdge, halfExtent = 1) {
  const n = Math.max(2, Math.round(perEdge));
  const points = [];
  for (let edge = 0; edge < EDGES.length; edge++) {
    for (let i = 0; i < n; i++) points.push(cubeEdgePoint(edge, i / (n - 1), halfExtent));
  }
  return points;
}
const buildCube = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = cubeRadius(size, o.spread ?? 1);
  const pt = makeCubeProj(t * 0.28, 0.06 * Math.sin(t * 0.35), cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.7;
  const rDepth = o.rDepth ?? 1.4;
  const faces = cubeFaceGrid(o.divs ?? 5);
  for (const p of faces) {
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(
      px,
      py,
      z,
      (rBase + rDepth * depth) * rs,
      0.62 - 0.4 * depth,
      0.28 + 0.55 * depth
    );
  }
  const perEdge = Math.max(3, Math.round(o.edgeN ?? 7));
  const wires = cubeWirePoints(perEdge);
  for (const p of wires) {
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z + 0.01, (rBase + rDepth * 0.35 + 0.6 * depth) * rs, 0.18, 0.55 + 0.4 * depth);
  }
  const packets = Math.max(1, Math.round(o.particles ?? 3));
  for (let s = 0; s < packets; s++) {
    const u = (t * 0.35 + s / packets) % 1;
    const edge = Math.floor((u * EDGES.length + s * 3) % EDGES.length);
    const f = u * EDGES.length % 1;
    const p = cubeEdgePoint(edge, f);
    const [px, py, z] = pt(p[0], p[1], p[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z + 0.02, (rBase + rDepth * depth + 1.2) * rs, 0.08, 0.7 + 0.3 * depth);
  }
  const ghostN = o.ghostN ?? 24;
  for (let i = 0; i < ghostN; i++) {
    const d = cubeSurface(fibDir(i, ghostN), 0.92);
    const [px, py, z] = pt(d[0], d[1], d[2]);
    const depth = Math.max(0, Math.min(1, (z / (R * DEPTH_EXTENT) + 1) / 2));
    out.add(px, py, z, 0.55 * rs, 0.78, 0.08 + 0.16 * depth);
  }
};
const CALM = 0.25;
const BREAK = 0.35;
const FORM = 0.6;
const HOLD$3 = 0.85;
const faultCycle = () => CALM + BREAK + FORM;
const LOOP = CALM + BREAK + FORM + HOLD$3;
const buildFault = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.6);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const tc = t % LOOP;
  let broken = 0;
  let formed = 0;
  if (tc < CALM) {
    broken = 0;
  } else if (tc < CALM + BREAK) {
    const x = (tc - CALM) / BREAK;
    broken = 1 - (1 - x) ** 3;
  } else if (tc < CALM + BREAK + FORM) {
    broken = 1;
    formed = smoothE$1((tc - CALM - BREAK) / FORM);
  } else {
    broken = 1;
    formed = 1;
  }
  const pt = makeProj(t * (o.spin ?? 0.35) * (1 - formed), 0, cx, cy, R);
  const dotN = Math.max(6, Math.round(o.dotN ?? 34));
  const blast = o.blast ?? 1.5;
  const arm = o.arm ?? 0.82;
  const perStroke = Math.ceil(dotN / 2);
  for (let i = 0; i < dotN; i++) {
    const home = fibDir(i, dotN);
    const speed = 0.6 + 0.8 * hashD(i, 9.4);
    const bs = 1 + blast * broken * speed;
    const sx = home[0] * bs;
    const sy = home[1] * bs;
    const sz = home[2] * bs;
    const stroke = i % 2;
    const idx = (i - stroke) / 2;
    const f = perStroke > 1 ? idx / (perStroke - 1) : 0.5;
    const span = arm / (o.reach ?? 0.6);
    const along = -span + 2 * span * f;
    const tx = along;
    const ty = stroke === 0 ? along : -along;
    const x = sx + (tx - sx) * formed;
    const y = sy + (ty - sy) * formed;
    const z = sz + (0 - sz) * formed;
    const [px, py, pz] = pt(x, y, z);
    const depth = (pz + 1) / 2;
    const depthInk = (o.inkFar ?? 0.66) - (o.inkSpan ?? 0.54) * depth;
    const flatInk = o.inkX ?? 0.1;
    out.add(
      px,
      py,
      pz,
      ((o.rBase ?? 0.9) + (o.rDepth ?? 1.6) * depth * (1 - formed) + (o.rX ?? 1.5) * formed) * rs,
      depthInk + (flatInk - depthInk) * formed,
      o.dotA ?? 1
    );
  }
};
function hourglassR(y, waist) {
  return waist + (1 - waist) * Math.abs(y);
}
function shell(out, o, pt, rs, waist) {
  const shellN = Math.max(4, Math.round(o.shellN ?? 22));
  const rings = Math.max(2, Math.round(o.shellRings ?? 7));
  for (let ri = 0; ri < rings; ri++) {
    const y = -1 + 2 * ri / (rings - 1);
    const rr = hourglassR(y, waist);
    const n = Math.max(3, Math.round(shellN * rr));
    for (let i = 0; i < n; i++) {
      const ang = i / n * Math.PI * 2;
      const [px, py, z] = pt(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
      const depth = (z + 1) / 2;
      out.add(
        px,
        py,
        z,
        // the shell recedes by ink, not by being translucent
        ((o.rShell ?? 0.85) + (o.rDepth ?? 1.5) * depth) * rs,
        (o.inkShell ?? 0.66) - 0.34 * depth,
        o.shellA ?? 0.88
      );
    }
  }
}
const buildFunnel = (out, size, t, o, progress) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.8;
  const pt = makeProj(t * (o.spin ?? 0.2), 0.3, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const waist = o.waist ?? 0.16;
  shell(out, o, pt, rs, waist);
  const partN = Math.max(2, Math.round(o.partN ?? 60));
  const rPart = o.rPart ?? 1.45;
  const rDepth = o.rDepth ?? 1.5;
  const addPart = (x, y, zz, hot) => {
    const [px, py, z] = pt(x, y, zz);
    const depth = (z + 1) / 2;
    out.add(
      px,
      py,
      z + 0.02,
      (rPart + rDepth * depth + (o.rHot ?? 0.5) * hot) * rs,
      (o.inkPart ?? 0.26) - 0.2 * depth - 0.12 * hot,
      1
    );
  };
  if (progress === void 0) {
    for (let i = 0; i < partN; i++) {
      const phase = hashD(i, 1.9);
      const p2 = (t * (o.flowRate ?? 0.5) + phase) % 1;
      const y = 1 - 2 * p2;
      const squeeze = 1 - Math.exp(-(y * y / 0.08));
      const rr = hourglassR(y, waist) * (0.25 + 0.7 * hashD(i, 5.1)) * squeeze;
      const ang = hashD(i, 8.3) * Math.PI * 2 + t * 0.8;
      addPart(Math.cos(ang) * rr, y, Math.sin(ang) * rr, 1 - Math.min(1, Math.abs(y) / 0.3));
    }
    return;
  }
  const p = clamp01(progress);
  const landed = Math.round(p * partN);
  for (let i = 0; i < partN; i++) {
    const ang = hashD(i, 8.3) * Math.PI * 2;
    const jitter = 0.3 + 0.65 * hashD(i, 5.1);
    if (i < landed) {
      const fill = landed > 1 ? i / landed : 0;
      const y = -1 + fill * 0.85;
      const rr = hourglassR(y, waist) * jitter;
      addPart(Math.cos(ang) * rr, y, Math.sin(ang) * rr, 0);
    } else {
      const remain = partN - landed;
      const fill = remain > 1 ? (i - landed) / remain : 0;
      const y = 1 - fill * 0.8;
      const rr = hourglassR(y, waist) * jitter;
      const a = ang + t * 0.35;
      addPart(Math.cos(a) * rr, y, Math.sin(a) * rr, 0);
    }
  }
  if (p < 1) {
    const y = 0.32 * Math.cos(t * 3.4);
    const rr = hourglassR(y, waist) * 0.3;
    addPart(rr, y, 0, 1);
  }
};
const buildVortex = (out, size, t, o, progress) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.86;
  const pt = makeProj(t * (o.spin ?? 0.14), o.tilt ?? 0.52, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const partN = Math.max(2, Math.round(o.partN ?? 130));
  const turns = o.turns ?? 2.2;
  const disk = o.disk ?? 0.28;
  const rDepth = o.rDepth ?? 1.6;
  const arms = Math.max(1, Math.round(o.arms ?? 3));
  const addSpiral = (i, rad, extraSpin) => {
    const h = hashD(i, 3.7);
    const arm = i % arms;
    const jitter = (h - 0.5) * (o.armJitter ?? 0.34);
    const ang = turns * 2 * Math.PI * (1 - rad) + arm / arms * 2 * Math.PI + jitter + extraSpin;
    const y = (hashD(i, 6.2) - 0.5) * 2 * disk * rad;
    const [px, py, z] = pt(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
    const depth = (z + 1) / 2;
    const near = 1 - rad;
    out.add(
      px,
      py,
      z,
      ((o.rPart ?? 0.95) + rDepth * depth + (o.rHot ?? 0.7) * near) * rs,
      (o.inkFar ?? 0.66) - (o.inkSpan ?? 0.5) * depth - 0.14 * near,
      o.partA ?? 0.95
    );
  };
  const addCore = (n, scale) => {
    for (let i = 0; i < n; i++) {
      const d = fibDir(i, Math.max(1, n));
      const [px, py, z] = pt(d[0] * scale, d[1] * scale, d[2] * scale);
      const depth = (z + 1) / 2;
      out.add(
        px,
        py,
        z + 0.02,
        ((o.rCore ?? 1.1) + rDepth * depth) * rs,
        (o.inkCore ?? 0.16) - 0.1 * depth,
        1
      );
    }
  };
  if (progress === void 0) {
    const rate = o.flowRate ?? 0.34;
    for (let i = 0; i < partN; i++) {
      const p2 = (t * rate + hashD(i, 1.3)) % 1;
      const rad = 1 - p2;
      if (rad < 0.14) continue;
      addSpiral(i, rad, 0);
    }
    addCore(Math.max(1, Math.round(o.coreN ?? 12)), 0.15);
    return;
  }
  const p = clamp01(progress);
  const landed = Math.round(p * partN);
  const coreN = Math.max(1, Math.round(o.coreN ?? 12));
  addCore(Math.max(1, Math.round(coreN * (0.35 + 0.65 * p))), 0.1 + 0.14 * p);
  for (let i = landed; i < partN; i++) {
    const remain = partN - landed;
    const f = remain > 1 ? (i - landed) / remain : 0;
    addSpiral(i, 0.2 + 0.8 * f, t * 0.5);
  }
};
const NEIGHBOURS = 3;
const PERIOD = 24;
const cache$2 = /* @__PURE__ */ new Map();
function constellation(n) {
  const hit = cache$2.get(n);
  if (hit) return hit;
  const nodes = [];
  for (let i = 0; i < n; i++) nodes.push(fibDir(i, n));
  const adj = [];
  for (let i = 0; i < n; i++) {
    const scored = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d = nodes[i][0] * nodes[j][0] + nodes[i][1] * nodes[j][1] + nodes[i][2] * nodes[j][2];
      scored.push([j, d]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    adj.push(scored.slice(0, Math.min(NEIGHBOURS, scored.length)).map((s) => s[0]));
  }
  const seen = /* @__PURE__ */ new Set();
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }
  const walk = [0];
  for (let s = 1; s < PERIOD; s++) {
    const from = walk[s - 1];
    const opts = adj[from];
    let next = opts[Math.floor(hashD(s, 3.3) * opts.length) % opts.length];
    if (s > 1 && next === walk[s - 2] && opts.length > 1) {
      next = opts[(opts.indexOf(next) + 1) % opts.length];
    }
    walk.push(next);
  }
  const built = { nodes, adj, edges, walk };
  cache$2.set(n, built);
  return built;
}
const buildGraph = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.84;
  const pt = makeProj(t * (o.spin ?? 0.16), 0.34, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const n = Math.max(4, Math.round(o.nodeN ?? 22));
  const { nodes, edges, walk } = constellation(n);
  const step = Math.floor(t);
  const local = t - step;
  const cur = walk[step % PERIOD];
  const nxt = walk[(step + 1) % PERIOD];
  const trail = Math.max(1, Math.round(o.trail ?? 4));
  const seg = Math.max(2, Math.round(o.edgeSeg ?? 5));
  for (const [i, j] of edges) {
    const active = i === cur && j === nxt || j === cur && i === nxt ? 1 : 0;
    for (let s = 1; s < seg; s++) {
      const f = s / seg;
      const [ux, uy, uz] = slerp(nodes[i], nodes[j], f);
      const [px, py, z] = pt(ux, uy, uz);
      const depth = (z + 1) / 2;
      out.add(
        px,
        py,
        z,
        ((o.rEdge ?? 0.5) + (o.rDepth ?? 1.1) * depth * 0.5 + (o.rEdgeHot ?? 0.5) * active) * rs,
        (o.inkEdge ?? 0.66) - 0.24 * depth - (o.inkEdgeHot ?? 0.3) * active,
        o.edgeA ?? 0.85
      );
    }
  }
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
    const depth = (z + 1) / 2;
    let age = -1;
    for (let k = 0; k < trail; k++) {
      if (walk[(step - k + PERIOD * 2) % PERIOD] === i) {
        age = k;
        break;
      }
    }
    const glow = age < 0 ? 0 : 1 - age / trail;
    out.add(
      px,
      py,
      z,
      ((o.rNode ?? 1.35) + (o.rDepth ?? 1.1) * depth + (o.rGlow ?? 1.9) * glow) * rs,
      (o.inkNode ?? 0.5) - 0.34 * depth - (o.inkGlow ?? 0.44) * glow,
      (o.nodeA ?? 0.92) + (1 - (o.nodeA ?? 0.92)) * glow
    );
  }
  const edgeDots = Math.max(2, Math.round(o.edgeN ?? 5));
  for (let k = 0; k < edgeDots; k++) {
    const f = local - k / edgeDots * (o.cometLen ?? 0.32);
    if (f < 0 || f > 1) continue;
    const [ux, uy, uz] = slerp(nodes[cur], nodes[nxt], f);
    const [px, py, z] = pt(ux, uy, uz);
    const depth = (z + 1) / 2;
    const fade = 1 - k / edgeDots;
    out.add(
      px,
      py,
      z + 0.01,
      ((o.rTravel ?? 1.3) + (o.rDepth ?? 1.1) * depth) * fade * rs,
      0.1 - 0.06 * depth,
      fade
    );
  }
};
const buildRaster = (out, size, t, o, progress) => {
  const cols = Math.max(2, Math.round(o.cols ?? 12));
  const rows = Math.max(2, Math.round(o.rows ?? 12));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const inset = (o.inset ?? 0.13) * size;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const stepX = cols > 1 ? w / (cols - 1) : 0;
  const stepY = rows > 1 ? h / (rows - 1) : 0;
  let sweep;
  if (progress === void 0) {
    const period = o.period ?? 1.35;
    const cyc = t / period % 1;
    sweep = Math.min(1, cyc / 0.86) * rows;
  } else {
    sweep = clamp01(progress) * rows;
  }
  const band = o.band ?? 1.4;
  const cursor = progress === void 0 ? t * (o.cursorRate ?? 4.2) % 1 * cols : cols;
  const rBase = o.rBase ?? 1.6;
  const rActive = o.rActive ?? 1.7;
  const inkAhead = o.inkAhead ?? 0.62;
  const inkRead = o.inkRead ?? 0.36;
  const inkActive = o.inkActive ?? 0.06;
  for (let ry = 0; ry < rows; ry++) {
    const dist = ry - sweep;
    const inBand = Math.exp(-(dist / band * (dist / band)));
    const read = dist < 0;
    for (let cxi = 0; cxi < cols; cxi++) {
      const atCursor = inBand > 0.35 && Math.abs(cxi - cursor) < 1.2 ? 1 : 0;
      const hot = Math.max(inBand * (cxi <= cursor ? 1 : 0.35), atCursor);
      const ink = read ? inkRead : inkAhead;
      out.add(
        inset + cxi * stepX,
        inset + ry * stepY,
        // tiny z bias so the painter's fillStyle runs stay long
        hot > 0.4 ? 1 : 0,
        (rBase + rActive * hot) * rs,
        ink - (ink - inkActive) * hot,
        (o.baseA ?? 0.9) + (1 - (o.baseA ?? 0.9)) * Math.max(read ? 0.5 : 0, hot)
      );
    }
  }
};
const buildCascade = (out, size, t, o, progress) => {
  const cols = Math.max(2, Math.round(o.cols ?? 14));
  const rows = Math.max(2, Math.round(o.rows ?? 9));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const inset = (o.inset ?? 0.12) * size;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const stepX = cols > 1 ? w / (cols - 1) : 0;
  const stepY = rows > 1 ? h / (rows - 1) : 0;
  const ragged = o.ragged ?? 0.42;
  const lineLen = (r) => Math.max(2, Math.round(cols * (1 - ragged * hashD(r, 4.4))));
  let total = 0;
  for (let r = 0; r < rows; r++) total += lineLen(r);
  let frac2;
  if (progress === void 0) {
    const cyc = t / (o.period ?? 2.6) % 1;
    const hold = o.holdFrac ?? 0.22;
    const floorFrac = o.floorFrac ?? 0.14;
    frac2 = floorFrac + (1 - floorFrac) * Math.min(1, cyc / (1 - hold));
  } else {
    frac2 = clamp01(progress);
  }
  const written = Math.max(o.minCells ?? 7, frac2 * total);
  const rBase = o.rBase ?? 1.55;
  const rHead = o.rHead ?? 1.5;
  const inkWritten = o.inkWritten ?? 0.5;
  const inkHead = o.inkHead ?? 0.06;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const len = lineLen(r);
    for (let c = 0; c < len; c++, idx++) {
      const behind = written - idx;
      if (behind <= 0) continue;
      const hot = behind < 2.5 ? 1 - behind / 2.5 : 0;
      out.add(
        inset + c * stepX,
        inset + r * stepY,
        hot > 0.4 ? 1 : 0,
        (rBase + rHead * hot) * rs,
        inkWritten - (inkWritten - inkHead) * hot,
        o.dotA ?? 0.95
      );
    }
  }
};
const buildHelix = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.84;
  const pt = makeProj(0, o.tilt ?? 0.22, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const coil = Math.max(4, Math.round(o.coil ?? 46));
  const pitch = o.pitch ?? 2.6;
  const spin = t * (o.spin ?? 1.15);
  const taper = o.taper ?? 0.45;
  const rBase = o.rBase ?? 0.8;
  const rDepth = o.rDepth ?? 1.7;
  const inkFar = o.inkFar ?? 0.66;
  const inkSpan = o.inkSpan ?? 0.54;
  const rad = (y) => 1 - taper + taper * Math.cos(y * Math.PI / 2);
  const strandAt = (k, s) => {
    const y = -1 + 2 * k / coil;
    const ang = pitch * Math.PI * y + spin + s * Math.PI;
    const rr = rad(y) * 0.78;
    return [Math.cos(ang) * rr, y * 0.9, Math.sin(ang) * rr];
  };
  for (let s = 0; s < 2; s++) {
    for (let k = 0; k <= coil; k++) {
      const [x, y, z0] = strandAt(k, s);
      const [px, py, z] = pt(x, y, z0);
      const depth = (z + 1) / 2;
      out.add(px, py, z, (rBase + rDepth * depth) * rs, inkFar - inkSpan * depth, o.strandA ?? 1);
    }
  }
  const every = Math.max(1, Math.round(o.rungEvery ?? 6));
  const rungDots = Math.max(1, Math.round(o.rungDots ?? 3));
  for (let k = 0; k <= coil; k += every) {
    const a = strandAt(k, 0);
    const b = strandAt(k, 1);
    for (let i = 1; i <= rungDots; i++) {
      const f = i / (rungDots + 1);
      const [px, py, z] = pt(
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f
      );
      const depth = (z + 1) / 2;
      out.add(
        px,
        py,
        z,
        ((o.rRung ?? 0.55) + rDepth * depth * 0.5) * rs,
        // rungs sit back from the strands via ink, not translucency
        (o.inkRung ?? 0.66) - 0.26 * depth,
        o.rungA ?? 0.9
      );
    }
  }
};
const buildIgnite = (out, size, t, o, progress) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.88);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rings = Math.max(2, Math.round(o.rings ?? 7));
  const ringDots = Math.max(3, Math.round(o.ringDots ?? 26));
  const spin = t * (o.spin ?? 0.1);
  let fill;
  if (progress === void 0) {
    const cyc = t / (o.period ?? 2.8) % 1;
    fill = Math.min(1, cyc / (1 - (o.holdFrac ?? 0.26)));
  } else {
    fill = clamp01(progress);
  }
  const front = o.frontWidth ?? 0.16;
  for (let ri = 0; ri < rings; ri++) {
    const f = rings > 1 ? ri / (rings - 1) : 0;
    const rad = f;
    const n = Math.max(3, Math.round(ringDots * Math.max(0.22, rad)));
    const off = spin * (ri % 2 === 0 ? 1 : -1) + ri * 0.5;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + off;
      const lit = rad <= fill ? 1 : 0;
      const d = (rad - fill) / front;
      const edge = Math.exp(-d * d);
      const hot = Math.max(lit * 0.85, edge);
      out.add(
        cx + Math.cos(a) * rad * R,
        cy + Math.sin(a) * rad * R,
        hot > 0.5 ? 1 : 0,
        ((o.rBase ?? 1.2) + (o.rHot ?? 0.7) * hot) * rs,
        // unlit territory is dark but present, not translucent
        (o.inkCold ?? 0.68) - (o.inkCold ?? 0.68 - 0.08) * hot,
        o.dotA ?? 0.95
      );
    }
  }
  out.add(cx, cy, 2, ((o.rSeed ?? 1.7) + (o.rPulse ?? 0.5) * (1 - fill)) * rs, 0.06, 1);
};
const frameBraid = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.76;
  const pt = makeProj(t * 0.4, 0.3, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const ghostN = o.ghostN ?? 150;
  for (let i = 0; i < ghostN; i++) {
    const d = fibDir(i, ghostN);
    const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R);
    const depth = (z / R + 1) / 2;
    dots.push({ x: px, y: py, z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth });
  }
  const strandN = o.strandN ?? 52;
  const turns = o.turns ?? 3;
  for (let s = 0; s < 3; s++) {
    const phase = s / 3 * 2 * Math.PI;
    for (let i = 0; i < strandN; i++) {
      const u = (frac(i / strandN + t * 0.045) * 2 - 1) * 0.96;
      const surf = Math.sqrt(Math.max(0, 1 - u * u));
      const endFade = Math.min(1, (1 - Math.abs(u)) / 0.1);
      const a = u * Math.PI * turns + phase;
      const weave = 1 + 0.075 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * 0.8);
      const rr = surf * R * weave;
      const [px, py, zr] = pt(Math.cos(a) * rr, u * R * weave, Math.sin(a) * rr);
      const depth = (zr / R + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: zr,
        r: ((o.rBase ?? 1.2) + (o.rDepth ?? 1.8) * depth) * rs,
        white: 0.55 - 0.45 * depth,
        a: endFade * (0.45 + 0.55 * depth)
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
function solveCycle(time, count, slotDur, rest) {
  const cyc = 2 * count * slotDur + rest;
  const tc = time % cyc;
  const amount = new Array(count).fill(0);
  let active = -1;
  if (tc < 2 * count * slotDur) {
    const slot = Math.floor(tc / slotDur);
    const p = (tc - slot * slotDur) / slotDur;
    const cl = Math.min(1, p / 0.7);
    const ep = 1 - (1 - cl) ** 3;
    if (slot < count) {
      for (let i = 0; i < slot; i++) amount[i] = 1;
      amount[slot] = ep;
      active = slot;
    } else {
      const u = 2 * count - 1 - slot;
      for (let i = 0; i < u; i++) amount[i] = 1;
      amount[u] = 1 - ep;
      active = u;
    }
  }
  return { amount, active };
}
function applyMoves(pt3, moves, sc) {
  let [x, y, z] = pt3;
  let inActive = false;
  for (let i = 0; i < moves.length; i++) {
    if (sc.amount[i] <= 0) continue;
    const mv = moves[i];
    const coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
    if (coord < mv.lo || coord >= mv.hi) continue;
    if (i === sc.active) inActive = true;
    const a = mv.ang * sc.amount[i];
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (mv.axis === 0) {
      const y2 = y * ca - z * sa;
      z = y * sa + z * ca;
      y = y2;
    } else if (mv.axis === 1) {
      const x2 = x * ca + z * sa;
      z = -x * sa + z * ca;
      x = x2;
    } else {
      const x2 = x * ca - y * sa;
      y = x * sa + y * ca;
      x = x2;
    }
  }
  return [x, y, z, inActive];
}
function makeMoves(count) {
  const moves = [];
  for (let i = 0; i < count; i++) {
    const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3));
    const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
    const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi: lo + 0.5, ang: dir * Math.PI / 2 });
  }
  return moves;
}
const frameGlobe = (size, t, o) => {
  const spin = 0.5;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 * 0.82;
  const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
  const pt = makeProj(t * spin, tilt, cx, cy, radius);
  const scan = t * (spin + (1.7 - spin) * (o.scanMul ?? 1));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dimBase = o.dimBase ?? 1;
  const dots = [];
  const latRings = o.latRings ?? 17;
  const lonDensity = o.lonDensity ?? 44;
  for (let li = 0; li <= latRings; li++) {
    const lat = -Math.PI / 2 + li / latRings * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = lj / lonCount * 2 * Math.PI;
      const [px, py, z] = pt(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon));
      const depth = (z + 1) / 2;
      const d = angleDelta(lon + t * spin, scan);
      const boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z);
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth + (o.rBoost ?? 1) * boost) * rs,
        white: (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
        // dimBase < 1 fades un-scanned dots so the meridian reads clearly
        a: dimBase + (1 - dimBase) * Math.min(1, boost)
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameRubik = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.82;
  const pt = makeProj(t * 0.55, 0.35 + 0.1 * Math.sin(t * 0.9), cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const moveCount = o.moveCount ?? 14;
  const moves = makeMoves(moveCount);
  const sc = solveCycle(t, moveCount, 0.42, 1.2);
  const dots = [];
  const latRings = o.latRings ?? 15;
  const lonDensity = o.lonDensity ?? 40;
  for (let li = 0; li <= latRings; li++) {
    const lat = -Math.PI / 2 + li / latRings * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = lj / lonCount * 2 * Math.PI;
      const [x, y, z, inActive] = applyMoves([cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon)], moves, sc);
      const [px, py, zr] = pt(x, y, z);
      const depth = (zr + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: zr,
        r: ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth + (inActive ? o.rActive ?? 0.3 : 0)) * rs,
        white: (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth - (inActive ? 0.14 : 0)
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameWave = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.874;
  const pt = makeProj(t * 0.18, 0.38, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const rings = o.rings ?? 15;
  const lonDensity = o.lonDensity ?? 40;
  for (let ri = 0; ri <= rings; ri++) {
    const lat = -Math.PI / 2 + ri / rings * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const w = 0.62 * Math.sin(t * 2.1 - ri * 0.52) + 0.38 * Math.sin(t * 1.27 + ri * 0.83);
    const rr = R * (0.88 + 0.105 * w);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = lj / lonCount * 2 * Math.PI;
      const [px, py, z] = pt(cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr);
      const depth = (z / R + 1) / 2;
      const crest = Math.max(0, w);
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth) * (1 + 0.4 * crest) * rs,
        white: 0.66 - 0.56 * depth - 0.1 * crest
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
function smoothE(x) {
  return x * x * (3 - 2 * x);
}
function polyPath(verts) {
  const V = verts.length;
  const L = [];
  let total = 0;
  for (let i = 0; i < V; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % V];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    L.push(l);
    total += l;
  }
  return (f) => {
    let target = f * total;
    let i = 0;
    while (target > L[i] && i < V - 1) {
      target -= L[i];
      i++;
    }
    const a = verts[i];
    const b = verts[(i + 1) % V];
    const ff = L[i] ? Math.min(1, target / L[i]) : 0;
    return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff];
  };
}
const CIRCLE = (f) => {
  const a = -Math.PI / 2 + f * 2 * Math.PI;
  return [Math.cos(a) * 0.24, Math.sin(a) * 0.24];
};
const TRIANGLE = polyPath([
  [0, -0.26],
  [0.24, 0.16],
  [-0.24, 0.16]
]);
const SQUARE = polyPath([
  [0, -0.2],
  [0.2, -0.2],
  [0.2, 0.2],
  [-0.2, 0.2],
  [-0.2, -0.2]
]);
const CYCLE = [CIRCLE, TRIANGLE, SQUARE];
function morphN(d) {
  return Math.max(6, Math.round(34 * d));
}
const HOLD$2 = 1.4;
const MORPH = 0.9;
const SEG = HOLD$2 + MORPH;
function resolveMorphOutline(t, o) {
  const K = CYCLE.length;
  const tc = t % (SEG * K);
  const k = Math.floor(tc / SEG);
  const local = tc - k * SEG;
  const m = local > HOLD$2 ? smoothE((local - HOLD$2) / MORPH) : 0;
  const sprd = o.spread ?? 1;
  const pA = CYCLE[k];
  const pB = CYCLE[(k + 1) % K];
  const M = 160;
  const points = [];
  for (let i = 0; i < M; i++) {
    const f = i / M;
    const a = pA(f);
    const b = pB(f);
    points.push([(a[0] + (b[0] - a[0]) * m) * sprd, (a[1] + (b[1] - a[1]) * m) * sprd]);
  }
  return { points, pulse: 1 + 0.02 * Math.sin(local * 3.1) };
}
const frameMorph = (size, t, o) => {
  const { points: pts, pulse } = resolveMorphOutline(t, o);
  const M = pts.length;
  const L = [];
  let total = 0;
  for (let i = 0; i < M; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % M];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    L.push(l);
    total += l;
  }
  const n = morphN(o.iconD ?? 1);
  const re = (o.rDot ?? 0.021) * 1.35 * (o.spread ?? 1);
  const dots = [];
  const c2 = size / 2;
  let seg = 0;
  let acc = 0;
  for (let k2 = 0; k2 < n; k2++) {
    const target = k2 / n * total;
    while (acc + L[seg] < target && seg < M - 1) {
      acc += L[seg];
      seg++;
    }
    const a = pts[seg];
    const b = pts[(seg + 1) % M];
    const f = L[seg] ? Math.min(1, (target - acc) / L[seg]) : 0;
    const x = (a[0] + (b[0] - a[0]) * f) * pulse;
    const y = (a[1] + (b[1] - a[1]) * f) * pulse;
    dots.push({
      x: c2 + x * size,
      y: c2 + y * size,
      z: 0,
      r: Math.max(0.35, re * size),
      white: 0.1
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameOrbits = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.82;
  const pt = makeProj(t * 0.12, 0.3, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const orbitN = o.orbitN ?? 12;
  const ghostN = o.ghostN ?? 40;
  const particles = o.particles ?? 3;
  for (let orb = 0; orb < orbitN; orb++) {
    const h1 = hashD(orb, 1.7);
    const h2 = hashD(orb, 5.2);
    const h3 = hashD(orb, 8.9);
    const ro = R * (0.45 + 0.52 * h1);
    const th = h1 * 2 * Math.PI;
    const phi = Math.acos(2 * h2 - 1);
    const nx = Math.sin(phi) * Math.cos(th);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(th);
    let ux = -ny;
    let uy = nx;
    const uz = 0;
    const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
    ux /= ul;
    uy /= ul;
    const vx = ny * uz - nz * uy;
    const vy = nz * ux - nx * uz;
    const vz = nx * uy - ny * ux;
    const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);
    for (let k = 0; k < ghostN; k++) {
      const a = k / ghostN * 2 * Math.PI;
      const [px, py, z] = pt(
        (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
        (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
        (uz * Math.cos(a) + vz * Math.sin(a)) * ro
      );
      const depth = (z / ro + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z,
        r: (o.ghostR ?? 0.9) * rs,
        white: 0.72,
        a: (o.ghostA ?? 0.5) * (0.4 + 0.6 * depth)
      });
    }
    for (let m = 0; m < particles; m++) {
      const a = t * speed + m / particles * 2 * Math.PI + h2 * 6;
      const [px, py, z] = pt(
        (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
        (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
        (uz * Math.cos(a) + vz * Math.sin(a)) * ro
      );
      const depth = (z / ro + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z,
        r: ((o.partR ?? 1.2) + (o.partRDepth ?? 1.6) * depth) * rs,
        white: 0.3 - 0.22 * depth
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const A = [-0.78, -0.3];
const B = [0.78, 0.26];
const C = [0.66, -0.56];
function bowed(a, b, bow, f) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const lift = bow * Math.sin(f * Math.PI);
  return [a[0] + dx * f + nx * lift, a[1] + dy * f + ny * lift];
}
function arc(out, o, cx, cy, R, rs, a, b, bow, n, lit, rBase) {
  const inkFar = o.inkFar ?? 0.7;
  const inkNear = o.inkNear ?? 0.08;
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0;
    const on = lit(f);
    if (on < 0.03) continue;
    const [x, y] = bowed(a, b, bow, f);
    out.add(
      cx + x * R,
      cy - y * R,
      on > 0.5 ? 1 : 0,
      (rBase + (o.rLit ?? 1.25) * on) * rs,
      inkFar - (inkFar - inkNear) * on,
      o.dotA ?? 0.95
    );
  }
}
function marker(out, o, cx, cy, R, rs, p, on) {
  if (on < 0.05) return;
  const n = Math.max(4, Math.round(o.markN ?? 8));
  const rad = (o.markR ?? 0.075) * R;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    out.add(
      cx + p[0] * R + Math.cos(a) * rad,
      cy - p[1] * R + Math.sin(a) * rad,
      2,
      (o.rEnd ?? 1.15) * rs,
      0.66 - 0.58 * on,
      1
    );
  }
}
const buildFlightpath = (out, size, t, o, progress) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.92);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  let p;
  if (progress === void 0) {
    const cyc = t / (o.period ?? 2.4) % 1;
    p = smoothE$1(Math.min(1, cyc / 0.84));
  } else {
    p = clamp01(progress);
  }
  const arcN = Math.max(6, Math.round(o.arcN ?? 62));
  const head = o.headWidth ?? 0.1;
  const bow = o.bow ?? 0.3;
  arc(out, o, cx, cy, R, rs, A, B, 0, arcN, () => o.trackOn ?? 0.3, o.rTrack ?? 0.8);
  arc(
    out,
    o,
    cx,
    cy,
    R,
    rs,
    A,
    B,
    bow,
    arcN,
    (f) => {
      const flown = f <= p ? 1 : o.aheadOn ?? 0.24;
      const d = (f - p) / head;
      return Math.max(flown, Math.exp(-d * d));
    },
    o.rArc ?? 1.25
  );
  marker(out, o, cx, cy, R, rs, A, 1);
  marker(out, o, cx, cy, R, rs, B, p >= 0.995 ? 1 : 0.45);
};
const BREAK_AT = 0.52;
const buildDetour = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.92);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const HOLD2 = 0.5;
  const BREAK2 = 0.45;
  const FORK = 0.8;
  const SETTLE = 0.75;
  const CYC2 = HOLD2 + BREAK2 + FORK + SETTLE;
  const tc = t % CYC2;
  let broken = 0;
  let forked = 0;
  if (tc < HOLD2) ;
  else if (tc < HOLD2 + BREAK2) {
    broken = smoothE$1((tc - HOLD2) / BREAK2);
  } else if (tc < HOLD2 + BREAK2 + FORK) {
    broken = 1;
    forked = smoothE$1((tc - HOLD2 - BREAK2) / FORK);
  } else {
    broken = 1;
    forked = 1;
  }
  const arcN = Math.max(6, Math.round(o.arcN ?? 58));
  const gap = o.gap ?? 0.13;
  const bow = o.bow ?? 0.3;
  arc(
    out,
    o,
    cx,
    cy,
    R,
    rs,
    A,
    B,
    bow,
    arcN,
    (f) => {
      const base = 1 - 0.55 * broken;
      if (f < BREAK_AT - gap) return base;
      if (f > BREAK_AT) return base * (1 - broken);
      const d = Math.abs(f - BREAK_AT) / gap;
      return base * (1 - (d < 1 ? broken : 0));
    },
    o.rArc ?? 1.2
  );
  const branch = bowed(A, B, bow, BREAK_AT - gap);
  arc(
    out,
    o,
    cx,
    cy,
    R,
    rs,
    branch,
    C,
    o.bowAlt ?? -0.26,
    arcN,
    (f) => {
      const drawn = f <= forked ? 1 : 0;
      const d = (f - forked) / 0.09;
      return Math.max(drawn, forked > 0 && forked < 1 ? Math.exp(-d * d) : 0);
    },
    o.rArc ?? 1.2
  );
  marker(out, o, cx, cy, R, rs, A, 1);
  marker(out, o, cx, cy, R, rs, B, 1 - 0.85 * broken);
  marker(out, o, cx, cy, R, rs, C, forked);
  if (broken > 0.05 && forked < 1) {
    const debris = Math.max(0, Math.round(o.debris ?? 10));
    const [bx, by] = bowed(A, B, bow, BREAK_AT);
    for (let i = 0; i < debris; i++) {
      const spread = (o.debrisSpread ?? 0.2) * broken * (0.3 + hashD(i, 2.8));
      const a = hashD(i, 4.1) * Math.PI * 2;
      out.add(
        cx + (bx + Math.cos(a) * spread) * R,
        cy - (by + Math.sin(a) * spread) * R,
        3,
        (o.rDebris ?? 1) * rs,
        0.3,
        0.95 * (1 - forked)
      );
    }
  }
};
const NOISE = 0.22;
const CRYSTAL = 0.62;
const LINK = 0.8;
const HOLD$1 = 1.5;
const CYC$1 = NOISE + CRYSTAL + LINK + HOLD$1;
const buildPins = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.82);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const pinN = Math.max(2, Math.round(o.pinN ?? 6));
  const perPin = Math.max(2, Math.round(o.perPin ?? 8));
  const tc = t % CYC$1;
  let formed = 0;
  let linked = 0;
  if (tc < NOISE) ;
  else if (tc < NOISE + CRYSTAL) {
    formed = smoothE$1((tc - NOISE) / CRYSTAL);
  } else if (tc < NOISE + CRYSTAL + LINK) {
    formed = 1;
    linked = (tc - NOISE - CRYSTAL) / LINK;
  } else {
    formed = 1;
    linked = 1;
  }
  const pinAt = (k) => {
    const a = k / pinN * Math.PI * 2 + (hashD(k, 3.1) - 0.5) * 0.7;
    const rad = (o.pinRing ?? 0.62) * (0.62 + 0.38 * hashD(k, 6.7));
    return [Math.cos(a) * rad, Math.sin(a) * rad];
  };
  for (let k = 0; k < pinN; k++) {
    const [tx, ty] = pinAt(k);
    const reached = Math.max(0, Math.min(1, linked * pinN - k));
    for (let i = 0; i < perPin; i++) {
      const idx = k * perPin + i;
      const nx = (hashD(idx, 1.9) - 0.5) * 1.7;
      const ny = (hashD(idx, 4.4) - 0.5) * 1.7;
      const ca = i / perPin * Math.PI * 2;
      const cr = o.clusterR ?? 0.1;
      const fx = tx + Math.cos(ca) * cr;
      const fy = ty + Math.sin(ca) * cr;
      const x = nx + (fx - nx) * formed;
      const y = ny + (fy - ny) * formed;
      out.add(
        cx + x * R,
        cy + y * R,
        reached > 0.5 ? 1 : 0,
        ((o.rDot ?? 0.85) + (o.rPin ?? 0.75) * formed + (o.rReached ?? 0.45) * reached) * rs,
        // noise is dark, a resolved pin is bright — ink carries it, not alpha
        (o.inkNoise ?? 0.7) - (o.inkNoise ?? 0.7 - 0.24) * formed - (o.inkReached ?? 0.16) * reached,
        o.dotA ?? 0.95
      );
    }
  }
  if (linked > 0) {
    const segDots = Math.max(2, Math.round(o.segDots ?? 6));
    for (let k = 0; k < pinN - 1; k++) {
      const [ax, ay] = pinAt(k);
      const [bx, by] = pinAt(k + 1);
      const leg = Math.max(0, Math.min(1, linked * pinN - k));
      for (let i = 1; i <= segDots; i++) {
        const f = i / (segDots + 1);
        if (f > leg) continue;
        out.add(
          cx + (ax + (bx - ax) * f) * R,
          cy + (ay + (by - ay) * f) * R,
          0,
          (o.rLink ?? 0.6) * rs,
          o.inkLink ?? 0.42,
          o.linkA ?? 0.9
        );
      }
    }
  }
};
const TAU = Math.PI * 2;
const buildRest = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.82;
  const pt = makeProj(t * (o.spin ?? 0.34), 0.34 + 0.08 * Math.sin(t * 0.17), cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const n = Math.max(8, Math.round(o.dotN ?? 170));
  const breath = o.breath ?? 0.018;
  const drift = o.drift ?? 0.022;
  const aFar = o.aFar ?? 0.72;
  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = fibDir(i, n);
    const h1 = hashD(i, 3.1);
    const h2 = hashD(i, 7.7);
    const ax = Math.abs(dz) > 0.9 ? 1 : 0;
    const az = Math.abs(dz) > 0.9 ? 0 : 1;
    let ux = dy * az;
    let uy = dz * ax - dx * az;
    let uz = -dy * ax;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;
    const ph = h2 * TAU + t * (o.driftRate ?? 0.31);
    const cp = Math.cos(ph) * drift;
    const sp = Math.sin(ph) * drift;
    const rr = R * (1 + breath * Math.sin(t * (o.breathRate ?? 0.53) + h1 * TAU));
    const [px, py, z] = pt(
      (dx + ux * cp + vx * sp) * rr,
      (dy + uy * cp + vy * sp) * rr,
      (dz + uz * cp + vz * sp) * rr
    );
    const depth = Math.min(1, Math.max(0, (z / R + 1) / 2));
    out.add(
      px,
      py,
      z,
      ((o.rBase ?? 0.7) + (o.rDepth ?? 2) * depth) * rs,
      (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
      aFar + (1 - aFar) * depth
    );
  }
};
function unitCircle(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
}
const buildFocus = (out, size, t, o) => {
  const center = size / 2;
  const extent = size * 0.38 * (o.spread ?? 1);
  const lanes = Math.max(1, Math.round(o.lanes ?? 6));
  const segs = Math.max(1, Math.round(o.segs ?? 12));
  const coreN = Math.max(1, Math.round(o.particles ?? 5));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.9;
  const rDepth = o.rDepth ?? 1.25;
  const openness = 0.5 + 0.5 * Math.sin(t * 0.9);
  const inner = 0.12 + 0.2 * openness;
  const rotation = t * 0.11;
  const dirs = unitCircle(lanes);
  for (let lane = 0; lane < lanes; lane++) {
    const [dx0, dy0] = dirs[lane];
    for (let i = 0; i < segs; i++) {
      const u = (i + 0.5) / segs;
      const radial = inner + (1 - inner) * u;
      const curl = (0.88 - 0.24 * openness) * (1 - u) ** 1.25;
      const twist = rotation + curl;
      const st = Math.sin(twist);
      const ct = Math.cos(twist);
      const dx = dx0 * ct - dy0 * st;
      const dy = dx0 * st + dy0 * ct;
      const innerWeight = 1 - u;
      const shimmer = 0.96 + 0.05 * Math.sin(t * 1.4 + lane * 0.8);
      out.add(
        center + dx * extent * radial,
        center + dy * extent * radial,
        0,
        (rBase + rDepth * innerWeight) * shimmer * rs,
        0.12 + 0.52 * u,
        0.48 + 0.52 * Math.sin(Math.PI * u)
      );
    }
  }
  const coreRadius = size * (0.035 + 4e-3 * Math.sin(t * 1.5));
  for (const [px, py] of unitCircle(coreN)) {
    out.add(center + px * coreRadius, center + py * coreRadius, 0, (rBase + rDepth * 1.15) * rs, 0.08);
  }
};
const buildGyro = (out, size, t, o) => {
  const center = size / 2;
  const radius = size * 0.385 * (o.spread ?? 1);
  const rings = Math.min(6, Math.max(1, Math.round(o.lanes ?? 3)));
  const segs = Math.max(3, Math.round(o.segs ?? 24));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.8;
  const rDepth = o.rDepth ?? 1.5;
  const proj = makeProj(t * 0.055, 0.18, center, center, radius);
  const circle = unitCircle(segs);
  for (let ring = 0; ring < rings; ring++) {
    const spread = rings > 1 ? ring / (rings - 1) - 0.5 : 0;
    const tiltX = spread * 1.55 + 0.12 * Math.sin(t * 0.16 + ring);
    const tiltY = ring * Math.PI / rings + 0.32;
    const sx = Math.sin(tiltX);
    const cx = Math.cos(tiltX);
    const sy = Math.sin(tiltY);
    const cy = Math.cos(tiltY);
    const direction = ring % 2 === 0 ? 1 : -1;
    const orient = (ca, sa) => {
      const y1 = sa * cx;
      const z1 = sa * sx;
      return [ca * cy + z1 * sy, y1, -ca * sy + z1 * cy];
    };
    for (const [ca, sa] of circle) {
      const [x, y, z] = orient(ca, sa);
      const [px, py, depthZ] = proj(x, y, z);
      const depth = (depthZ + 1) * 0.5;
      out.add(
        px,
        py,
        depthZ,
        (rBase * 0.9 + rDepth * 0.5 * depth) * rs,
        0.62 - 0.34 * depth,
        0.34 + 0.4 * depth
      );
    }
    const travel = t * (0.72 + ring * 0.08) * direction + ring * 2 * Math.PI / rings;
    for (const [trail, offset] of [
      [0, 0],
      [1, -0.22 * direction]
    ]) {
      const [x, y, z] = orient(Math.cos(travel + offset), Math.sin(travel + offset));
      const [px, py, depthZ] = proj(x, y, z);
      const depth = (depthZ + 1) * 0.5;
      const strength = trail === 0 ? 1 : 0.48;
      out.add(
        px,
        py,
        depthZ + 2e-3,
        (rBase + rDepth * depth + 1.65 * strength) * rs,
        0.44 - 0.42 * depth - 0.2 * strength,
        (0.55 + 0.45 * depth) * strength
      );
    }
  }
};
const buildEcho = (out, size, t, o) => {
  const center = size / 2;
  const extent = size * 0.4 * (o.spread ?? 1);
  const rings = Math.max(1, Math.round(o.lanes ?? 4));
  const segs = Math.max(3, Math.round(o.segs ?? 18));
  const coreN = Math.max(1, Math.round(o.particles ?? 3));
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const rBase = o.rBase ?? 0.85;
  const rDepth = o.rDepth ?? 1.05;
  const circle = unitCircle(segs);
  for (let ring = 0; ring < rings; ring++) {
    const phase = frac(t * 0.14 + ring / rings);
    const radius = extent * (0.13 + 0.87 * phase);
    const life = Math.max(0, Math.sin(Math.PI * phase));
    const turn = ring * 0.37 - t * 0.1;
    const st = Math.sin(turn);
    const ct = Math.cos(turn);
    for (const [px, py] of circle) {
      const x = px * ct - py * st;
      const y = px * st + py * ct;
      out.add(
        center + x * radius,
        center + y * radius,
        0,
        (rBase + rDepth * (1 - phase)) * rs,
        0.18 + 0.52 * phase,
        life ** 0.58
      );
    }
  }
  const coreRadius = size * 0.025;
  for (const [px, py] of unitCircle(coreN)) {
    out.add(center + px * coreRadius, center + py * coreRadius, 0, (rBase + rDepth * 1.4) * rs, 0.06);
  }
};
const frameRibbon = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.78;
  const spin = o.spin ?? 1;
  const camTilt = 0.3;
  const pt = makeProj(t * 0.1 * spin, camTilt, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const ghostN = o.ghostN ?? 150;
  for (let i = 0; i < ghostN; i++) {
    const d = fibDir(i, ghostN);
    const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R);
    const depth = (z / R + 1) / 2;
    dots.push({ x: px, y: py, z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth });
  }
  const ya = t * 0.24 * spin;
  const ta = o.faceOn ? -camTilt : 0.55 + 0.3 * Math.sin(t * 0.18) * spin;
  const ux = Math.cos(ya);
  const uy = 0;
  const uz = Math.sin(ya);
  const vx = -uz * Math.sin(ta);
  const vy = Math.cos(ta);
  const vz = ux * Math.sin(ta);
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const wobAmp = 0.23 * (o.wobMul ?? 1);
  const baseR = o.faceOn ? R / (1 + 0.85 * wobAmp) : R;
  const baseLanes = o.lanes ?? 5;
  const segs = o.segs ?? 88;
  const lanes = Math.max(1, Math.round(baseLanes * (o.bandMul ?? 1)));
  for (let w = 0; w < lanes; w++) {
    const laneOff = (w - (lanes - 1) / 2) * 0.075;
    const edge = Math.abs(w - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
    for (let k = 0; k < segs; k++) {
      const a = k / segs * 2 * Math.PI;
      const wob = (0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1)) * (o.wobMul ?? 1);
      const radial = o.faceOn ? 1 + wob : 1;
      const off = o.faceOn ? laneOff : laneOff + wob;
      const x = ux * Math.cos(a) + vx * Math.sin(a) + nx * off;
      const y = uy * Math.cos(a) + vy * Math.sin(a) + ny * off;
      const z = uz * Math.cos(a) + vz * Math.sin(a) + nz * off;
      const l = Math.sqrt(x * x + y * y + z * z);
      const rr = baseR * radial;
      const [px, py, zr] = pt(x / l * rr, y / l * rr, z / l * rr);
      const depth = (zr / R + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: zr,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) * (1 - 0.25 * edge) * rs,
        white: 0.52 - 0.44 * depth + 0.18 * edge,
        a: 0.4 + 0.6 * depth
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const buildAttest = (out, size, t, o, progress) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.84);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const segN = Math.max(3, Math.round(o.segN ?? 12));
  const perSeg = Math.max(2, Math.round(o.perSeg ?? 7));
  const gapFrac = o.gapFrac ?? 0.28;
  let done;
  if (progress === void 0) {
    const cyc = t / (o.period ?? 2.6) % 1;
    done = Math.min(1, cyc / (1 - (o.holdFrac ?? 0.24))) * segN;
  } else {
    done = clamp01(progress) * segN;
  }
  const span = Math.PI * 2 / segN;
  const arcSpan = span * (1 - gapFrac);
  const ringR = o.ringR ?? 0.88;
  for (let s = 0; s < segN; s++) {
    const state = Math.max(0, Math.min(1, done - s));
    const checking = state > 0 && state < 1 ? 1 : 0;
    for (let i = 0; i < perSeg; i++) {
      const f = perSeg > 1 ? i / (perSeg - 1) : 0.5;
      const on = state >= 1 ? 1 : state > 0 ? f <= state ? 1 : 0 : 0;
      const a = -Math.PI / 2 + s * span + (f - 0.5) * arcSpan;
      out.add(
        cx + Math.cos(a) * ringR * R,
        cy + Math.sin(a) * ringR * R,
        on > 0 ? 1 : 0,
        ((o.rBase ?? 1.35) + (o.rDone ?? 0.5) * on + (o.rChecking ?? 0.5) * checking * on) * rs,
        // pending segments recede by ink and stay fully opaque, so the ring is
        // always legible as a whole rather than half-vanishing
        (o.inkPending ?? 0.66) - (o.inkPending ?? 0.66 - 0.08) * on,
        o.dotA ?? 0.95
      );
    }
  }
  const all = done >= segN ? 1 : 0;
  if (all) {
    const tickN = Math.max(2, Math.round(o.tickN ?? 7));
    for (let i = 0; i < tickN; i++) {
      const f = tickN > 1 ? i / (tickN - 1) : 0;
      const x = -0.2 + 0.42 * f;
      const y = f < 0.4 ? -0.06 + 0.5 * f : 0.14 - 0.44 * (f - 0.4);
      out.add(cx + x * R, cy + y * R, 2, (o.rTick ?? 1.3) * rs, 0.08, 1);
    }
  }
};
const buildSonar = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 * (o.reach ?? 0.9);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const ringN = Math.max(1, Math.round(o.ringN ?? 4));
  const ringDots = Math.max(4, Math.round(o.ringDots ?? 34));
  const spin = t * (o.spin ?? 0.25);
  for (let k = 0; k < ringN; k++) {
    const frac2 = (t / (o.period ?? 1.6) + k / ringN) % 1;
    const r = maxR * frac2;
    if (r < 0.5) continue;
    const fadeIn = Math.min(1, frac2 / 0.1);
    const alpha = (o.ringA ?? 1) * fadeIn * (1 - (o.fade ?? 0.3) * frac2);
    if (alpha < 0.03) continue;
    const n = Math.max(6, Math.round(ringDots * (0.34 + 0.66 * frac2)));
    const off = spin * (k % 2 === 0 ? 1 : -1) + k * 0.7;
    for (let i = 0; i < n; i++) {
      const ang = i / n * Math.PI * 2 + off;
      out.add(
        cx + Math.cos(ang) * r,
        cy + Math.sin(ang) * r,
        // slight z stagger keeps the painter's coalescing runs long
        k * 1e-3,
        ((o.rBase ?? 2.3) - (o.rTaper ?? 1) * frac2) * rs,
        (o.inkNear ?? 0.08) + (o.inkSpan ?? 0.5) * frac2,
        alpha
      );
    }
  }
  const pulse = 1 - t / (o.period ?? 1.6) % (1 / ringN) * ringN;
  out.add(cx, cy, 1, ((o.rCore ?? 1.8) + (o.rPulse ?? 0.9) * pulse) * rs, 0.06, 1);
};
const FLY = 0.74;
const buildRoute = (out, size, t, o) => {
  const spin = 0.34;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 * 0.82;
  const tilt = 0.42 + 0.05 * Math.sin(t * 0.3);
  const pt = makeProj(t * spin, tilt, cx, cy, radius);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dimBase = o.dimBase ?? 0.55;
  latLonLattice(o.latRings ?? 17, o.lonDensity ?? 44, (ux, uy, uz) => {
    const [px, py, z] = pt(ux, uy, uz);
    const depth = (z + 1) / 2;
    out.add(
      px,
      py,
      z,
      ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth) * rs,
      (o.inkFar ?? 0.66) - (o.inkSpan ?? 0.42) * depth,
      dimBase
    );
  });
  const cycle = Math.floor(t);
  const localT = t - cycle;
  const pool = Math.max(6, Math.round(o.pool ?? 24));
  const a = fibDir(cycle % pool, pool);
  const b = fibDir((cycle * 7 + Math.floor(pool / 3)) % pool, pool);
  const arcN = Math.max(4, Math.round(o.arcN ?? 26));
  const travel = localT < FLY ? smoothE$1(localT / FLY) : 1;
  const headWidth = o.headWidth ?? 0.16;
  const rEnd = (o.rEnd ?? 2.1) * rs;
  for (let i = 0; i < arcN; i++) {
    const f = i / (arcN - 1);
    const [ux, uy, uz] = slerp(a, b, f);
    const lift = 1 + (o.lift ?? 0.09) * Math.sin(f * Math.PI);
    const [px, py, z] = pt(ux * lift, uy * lift, uz * lift);
    const depth = (z + 1) / 2;
    const laid = f <= travel ? 1 : 0;
    const d = (f - travel) / headWidth;
    const head = Math.exp(-d * d);
    const on = Math.max(laid * (o.trailA ?? 1), head);
    if (on < 0.03) continue;
    out.add(
      px,
      py,
      z,
      ((o.rArc ?? 1.25) + (o.rDepth ?? 1.7) * depth + (o.rHead ?? 1.9) * head) * rs,
      (o.inkArc ?? 0.1) - 0.08 * depth - 0.06 * head,
      on
    );
  }
  for (const [ux, uy, uz] of [a, b]) {
    const [px, py, z] = pt(ux, uy, uz);
    const isDest = uz === b[2] && ux === b[0];
    const landed = isDest && travel >= 1 ? 1 + 0.25 * Math.sin(t * 12) : 1;
    out.add(px, py, z + 0.01, rEnd * landed, 0.08, 1);
  }
};
const GATHER = 0.75;
const SNAP = 0.18;
const HOLD = 1.05;
const CYC = GATHER + SNAP + HOLD;
const buildSeal = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.9);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const tc = t % CYC;
  let close;
  let lock = 0;
  if (tc < GATHER) {
    close = smoothE$1(tc / GATHER);
  } else if (tc < GATHER + SNAP) {
    const x = (tc - GATHER) / SNAP;
    close = 1 + (o.overshoot ?? 0.055) * Math.sin(x * Math.PI);
    lock = x;
  } else {
    close = 1;
    lock = 1;
  }
  const dotN = Math.max(8, Math.round(o.dotN ?? 104));
  const ringR = o.ringR ?? 0.72;
  const scatter = o.scatter ?? 0.42;
  const rBase = o.rBase ?? 1.15;
  for (let i = 0; i < dotN; i++) {
    const a = i / dotN * Math.PI * 2;
    const rOff = (hashD(i, 1.7) - 0.5) * 2 * scatter;
    const aOff = (hashD(i, 5.3) - 0.5) * (o.spreadA ?? 0.5);
    const rad = ringR * close + rOff * (1 - close);
    const ang = a + aOff * (1 - close);
    out.add(
      cx + Math.cos(ang) * rad * R,
      cy + Math.sin(ang) * rad * R,
      0,
      (rBase + (o.rLock ?? 0.55) * lock) * rs,
      // dark and loose while gathering, bright and exact once locked
      (o.inkLoose ?? 0.66) - (o.inkLoose ?? 0.66 - 0.1) * close,
      o.dotA ?? 0.95
    );
  }
  if (lock > 0.02) {
    const coreN = Math.max(1, Math.round(o.coreN ?? 16));
    for (let i = 0; i < coreN; i++) {
      const f = coreN > 1 ? i / (coreN - 1) : 0;
      const a = f * Math.PI * 3.2;
      const rad = (o.coreR ?? 0.26) * f * R;
      out.add(
        cx + Math.cos(a) * rad,
        cy + Math.sin(a) * rad,
        1,
        (o.rCore ?? 1.2) * rs * lock,
        0.1,
        lock
      );
    }
  }
};
const buildVigil = (out, size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * (o.reach ?? 0.82);
  const pt = makeProj(t * (o.spin ?? 0.07), 0.36, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const fieldN = Math.max(8, Math.round(o.fieldN ?? 128));
  const orbit = t * (o.orbit ?? 0.55);
  const sx = Math.cos(orbit);
  const sz = Math.sin(orbit);
  const sy = o.orbitY ?? 0.18;
  const beat = t / (o.beatEvery ?? 3.2) % 1;
  const ripple = beat * (o.rippleReach ?? 2.6);
  for (let i = 0; i < fieldN; i++) {
    const d = fibDir(i, fieldN);
    const [px, py, z] = pt(d[0], d[1], d[2]);
    const depth = (z + 1) / 2;
    const dot = d[0] * sx + d[1] * sy + d[2] * sz;
    const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
    const wave = Math.exp(-(((ang - ripple) / (o.rippleWidth ?? 0.42)) ** 2));
    out.add(
      px,
      py,
      z,
      ((o.rField ?? 0.6) + (o.rDepth ?? 1.5) * depth + (o.rWave ?? 0.8) * wave) * rs,
      // the field sits well back via ink and brightens only as the beat passes
      (o.inkFar ?? 0.74) - (o.inkSpan ?? 0.3) * depth - (o.inkWave ?? 0.34) * wave,
      o.fieldA ?? 0.92
    );
  }
  const trail = Math.max(1, Math.round(o.trail ?? 5));
  for (let k = 0; k < trail; k++) {
    const a = orbit - k * (o.trailGap ?? 0.14);
    const [px, py, z] = pt(Math.cos(a) * 1.04, sy, Math.sin(a) * 1.04);
    const depth = (z + 1) / 2;
    const fade = 1 - k / trail;
    out.add(
      px,
      py,
      z + 0.02,
      ((o.rSentinel ?? 1.5) + (o.rDepth ?? 1.5) * depth) * fade * rs,
      0.08 + 0.3 * (1 - fade),
      fade
    );
  }
};
const CUBE_EDGES = [
  [1, 1, 1, -1, 1, 1],
  [-1, 1, 1, -1, -1, 1],
  [-1, -1, 1, 1, -1, 1],
  [1, -1, 1, 1, 1, 1],
  [1, 1, -1, -1, 1, -1],
  [-1, 1, -1, -1, -1, -1],
  [-1, -1, -1, 1, -1, -1],
  [1, -1, -1, 1, 1, -1],
  [1, 1, 1, 1, 1, -1],
  [-1, 1, 1, -1, 1, -1],
  [-1, -1, 1, -1, -1, -1],
  [1, -1, 1, 1, -1, -1]
];
const frameBuilding = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.55;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.2 * spin, t * 0.15 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const dotsPerEdge = Math.max(2, Math.floor(o.ghostN ?? 12));
  for (const [x1, y1, z1, x2, y2, z2] of CUBE_EDGES) {
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const [px, py, pz] = pt(
        (x1 + (x2 - x1) * f) * R,
        (y1 + (y2 - y1) * f) * R,
        (z1 + (z2 - z1) * f) * R
      );
      const depth = (pz / (R * 1.732) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) * rs,
        white: 0.52 - 0.44 * depth,
        a: 0.4 + 0.6 * depth
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameHypercube = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.52;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.18 * spin, t * 0.14 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const gridN = Math.max(4, Math.floor(o.ghostN ?? 7));
  const faces = [
    { axis: "z", val: 1, normal: [0, 0, 1] },
    { axis: "z", val: -1, normal: [0, 0, -1] },
    { axis: "x", val: 1, normal: [1, 0, 0] },
    { axis: "x", val: -1, normal: [-1, 0, 0] },
    { axis: "y", val: 1, normal: [0, 1, 0] },
    { axis: "y", val: -1, normal: [0, -1, 0] }
  ];
  for (const { axis, val, normal } of faces) {
    for (let i = 0; i < gridN; i++) {
      const u = -1 + 2 * i / (gridN - 1);
      for (let j = 0; j < gridN; j++) {
        const v = -1 + 2 * j / (gridN - 1);
        let lx = 0;
        let ly = 0;
        let lz = 0;
        if (axis === "z") {
          lx = u;
          ly = v;
          lz = val;
        } else if (axis === "x") {
          lx = val;
          ly = u;
          lz = v;
        } else {
          lx = u;
          ly = val;
          lz = v;
        }
        const wave = 0.06 * Math.sin(t * 2.2 + lx * 1.5 + ly * 1.5 + lz * 1.5);
        const [px, py, pz] = pt(
          (lx + normal[0] * wave) * R,
          (ly + normal[1] * wave) * R,
          (lz + normal[2] * wave) * R
        );
        const depth = (pz / (R * 1.732) + 1) / 2;
        dots.push({
          x: px,
          y: py,
          z: pz,
          r: ((o.rBase ?? 0.8) + (o.rDepth ?? 1.5) * depth) * rs,
          white: 0.55 - 0.45 * depth,
          a: 0.35 + 0.65 * depth
        });
      }
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameConjuring = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.55;
  const spin = o.spin ?? 1;
  const isStatic = spin === 0;
  const yaw = isStatic ? 0.25 : t * 0.35 * spin;
  const tilt = isStatic ? 0.38 : 0.45 + 0.25 * Math.sin(t * 0.6 * spin);
  const roll = isStatic ? 0 : t * 0.2 * spin;
  const baseRotSpeed = isStatic ? 1 : 0.8;
  const baseAngleOffset = t * baseRotSpeed;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const basePt = makeProj(yaw, tilt, cx, cy, 1);
  const pt = (x, y, z) => {
    const rx = x * cr - y * sr;
    const ry = x * sr + y * cr;
    return basePt(rx, ry, z);
  };
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const dotsPerEdge = Math.max(4, Math.floor(o.ghostN ?? 16));
  const apexY = 0.9;
  const baseY = -0.6;
  for (let b = 0; b < 3; b++) {
    const initialAngle = b * 2 * Math.PI / 3 + baseAngleOffset;
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const y = baseY + (apexY - baseY) * f;
      const currentRadius = 1 - f;
      const twistAngle = initialAngle + f * Math.PI * 1.2;
      const [px, py, pz] = pt(Math.cos(twistAngle) * currentRadius * R, y * R, Math.sin(twistAngle) * currentRadius * R);
      const depth = (pz / (R * 1.5) + 1) / 2;
      const wave = 0.5 + 0.5 * Math.cos(t * 2.8 - f * Math.PI * 4);
      const pulse = wave ** 2.5;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1) + (o.rDepth ?? 1.6) * depth + pulse * 0.9) * rs,
        white: 0.65 - 0.45 * depth - pulse * 0.2,
        a: 0.4 + 0.6 * depth
      });
    }
  }
  const baseEdgeDots = Math.floor(dotsPerEdge * 0.8);
  for (let b = 0; b < 3; b++) {
    const a1 = b * 2 * Math.PI / 3 + baseAngleOffset;
    const a2 = (b + 1) * 2 * Math.PI / 3 + baseAngleOffset;
    for (let i = 0; i < baseEdgeDots; i++) {
      const f = i / (baseEdgeDots - 1);
      const ang = a1 + (a2 - a1) * f;
      const arcRadius = 1 + 0.12 * Math.sin(f * Math.PI);
      const [px, py, pz] = pt(Math.cos(ang) * arcRadius * R, (baseY + 0.06 * Math.sin(f * Math.PI)) * R, Math.sin(ang) * arcRadius * R);
      const depth = (pz / (R * 1.5) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 0.9) + (o.rDepth ?? 1.5) * depth) * rs,
        white: 0.58 - 0.4 * depth,
        a: 0.35 + 0.65 * depth
      });
    }
  }
  for (let p = 0; p < 18; p++) {
    const ang = p / 18 * Math.PI * 2 - baseAngleOffset * 1.5;
    const rad = 1.15 * (1 + 0.05 * Math.sin(t * 3 + p));
    const [px, py, pz] = pt(Math.cos(ang) * rad * R, (baseY - 0.08) * R, Math.sin(ang) * rad * R);
    const depth = (pz / R + 1) / 2;
    dots.push({ x: px, y: py, z: pz, r: (0.7 + 1.1 * depth) * rs, white: 0.5 - 0.35 * depth, a: 0.3 + 0.5 * depth });
  }
  for (let c = 0; c < 10; c++) {
    const cf = c / 9;
    const cang = -t * 2.5 + cf * 3;
    const cr_ = 0.08 * Math.sin(cf * Math.PI) * (1 + 0.3 * Math.sin(t * 3 + cf * 5));
    const [px, py, pz] = pt(Math.cos(cang) * cr_ * R, (baseY + 0.2 + cf * 1.1) * R, Math.sin(cang) * cr_ * R);
    const depth = (pz / R + 1) / 2;
    dots.push({ x: px, y: py, z: pz, r: (1.4 + 1.2 * depth) * rs, white: 0.75 - 0.45 * depth, a: 0.7 + 0.3 * depth });
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameAssembling = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.52;
  const spin = o.spin ?? 1;
  const pt = makeProj(t * 0.2 * spin, t * 0.15 * spin, cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const dotsPerEdge = Math.max(2, Math.floor(o.ghostN ?? 14));
  let edgeIdx = 0;
  for (const [x1, y1, z1, x2, y2, z2] of CUBE_EDGES) {
    edgeIdx++;
    for (let i = 0; i < dotsPerEdge; i++) {
      const f = i / (dotsPerEdge - 1);
      const bx = x1 + (x2 - x1) * f;
      const by = y1 + (y2 - y1) * f;
      const bz = z1 + (z2 - z1) * f;
      const seed = hashD(edgeIdx * 100 + i, 3.14);
      const phase = seed * Math.PI * 2;
      const cycleTime = (t * 1.8 + phase) % (Math.PI * 2);
      let displacement = 0;
      let alphaMult = 1;
      let radiusBoost = 0;
      if (cycleTime > Math.PI * 0.8 && cycleTime < Math.PI * 1.7) {
        const ejectProgress = (cycleTime - Math.PI * 0.8) / (Math.PI * 0.9);
        const ejectEnvelope = Math.sin(ejectProgress * Math.PI);
        displacement = 0.5 * ejectEnvelope;
        alphaMult = 1 - 0.4 * ejectEnvelope;
        radiusBoost = 0.4 * ejectEnvelope;
      }
      const norm = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const [px, py, pz] = pt((bx + bx / norm * displacement) * R, (by + by / norm * displacement) * R, (bz + bz / norm * displacement) * R);
      const depth = (pz / (R * 1.732) + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth + radiusBoost) * rs,
        white: 0.55 - 0.42 * depth,
        a: (0.4 + 0.6 * depth) * alphaMult
      });
    }
  }
  for (let s = 0; s < 12; s++) {
    const sSeed = hashD(s + 50, 7.12);
    const snapCycle = (t * 2.2 + sSeed * Math.PI * 2) % (Math.PI * 2);
    if (snapCycle <= Math.PI) continue;
    const snapProgress = (snapCycle - Math.PI) / Math.PI;
    const easeSnap = (1 - snapProgress) ** 3;
    const cornerIdx = Math.floor(sSeed * 8);
    const cx_ = cornerIdx & 1 ? 1 : -1;
    const cy_ = cornerIdx & 2 ? 1 : -1;
    const cz_ = cornerIdx & 4 ? 1 : -1;
    const dist = 1.2 * easeSnap;
    const [px, py, pz] = pt(
      (cx_ + Math.sin(sSeed * 15) * dist) * R,
      (cy_ + Math.cos(sSeed * 25) * dist) * R,
      (cz_ + Math.sin(sSeed * 35) * dist) * R
    );
    const depth = (pz / (R * 1.732) + 1) / 2;
    dots.push({
      x: px,
      y: py,
      z: pz,
      r: (1.3 + 1.2 * depth) * rs,
      white: 0.7 - 0.4 * depth,
      a: 0.2 + 0.8 * (1 - easeSnap)
    });
  }
  return finalizeFrame(dots, [], o.rMin);
};
const frameResponding = (size, t, o) => {
  const center = size / 2;
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const bodyCount = Math.max(24, Math.round((o.pulseN ?? 156) * 0.85));
  const bodyProject = makeProj(t * 0.1, 0.34 + 0.055 * Math.sin(t * 0.3), center, center, size * 0.39);
  const nearRadius = ((o.rBase ?? 0.7) + (o.rDepth ?? 1.6) * 0.25) * (o.dotScale ?? 1.65) * rs;
  for (let i = 0; i < bodyCount; i++) {
    const [x, y, z] = bodyProject(...fibDir(i, bodyCount));
    const depth = (z + 1) / 2;
    dots.push({
      x,
      y,
      z,
      r: nearRadius * 0.65 * (0.42 + 0.58 * depth + 0.16 * depth * depth),
      white: 0.64 - 0.4 * depth,
      a: 0.18 + 0.48 * depth
    });
  }
  const shellCount = Math.max(2, Math.round(o.shellCount ?? 3));
  for (let shell2 = 0; shell2 < shellCount; shell2++) {
    const cycle = t * (o.pulseSpeed ?? 0.17) * Math.PI * 2 + shell2 / shellCount * Math.PI * 2;
    const pulse = (1 - Math.cos(cycle)) / 2;
    const radius = size * (0.32 + 0.07 * pulse);
    const yaw = t * 0.1 + shell2 * 0.82;
    const tilt = 0.5 + 0.12 * Math.sin(t * 0.25 + shell2);
    const ux = Math.cos(yaw);
    const uz = Math.sin(yaw);
    const vx = -uz * Math.sin(tilt);
    const vy = Math.cos(tilt);
    const vz = ux * Math.sin(tilt);
    const segs = size >= 64 ? 28 : 16;
    for (let k = 0; k < segs; k++) {
      const a = k / segs * Math.PI * 2;
      const x = (ux * Math.cos(a) + vx * Math.sin(a)) * radius;
      const y = (0 * Math.cos(a) + vy * Math.sin(a)) * radius;
      const z = (uz * Math.cos(a) + vz * Math.sin(a)) * radius;
      const [px, py, pz] = [center + x, center - y, z / radius];
      const depth = (pz + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z: pz,
        r: nearRadius * (0.7 + 0.5 * pulse) * (0.5 + 0.5 * depth),
        white: 0.5 - 0.35 * depth,
        a: (0.25 + 0.55 * depth) * (0.5 + 0.5 * pulse)
      });
    }
  }
  return finalizeFrame(dots, [], o.rMin);
};
function fieldDots(size, t, o, kind) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.78;
  const n = Math.max(24, Math.round(o.dotN ?? 160));
  const energy = o.energy ?? 0;
  const pt = makeProj(t * 0.07, 0.32 + 0.04 * Math.sin(t * 0.21), cx, cy, 1);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const dots = [];
  const breath = 0.018 * Math.sin(t * 0.48) + energy * 0.04;
  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = fibDir(i, n);
    const edge = 0.035 * vnoise(dx * 2.1 + t * 0.11, dy * 2.1 - t * 0.09) + 0.018 * vnoise(dx * 4.2 - t * 0.17, dz * 4.2 + t * 0.13);
    let rr = R * (1 + breath + edge);
    if (kind === "speaking") {
      const lat = Math.acos(Math.max(-1, Math.min(1, dy)));
      rr *= 1 + 0.055 * Math.sin(lat * 8 - t * 3.4) * (0.45 + energy);
    }
    const [px, py, z] = pt(dx * rr, dy * rr, dz * rr);
    const depth = Math.min(1, Math.max(0, (z / R + 1) / 2));
    const kd = Math.max(0, dx * -0.45 + dy * 0.55 + dz * 0.7);
    let white = 0.62 - 0.42 * depth - 0.12 * kd;
    let a = 0.22 + 0.62 * depth;
    if (kind === "cognition") {
      const lon = Math.atan2(dz, dx);
      const sweep = t * 1.15 % (Math.PI * 2) - Math.PI;
      const dLon = Math.atan2(Math.sin(lon - sweep), Math.cos(lon - sweep));
      const band = Math.exp(-(dLon * dLon) / 0.18);
      white -= band * 0.28;
      a += band * 0.22;
    }
    if (kind === "presence") {
      a *= 0.72 + 0.18 * depth;
    }
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.rBase ?? 0.75) + (o.rDepth ?? 1.7) * depth) * rs,
      white,
      a
    });
  }
  if (energy > 0.35) {
    const halo = Math.round(n * 0.12);
    for (let i = 0; i < halo; i++) {
      const [dx, dy, dz] = fibDir(i * 3 + 1, halo * 3);
      const [px, py, z] = pt(dx * R * 1.14, dy * R * 1.14, dz * R * 1.14);
      const depth = (z / R + 1) / 2;
      dots.push({
        x: px,
        y: py,
        z,
        r: 0.55 * rs,
        white: 0.2,
        a: 0.12 + 0.25 * energy * Math.max(0, depth)
      });
    }
  }
  return dots;
}
const framePresence = (size, t, o) => finalizeFrame(fieldDots(size, t, o, "presence"), [], o.rMin);
const frameCognition = (size, t, o) => finalizeFrame(fieldDots(size, t, o, "cognition"), [], o.rMin);
const frameSpeaking = (size, t, o) => finalizeFrame(fieldDots(size, t, o, "speaking"), [], o.rMin);
function buildNet(n) {
  const nodes = [];
  for (let i = 0; i < n; i++) nodes.push(fibDir(i, n));
  const edges = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < n; i++) {
    const scored = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d = nodes[i][0] * nodes[j][0] + nodes[i][1] * nodes[j][1] + nodes[i][2] * nodes[j][2];
      scored.push([j, d]);
    }
    scored.sort((x, y) => y[1] - x[1]);
    for (const [j] of scored.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, spoke: false });
    }
  }
  const inner = Math.min(10, n);
  for (let i = 0; i < inner; i++) edges.push({ a: -1, b: i, spoke: true });
  return { nodes, edges };
}
const cache$1 = /* @__PURE__ */ new Map();
function net(n) {
  const hit = cache$1.get(n);
  if (hit) return hit;
  const built = buildNet(n);
  cache$1.set(n, built);
  return built;
}
const frameSynapse = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.8;
  const pt = makeProj(t * (o.spin ?? 0.1), 0.3, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const n = Math.max(8, Math.round(o.nodeN ?? 28));
  const { nodes, edges } = net(n);
  const lines = [];
  const dots = [];
  const origin = pt(0, 0, 0);
  for (const e of edges) {
    const [x1, y1, z1] = e.spoke ? origin : pt(nodes[e.a][0], nodes[e.a][1], nodes[e.a][2]);
    const [x2, y2, z2] = pt(nodes[e.b][0], nodes[e.b][1], nodes[e.b][2]);
    const depth = ((z1 + z2) / 2 + 1) / 2;
    lines.push({
      x1,
      y1,
      x2,
      y2,
      white: e.spoke ? 0.38 : 0.52,
      a: (e.spoke ? 0.22 : 0.16) * (0.45 + 0.55 * depth),
      w: Math.max(0.5, (o.lineW ?? 0.7) * rs)
    });
  }
  for (let i = 0; i < n; i++) {
    const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
    const depth = (z + 1) / 2;
    dots.push({
      x: px,
      y: py,
      z,
      r: ((o.nodeR ?? 1.15) + (o.nodeRDepth ?? 1.4) * depth) * rs,
      white: 0.58 - 0.4 * depth,
      a: 0.35 + 0.55 * depth
    });
  }
  const pulses = Math.max(2, Math.round(o.signals ?? 8));
  const speed = o.pulseSpeed ?? 0.48;
  for (let s = 0; s < pulses; s++) {
    const e = edges[Math.floor(hashD(s, 2.1) * edges.length) % edges.length];
    let u = frac(t * speed + s * 0.61803398875);
    if (e.spoke && s % 2 === 0) u = 1 - u;
    let ux;
    let uy;
    let uz;
    if (e.spoke) {
      ux = lerp(0, nodes[e.b][0], u);
      uy = lerp(0, nodes[e.b][1], u);
      uz = lerp(0, nodes[e.b][2], u);
    } else {
      [ux, uy, uz] = slerp(nodes[e.a], nodes[e.b], u);
    }
    const [px, py, z] = pt(ux, uy, uz);
    const depth = (z + 1) / 2;
    const fade = Math.sin(u * Math.PI);
    dots.push({
      x: px,
      y: py,
      z: z + 0.02,
      r: ((o.rTravel ?? 1.55) + (o.rDepth ?? 1.1) * depth) * (0.55 + 0.45 * fade) * rs,
      white: 0.08 - 0.04 * depth,
      a: 0.35 + 0.6 * fade
    });
  }
  return finalizeFrame(dots, lines, o.rMin);
};
const frameWeb = (size, t, o) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 * 0.8 * (o.spread ?? 1);
  const pt = makeProj(t * 0.12, 0.32, cx, cy, R);
  const rs = radiusScale(size, o.rsPow ?? 0.6);
  const nodeN = o.nodeN ?? 30;
  const thr = o.thr ?? 0.72;
  const nodeR = o.nodeR ?? 1.4;
  const nodeRDepth = o.nodeRDepth ?? 1.8;
  const nodes = [];
  for (let i = 0; i < nodeN; i++) {
    const d = fibDir(i, nodeN);
    const x = d[0] + 0.3 * (vnoise(i * 0.31 + 9, t * 0.24) - 0.5) * 2;
    const y = d[1] + 0.3 * (vnoise(i * 0.53 + 27, t * 0.21) - 0.5) * 2;
    const z = d[2] + 0.3 * (vnoise(i * 0.77 + 55, t * 0.27) - 0.5) * 2;
    const l = Math.sqrt(x * x + y * y + z * z);
    nodes.push([x / l, y / l, z / l]);
  }
  const lines = [];
  const dots = [];
  for (let i = 0; i < nodeN; i++) {
    for (let j = i + 1; j < nodeN; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      const dz = nodes[i][2] - nodes[j][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist >= thr) continue;
      const [x1, y1, z1] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
      const [x2, y2, z2] = pt(nodes[j][0], nodes[j][1], nodes[j][2]);
      const depth = ((z1 + z2) / 2 + 1) / 2;
      lines.push({
        x1,
        y1,
        x2,
        y2,
        white: 0.42,
        a: (1 - dist / thr) * (0.3 + 0.55 * depth),
        w: Math.max(0.6, (o.lineW ?? 0.8) * rs)
      });
    }
  }
  for (let i = 0; i < nodeN; i++) {
    const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2]);
    const depth = (z + 1) / 2;
    const pulse = 1 + 0.25 * Math.sin(t * 1.4 + i * 2.7);
    dots.push({
      x: px,
      y: py,
      z,
      r: (nodeR + nodeRDepth * depth) * pulse * rs,
      white: 0.55 - 0.45 * depth
    });
  }
  const signals = o.signals ?? 5;
  for (let s = 0; s < signals; s++) {
    const seg = Math.floor(t * 0.55 + s * 7.31);
    const a = Math.floor(hashD(seg, s * 3.1 + 1.7) * nodeN);
    const b = Math.floor(hashD(seg, s * 5.7 + 4.2) * nodeN);
    if (a === b) continue;
    const f = frac(t * 0.55 + s * 7.31);
    const x = lerp(nodes[a][0], nodes[b][0], f);
    const y = lerp(nodes[a][1], nodes[b][1], f);
    const z = lerp(nodes[a][2], nodes[b][2], f);
    const l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
    const [px, py, zr] = pt(x / l, y / l, z / l);
    const depth = (zr + 1) / 2;
    dots.push({
      x: px,
      y: py,
      z: zr,
      r: (nodeR * 1.5 + nodeRDepth * depth) * rs,
      white: 0.05,
      a: 0.5 + 0.5 * depth
    });
  }
  return finalizeFrame(dots, lines, o.rMin);
};
const MODE_FRAMES = {
  orbits: frameOrbits,
  globe: frameGlobe,
  rubik: frameRubik,
  wave: frameWave,
  web: frameWeb,
  braid: frameBraid,
  ribbon: frameRibbon,
  ring: frameRibbon,
  morph: frameMorph,
  rest: asFrame(buildRest),
  focus: asFrame(buildFocus),
  gyro: asFrame(buildGyro),
  echo: asFrame(buildEcho),
  cube: asFrame(buildCube),
  route: asFrame(buildRoute),
  sonar: asFrame(buildSonar),
  graph: asFrame(buildGraph),
  funnel: asFrame(buildFunnel),
  raster: asFrame(buildRaster),
  vortex: asFrame(buildVortex),
  helix: asFrame(buildHelix),
  cluster: asFrame(buildCluster),
  cascade: asFrame(buildCascade),
  shatter: asFrame(buildShatter),
  fault: asFrame(buildFault),
  seal: asFrame(buildSeal),
  flightpath: asFrame(buildFlightpath),
  detour: asFrame(buildDetour),
  vigil: asFrame(buildVigil),
  attest: asFrame(buildAttest),
  ignite: asFrame(buildIgnite),
  pins: asFrame(buildPins),
  building: frameBuilding,
  tesseract: frameHypercube,
  merkaba: frameConjuring,
  assembling: frameAssembling,
  responding: frameResponding,
  field: framePresence,
  cognition: frameCognition,
  ripple: frameSpeaking,
  synapse: frameSynapse
};
const MODE_DRAWS = Object.fromEntries(
  Object.entries(MODE_FRAMES).map(([key, frame]) => [
    key,
    (ctx, size, t, dark, opts) => paintFrame(ctx, frame(size, t, opts), dark)
  ])
);
const COUNT_PAIRS = [
  ["latRings", "lonDensity"],
  ["rings", "lonDensity"],
  ["lanes", "segs"],
  ["cols", "rows"],
  ["shellRings", "shellN"],
  ["rings", "ringDots"],
  ["segN", "perSeg"],
  ["pinN", "perPin"]
];
const COUNT_KEYS = [
  "orbitN",
  "ghostN",
  "nodeN",
  "strandN",
  "signals",
  "arcN",
  "ringDots",
  "partN",
  "dotN",
  "coreN",
  "coil",
  "rungDots",
  "fieldN",
  "segDots",
  "tickN",
  "divs",
  "edgeN"
];
const ICON_DENSITY_KEYS = ["iconD"];
const RADIUS_KEYS = [
  "rBase",
  "rDepth",
  "rActive",
  "rDot",
  "ghostR",
  "partR",
  "partRDepth",
  "nodeR",
  "nodeRDepth",
  "rArc",
  "rHead",
  "rEnd",
  "rCore",
  "rPulse",
  "rTaper",
  "rNode",
  "rGlow",
  "rTravel",
  "rShell",
  "rPart",
  "rHot",
  "rEdge",
  "rEdgeHot",
  "rRung",
  "rWinner",
  "rFlash",
  "rLit",
  "rTrack",
  "rArrived",
  "rDebris",
  "rLock",
  "rSentinel",
  "rField",
  "rWave",
  "rDone",
  "rChecking",
  "rTick",
  "rSeed",
  "rPin",
  "rReached",
  "rLink"
];
function scaleCounts(opts, scale) {
  const out = { ...opts };
  const done = /* @__PURE__ */ new Set();
  const rt = Math.sqrt(scale);
  for (const [a, b] of COUNT_PAIRS) {
    const va = out[a];
    const vb = out[b];
    if (va != null && vb != null && !done.has(a) && !done.has(b)) {
      out[a] = Math.max(2, Math.round(va * rt));
      out[b] = Math.max(2, Math.round(vb * rt));
      done.add(a);
      done.add(b);
    }
  }
  for (const k of COUNT_KEYS) {
    const v = out[k];
    if (v != null && v !== 0 && !done.has(k)) out[k] = Math.max(1, Math.round(v * scale));
  }
  for (const k of ICON_DENSITY_KEYS) {
    const v = out[k];
    if (v != null) out[k] = Math.max(0.02, v * scale);
  }
  return out;
}
function scaleRadii(opts, scale) {
  const out = { ...opts };
  for (const k of RADIUS_KEYS) {
    const v = out[k];
    if (v != null) out[k] = v * scale;
  }
  out.rSizeMul = (out.rSizeMul ?? 1) * scale;
  return out;
}
const BASE_PROFILES = {
  globe: {
    latRings: 17,
    lonDensity: 44,
    rBase: 0.6,
    rDepth: 1.7,
    rBoost: 1,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  orbits: {
    orbitN: 12,
    ghostN: 40,
    ghostR: 0.9,
    ghostA: 0.5,
    particles: 3,
    partR: 1.2,
    partRDepth: 1.6,
    rsPow: 0.6,
    rMin: 0.3
  },
  rubik: {
    latRings: 15,
    lonDensity: 40,
    moveCount: 14,
    rBase: 0.6,
    rDepth: 1.7,
    rActive: 0.3,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  wave: {
    rings: 15,
    lonDensity: 40,
    rBase: 0.6,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  web: {
    nodeN: 30,
    thr: 0.72,
    signals: 5,
    nodeR: 1.4,
    nodeRDepth: 1.8,
    lineW: 0.8,
    rsPow: 0.6,
    rMin: 0.3
  },
  braid: {
    strandN: 52,
    turns: 3,
    ghostN: 150,
    rBase: 1.2,
    rDepth: 1.8,
    rsPow: 0.6,
    rMin: 0.3
  },
  ribbon: {
    lanes: 5,
    segs: 88,
    ghostN: 150,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  // ring shares ribbon's painter; faceOn cancels the camera tilt and moves
  // the undulation onto the radius, and there is no ghost sphere behind it
  ring: {
    lanes: 5,
    segs: 88,
    ghostN: 0,
    faceOn: 1,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  morph: {
    rDot: 0.021,
    iconD: 1,
    rMin: 0.25
  },
  rest: {
    dotN: 170,
    spin: 0.34,
    breath: 0.018,
    drift: 0.022,
    aFar: 0.72,
    rBase: 0.7,
    rDepth: 2,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  focus: {
    lanes: 6,
    segs: 12,
    particles: 5,
    spread: 1,
    rBase: 0.9,
    rDepth: 1.25,
    rsPow: 0.6,
    rMin: 0.3
  },
  gyro: {
    lanes: 3,
    segs: 24,
    spread: 1,
    rBase: 0.8,
    rDepth: 1.5,
    rsPow: 0.6,
    rMin: 0.3
  },
  echo: {
    lanes: 4,
    segs: 18,
    particles: 3,
    spread: 1,
    rBase: 0.85,
    rDepth: 1.05,
    rsPow: 0.6,
    rMin: 0.3
  },
  cube: {
    divs: 5,
    edgeN: 7,
    particles: 3,
    ghostN: 24,
    spread: 1,
    rBase: 0.7,
    rDepth: 1.4,
    rsPow: 0.6,
    rMin: 0.3
  },
  route: {
    latRings: 17,
    lonDensity: 44,
    arcN: 26,
    pool: 24,
    rBase: 0.6,
    rDepth: 1.7,
    rArc: 1.25,
    rHead: 1.9,
    rEnd: 2.4,
    inkFar: 0.66,
    inkSpan: 0.42,
    inkArc: 0.1,
    dimBase: 0.55,
    trailA: 1,
    headWidth: 0.16,
    lift: 0.09,
    rsPow: 0.6,
    rMin: 0.3
  },
  sonar: {
    ringN: 4,
    ringDots: 34,
    reach: 0.9,
    period: 1.6,
    spin: 0.25,
    rBase: 2.3,
    rTaper: 1,
    rCore: 2.3,
    rPulse: 1.1,
    inkNear: 0.08,
    inkSpan: 0.5,
    ringA: 1,
    fade: 0.3,
    rsPow: 0.6,
    rMin: 0.3
  },
  synapse: {
    nodeN: 28,
    signals: 8,
    pulseSpeed: 0.48,
    spin: 0.1,
    nodeR: 1.15,
    nodeRDepth: 1.4,
    rTravel: 1.55,
    rDepth: 1.1,
    lineW: 0.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  graph: {
    nodeN: 22,
    edgeN: 5,
    edgeSeg: 5,
    trail: 4,
    spin: 0.16,
    cometLen: 0.32,
    rNode: 1.35,
    rDepth: 1.1,
    rGlow: 1.9,
    rTravel: 1.6,
    rEdge: 0.5,
    rEdgeHot: 0.5,
    inkNode: 0.5,
    inkGlow: 0.44,
    inkEdge: 0.66,
    inkEdgeHot: 0.3,
    nodeA: 0.92,
    edgeA: 0.85,
    rsPow: 0.6,
    rMin: 0.3
  },
  funnel: {
    partN: 60,
    shellN: 22,
    shellRings: 7,
    waist: 0.16,
    spin: 0.2,
    flowRate: 0.5,
    rShell: 0.85,
    rDepth: 1.5,
    rPart: 1.45,
    rHot: 0.6,
    inkShell: 0.66,
    inkPart: 0.2,
    shellA: 0.88,
    rsPow: 0.6,
    rMin: 0.3
  },
  raster: {
    cols: 12,
    rows: 12,
    inset: 0.13,
    period: 1.35,
    band: 1.4,
    cursorRate: 4.2,
    rBase: 1.6,
    rActive: 1.7,
    inkAhead: 0.62,
    inkRead: 0.36,
    inkActive: 0.06,
    baseA: 0.9,
    rsPow: 0.6,
    rMin: 0.3
  },
  vortex: {
    partN: 130,
    coreN: 12,
    arms: 3,
    armJitter: 0.14,
    turns: 2.2,
    tilt: 1.15,
    disk: 0.18,
    spin: 0.14,
    flowRate: 0.34,
    rPart: 0.95,
    rDepth: 1.6,
    rHot: 0.7,
    rCore: 1.1,
    inkFar: 0.66,
    inkSpan: 0.5,
    inkCore: 0.16,
    partA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  helix: {
    coil: 54,
    pitch: 2.6,
    spin: 1.15,
    tilt: 0.22,
    taper: 0.45,
    rungEvery: 5,
    rungDots: 3,
    rBase: 1.05,
    rDepth: 1.7,
    rRung: 0.7,
    inkFar: 0.66,
    inkSpan: 0.54,
    inkRung: 0.66,
    strandA: 1,
    rungA: 0.9,
    rsPow: 0.6,
    rMin: 0.3
  },
  cluster: {
    dotN: 150,
    groups: 3,
    spread: 0.62,
    spin: 0.2,
    rBase: 0.7,
    rDepth: 1.7,
    rWinner: 0.8,
    inkFar: 0.66,
    inkSpan: 0.54,
    inkWinner: 0.22,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  cascade: {
    cols: 16,
    rows: 10,
    inset: 0.12,
    ragged: 0.42,
    period: 2.6,
    holdFrac: 0.38,
    rBase: 2.1,
    rHead: 1.6,
    inkWritten: 0.5,
    inkHead: 0.06,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  fault: {
    dotN: 44,
    reach: 0.5,
    blast: 0.7,
    arm: 0.8,
    spin: 0.35,
    rBase: 0.9,
    rDepth: 1.6,
    rX: 2.05,
    inkFar: 0.66,
    inkSpan: 0.54,
    inkX: 0.1,
    dotA: 1,
    rsPow: 0.6,
    rMin: 0.3
  },
  shatter: {
    dotN: 190,
    reach: 0.44,
    blast: 0.95,
    settle: 1,
    fall: 0,
    spin: 0.18,
    farK: 0.45,
    rBase: 1,
    rDepth: 1.7,
    rFlash: 0.7,
    inkFar: 0.66,
    inkSpan: 0.54,
    inkOut: 0.2,
    dotA: 1,
    rsPow: 0.6,
    rMin: 0.3
  },
  seal: {
    dotN: 104,
    coreN: 16,
    ringR: 0.72,
    coreR: 0.26,
    reach: 0.9,
    scatter: 0.42,
    spreadA: 0.5,
    overshoot: 0.055,
    rBase: 1.4,
    rLock: 0.6,
    rCore: 1.2,
    inkLoose: 0.66,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  flightpath: {
    arcN: 92,
    reach: 0.92,
    bow: 0.3,
    period: 2.4,
    headWidth: 0.1,
    aheadOn: 0.24,
    trackOn: 0.3,
    markN: 8,
    markR: 0.075,
    rArc: 1.25,
    rTrack: 0.8,
    rLit: 1.25,
    rEnd: 1.15,
    inkNear: 0.08,
    inkFar: 0.7,
    inkSpan: 0.22,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  detour: {
    arcN: 58,
    reach: 0.92,
    bow: 0.3,
    bowAlt: -0.26,
    gap: 0.13,
    debris: 10,
    debrisSpread: 0.2,
    markN: 8,
    markR: 0.075,
    rArc: 1.2,
    rLit: 1.25,
    rEnd: 1.15,
    rDebris: 1,
    inkNear: 0.08,
    inkFar: 0.7,
    inkSpan: 0.22,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  vigil: {
    fieldN: 128,
    reach: 0.82,
    spin: 0.07,
    orbit: 0.55,
    orbitY: 0.18,
    beatEvery: 3.2,
    rippleReach: 2.6,
    rippleWidth: 0.42,
    trail: 5,
    trailGap: 0.14,
    rField: 0.85,
    rDepth: 1.7,
    rWave: 0.8,
    rSentinel: 1.5,
    inkFar: 0.74,
    inkSpan: 0.3,
    inkWave: 0.34,
    fieldA: 0.92,
    rsPow: 0.6,
    rMin: 0.3
  },
  attest: {
    segN: 12,
    perSeg: 7,
    tickN: 7,
    reach: 0.84,
    ringR: 0.88,
    gapFrac: 0.28,
    period: 2.6,
    holdFrac: 0.24,
    rBase: 1.6,
    rDone: 0.55,
    rChecking: 0.5,
    rTick: 1.3,
    inkPending: 0.66,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  ignite: {
    rings: 7,
    ringDots: 26,
    reach: 0.88,
    spin: 0.1,
    period: 2.8,
    holdFrac: 0.26,
    frontWidth: 0.16,
    rBase: 1.45,
    rHot: 0.8,
    rSeed: 1.9,
    rPulse: 0.5,
    inkCold: 0.68,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  },
  building: {
    ghostN: 12,
    spin: 2,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  tesseract: {
    ghostN: 7,
    spin: 2,
    rBase: 0.8,
    rDepth: 1.5,
    rsPow: 0.6,
    rMin: 0.3
  },
  merkaba: {
    ghostN: 16,
    spin: 1.4,
    rBase: 1,
    rDepth: 1.6,
    rsPow: 0.6,
    rMin: 0.3
  },
  assembling: {
    ghostN: 14,
    spin: 2,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  responding: {
    pulseN: 156,
    shellCount: 3,
    pulseSpeed: 0.17,
    rBase: 0.7,
    rDepth: 1.6,
    rsPow: 0.6,
    rMin: 0.3
  },
  field: {
    dotN: 160,
    rBase: 0.75,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  cognition: {
    dotN: 170,
    rBase: 0.75,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  ripple: {
    dotN: 160,
    rBase: 0.75,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  pins: {
    pinN: 6,
    perPin: 8,
    segDots: 6,
    reach: 0.82,
    pinRing: 0.62,
    clusterR: 0.11,
    rDot: 1.15,
    rPin: 1,
    rReached: 0.6,
    rLink: 1.05,
    inkNoise: 0.7,
    inkReached: 0.16,
    inkLink: 0.3,
    linkA: 0.9,
    dotA: 0.95,
    rsPow: 0.6,
    rMin: 0.3
  }
};
const STATE_TO_MODE = {
  working: "orbits",
  searching: "globe",
  solving: "rubik",
  listening: "wave",
  connecting: "web",
  weaving: "braid",
  composing: "ribbon",
  breathing: "ring",
  shaping: "morph",
  idle: "rest",
  thinking: "ring",
  analyzing: "globe",
  booking: "rubik",
  streaming: "ribbon",
  success: "rubik",
  tracing: "route",
  waiting: "sonar",
  reasoning: "graph",
  queuing: "funnel",
  reading: "raster",
  gathering: "vortex",
  syncing: "helix",
  comparing: "cluster",
  drafting: "cascade",
  retrying: "shatter",
  error: "fault",
  committing: "seal",
  progressing: "flightpath",
  monitoring: "vigil",
  diverting: "detour",
  verifying: "attest",
  activating: "ignite",
  plotting: "pins",
  focusing: "focus",
  pondering: "gyro",
  recalling: "echo",
  cubing: "cube",
  building: "building",
  hypercube: "tesseract",
  conjuring: "merkaba",
  conjuring_static: "merkaba",
  assembling: "assembling",
  evolving: "ribbon",
  spinning: "ribbon",
  responding: "responding",
  presence: "field",
  cognition: "cognition",
  speaking: "ripple",
  relaying: "synapse"
};
const MIN_SIZE = 12;
const MAX_SIZE = 256;
const PRESETS = {
  orbits: {
    64: { speed: 1.885, count: 1, size: 1 },
    20: { speed: 3.9, count: 0.238, size: 2.4 }
  },
  globe: {
    64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } },
    20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } }
  },
  rubik: {
    64: { speed: 1.82, count: 0.35, size: 1.05 },
    20: { speed: 1.95, count: 0.088, size: 1.9 }
  },
  wave: {
    64: { speed: 4.388, count: 0.341, size: 1 },
    20: { speed: 3.998, count: 0.105, size: 1.6 }
  },
  web: {
    64: { speed: 3.315, count: 1.35, size: 0.95 },
    20: { speed: 6.63, count: 0.25, size: 1.52 }
  },
  braid: {
    64: { speed: 1.625, count: 0.5, size: 1 },
    20: { speed: 2.75, count: 0.1125, size: 1.36 }
  },
  ribbon: {
    64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } }
  },
  ring: {
    64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  morph: {
    64: { speed: 2.405, count: 0.702, size: 0.395, extra: { spread: 1.45 } },
    20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } }
  }
};
const PRESETS_128 = {
  orbits: { speed: 1.65, count: 1.35, size: 0.78 },
  globe: { speed: 1.85, count: 0.68, size: 0.8, extra: { scanMul: 4.08, dimBase: 0.45 } },
  rubik: { speed: 1.65, count: 0.55, size: 0.78 },
  wave: { speed: 4, count: 0.55, size: 0.78 },
  web: { speed: 3, count: 1.7, size: 0.75 },
  braid: { speed: 1.5, count: 0.75, size: 0.78 },
  ribbon: { speed: 2.15, count: 0.4, size: 0.7, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
  ring: { speed: 3, count: 0.4, size: 0.75, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
  morph: { speed: 2.2, count: 1.05, size: 0.28, extra: { spread: 1.45 } }
};
const cache = /* @__PURE__ */ new Map();
const logLerp = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
function lerpExtra(a, b, t) {
  if (!a && !b) return void 0;
  const out = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const va = a == null ? void 0 : a[k];
    const vb = b == null ? void 0 : b[k];
    if (va == null) out[k] = vb;
    else if (vb == null) out[k] = va;
    else out[k] = va + (vb - va) * t;
  }
  return out;
}
function applyPreset(mode, preset, cycle) {
  let opts = { ...BASE_PROFILES[mode] };
  if (preset.count !== 1) opts = scaleCounts(opts, preset.count);
  if (preset.size !== 1) opts = scaleRadii(opts, preset.size);
  if (preset.extra) opts = { ...opts, ...preset.extra };
  return { mode, speed: preset.speed, opts, cycle };
}
function fromAnchors(mode, aLo, aHi, size, cycle, lo = 20, hi = 64) {
  const t = (Math.log(size) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  const speed = logLerp(aLo.speed, aHi.speed, t);
  const count = logLerp(aLo.count, aHi.count, Math.min(t, 1.6));
  const rsize = logLerp(aLo.size, aHi.size, t);
  const extra = lerpExtra(aLo.extra, aHi.extra, t);
  let opts = { ...BASE_PROFILES[mode] };
  if (count !== 1) opts = scaleCounts(opts, count);
  if (rsize !== 1) opts = scaleRadii(opts, rsize);
  if (extra) opts = { ...opts, ...extra };
  return { mode, speed, opts, cycle };
}
const rubikCycle = (moveCount) => 2 * moveCount * 0.42 + 1.2;
const EXTRA = {
  idle: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.15, count: 0.28, size: 1.7 } },
  thinking: {
    a64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    a20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  analyzing: {
    a64: { speed: 2.85, count: 0.55, size: 1.1, extra: { scanMul: 6.1, dimBase: 0.32 } },
    a20: { speed: 3.1, count: 0.13, size: 1.7, extra: { scanMul: 6.4, dimBase: 0.32 } }
  },
  booking: {
    a64: { speed: 1.05, count: 0.35, size: 1.05, extra: { moveCount: 6 } },
    a20: { speed: 1.18, count: 0.088, size: 1.9, extra: { moveCount: 6 } }
  },
  streaming: {
    a64: { speed: 2.6, count: 0.25, size: 0.85, extra: { spin: 1, bandMul: 3.2, wobMul: 1.35 } },
    a20: { speed: 3.35, count: 0.075, size: 1.073, extra: { spin: 0.4, bandMul: 5.2, wobMul: 1.1 } }
  },
  success: {
    cycle: rubikCycle(5),
    a64: { speed: 1.6, count: 0.35, size: 1.05, extra: { moveCount: 5 } },
    a20: { speed: 1.7, count: 0.088, size: 1.9, extra: { moveCount: 5 } }
  },
  tracing: {
    a64: { speed: 0.62, count: 0.42, size: 1.15, extra: { dimBase: 0.52, lift: 0.09 } },
    a20: { speed: 0.72, count: 0.115, size: 1.7, extra: { dimBase: 0.44, lift: 0.13 } }
  },
  waiting: {
    a64: { speed: 1, count: 1.55, size: 1, extra: { ringN: 4, rTaper: 1 } },
    a20: { speed: 1.05, count: 0.5, size: 1.7, extra: { ringN: 3, rTaper: 0.8 } }
  },
  reasoning: {
    a64: { speed: 1.55, count: 1.25, size: 1, extra: { trail: 4, edgeN: 5, edgeSeg: 7 } },
    a20: { speed: 1.5, count: 0.6, size: 1.9, extra: { trail: 3, edgeN: 4, edgeSeg: 3 } }
  },
  queuing: {
    a64: { speed: 1, count: 1, size: 1, extra: { waist: 0.16, shellRings: 7, shellN: 22 } },
    a20: { speed: 1.1, count: 0.26, size: 1.65, extra: { waist: 0.22, shellRings: 5, shellN: 7 } }
  },
  reading: {
    a64: { speed: 1, count: 1, size: 1, extra: { band: 1.4, inset: 0.13 } },
    a20: { speed: 1.05, count: 0.25, size: 1.7, extra: { band: 1.1, inset: 0.1 } }
  },
  gathering: {
    a64: { speed: 1.15, count: 1, size: 1, extra: { turns: 2.2, disk: 0.18, arms: 3, tilt: 1.15 } },
    a20: { speed: 1.3, count: 0.3, size: 1.9, extra: { turns: 1.6, disk: 0.22, arms: 2, tilt: 1.05 } }
  },
  syncing: {
    a64: { speed: 1, count: 1.15, size: 1, extra: { pitch: 2.6, rungEvery: 5, taper: 0.45 } },
    a20: { speed: 1.1, count: 0.3, size: 1.85, extra: { pitch: 1.7, rungEvery: 4, taper: 0.3 } }
  },
  comparing: {
    a64: { speed: 1, count: 1, size: 1, extra: { groups: 3, spread: 0.62 } },
    a20: { speed: 1.05, count: 0.24, size: 1.85, extra: { groups: 3, spread: 0.55 } }
  },
  drafting: {
    a64: { speed: 1, count: 1.35, size: 1, extra: { ragged: 0.42, inset: 0.12 } },
    a20: { speed: 1.05, count: 0.38, size: 1.8, extra: { ragged: 0.34, inset: 0.1 } }
  },
  retrying: {
    a64: { speed: 1, count: 1, size: 1, extra: { blast: 0.95, settle: 1, farK: 0.45, reach: 0.44, fall: 0 } },
    a20: { speed: 1.05, count: 0.16, size: 1.8, extra: { blast: 0.8, settle: 1, farK: 0.5, reach: 0.46, fall: 0 } }
  },
  committing: {
    a64: { speed: 1, count: 1, size: 1, extra: { ringR: 0.72, scatter: 0.42 } },
    a20: { speed: 1.1, count: 0.24, size: 1.62, extra: { ringR: 0.74, scatter: 0.34 } }
  },
  progressing: {
    a64: { speed: 1, count: 1, size: 1, extra: { bow: 0.3, aheadOn: 0.24 } },
    a20: { speed: 1.05, count: 0.42, size: 1.9, extra: { bow: 0.34, aheadOn: 0.32 } }
  },
  monitoring: {
    a64: { speed: 0.2, count: 1, size: 1, extra: { orbit: 0.55, beatEvery: 3.2 } },
    a20: { speed: 0.26, count: 0.24, size: 1.7, extra: { orbit: 0.6, beatEvery: 3 } }
  },
  diverting: {
    a64: { speed: 1, count: 1, size: 1, extra: { gap: 0.13, debris: 10, bow: 0.3 } },
    a20: { speed: 1.05, count: 0.42, size: 1.9, extra: { gap: 0.17, debris: 7, bow: 0.34 } }
  },
  verifying: {
    a64: { speed: 1, count: 1, size: 1, extra: { segN: 12, perSeg: 7 } },
    a20: { speed: 1.05, count: 0.34, size: 1.8, extra: { segN: 7, perSeg: 4 } }
  },
  activating: {
    a64: { speed: 1, count: 1, size: 1, extra: { frontWidth: 0.16, rings: 7 } },
    a20: { speed: 1.05, count: 0.24, size: 1.65, extra: { frontWidth: 0.22, rings: 5 } }
  },
  plotting: {
    a64: { speed: 1, count: 1, size: 1, extra: { pinN: 6, perPin: 12, clusterR: 0.11, segDots: 9 } },
    a20: { speed: 1.05, count: 0.34, size: 1.85, extra: { pinN: 4, perPin: 8, clusterR: 0.15, segDots: 6 } }
  },
  error: {
    cycle: faultCycle(),
    a64: { speed: 1, count: 1, size: 1, extra: { blast: 0.7, arm: 0.8, reach: 0.5 } },
    a20: { speed: 1.05, count: 0.5, size: 1.4, extra: { blast: 0.6, arm: 0.84, reach: 0.52 } }
  },
  focusing: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.1, count: 0.45, size: 1.55 } },
  pondering: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.08, count: 0.5, size: 1.6 } },
  recalling: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.1, count: 0.42, size: 1.55 } },
  cubing: { a64: { speed: 1, count: 1, size: 1 }, a20: { speed: 1.15, count: 0.4, size: 1.65 } },
  building: {
    a64: { speed: 1.5, count: 1, size: 0.9, extra: { spin: 2, ghostN: 18 } },
    a20: { speed: 2, count: 0.4, size: 1.4, extra: { spin: 2, ghostN: 8 } }
  },
  hypercube: {
    a64: { speed: 1.8, count: 1, size: 0.9, extra: { spin: 2, ghostN: 7 } },
    a20: { speed: 2.2, count: 0.5, size: 1.3, extra: { spin: 2, ghostN: 4 } }
  },
  conjuring: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 1.4, ghostN: 16 } },
    a20: { speed: 1.8, count: 0.5, size: 1.3, extra: { spin: 1.4, ghostN: 8 } }
  },
  conjuring_static: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 0, ghostN: 16 } },
    a20: { speed: 1.8, count: 0.5, size: 1.3, extra: { spin: 0, ghostN: 8 } }
  },
  assembling: {
    a64: { speed: 1.6, count: 1, size: 0.9, extra: { spin: 2, ghostN: 16 } },
    a20: { speed: 2, count: 0.5, size: 1.3, extra: { spin: 2, ghostN: 8 } }
  },
  evolving: {
    a64: { speed: 2.5, count: 0.4, size: 0.9, extra: { spin: 2.5, bandMul: 8.5, wobMul: 1.5, lanes: 4 } },
    a20: { speed: 3.2, count: 0.15, size: 1.2, extra: { spin: 2.5, bandMul: 8.5, wobMul: 1.5, lanes: 4 } }
  },
  spinning: {
    a64: { speed: 4.5, count: 0.8, size: 0.8, extra: { lanes: 12, spin: 3, bandMul: 0, wobMul: 0 } },
    a20: { speed: 5.5, count: 0.25, size: 1.2, extra: { lanes: 6, spin: 3, bandMul: 0, wobMul: 0 } }
  },
  responding: {
    a64: { speed: 1.2, count: 1, size: 1, extra: { pulseN: 156, shellCount: 3 } },
    a20: { speed: 1.4, count: 0.4, size: 1.5, extra: { pulseN: 70, shellCount: 2 } }
  },
  presence: {
    a64: { speed: 0.7, count: 1, size: 1, extra: { dotN: 160 } },
    a20: { speed: 0.85, count: 0.28, size: 1.6, extra: { dotN: 48 } }
  },
  cognition: {
    a64: { speed: 1.05, count: 1, size: 1, extra: { dotN: 170 } },
    a20: { speed: 1.2, count: 0.3, size: 1.55, extra: { dotN: 52 } }
  },
  speaking: {
    a64: { speed: 1.35, count: 1, size: 1, extra: { dotN: 160 } },
    a20: { speed: 1.5, count: 0.3, size: 1.55, extra: { dotN: 48 } }
  },
  relaying: {
    a64: { speed: 1.15, count: 1, size: 1, extra: { nodeN: 28, signals: 8 } },
    a20: { speed: 1.25, count: 0.45, size: 1.55, extra: { nodeN: 14, signals: 4 } }
  }
};
function resolvePreset(state, size) {
  const mode = STATE_TO_MODE[state] ?? STATE_TO_MODE.working;
  let s = size;
  if (!Number.isFinite(s) || s <= 0) s = 64;
  s = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, s)));
  const key = `${state}-${s}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const extra = EXTRA[state];
  let resolved;
  if (extra) {
    resolved = fromAnchors(mode, extra.a20, extra.a64, s, extra.cycle);
  } else {
    const table = PRESETS[mode];
    const large = PRESETS_128[mode];
    if (s === 20 || s === 64) {
      resolved = applyPreset(mode, table[s]);
    } else if (s === 128) {
      resolved = applyPreset(mode, large);
    } else if (s < 64) {
      resolved = fromAnchors(mode, table[20], table[64], s);
    } else {
      resolved = fromAnchors(mode, table[64], large, s, void 0, 64, 128);
    }
  }
  cache.set(key, resolved);
  return resolved;
}
function paintOrb(ctx, size, state, timeSeconds, dark) {
  const { mode, speed, opts } = resolvePreset(state, size);
  const draw = MODE_DRAWS[mode];
  if (!draw) return;
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size, timeSeconds * speed, dark, opts);
}
function phaseToOrbState(phase, toolName) {
  const p = phase.toLowerCase();
  if (p === "listening" || p === "recording" || p === "transcribing") return "listening";
  if (p === "speaking" || p === "talking") return "speaking";
  if (p === "thinking" || p === "processing") return "thinking";
  if (p === "composing" || p === "streaming") return "composing";
  if (p === "searching" || p === "reading") return "searching";
  if (p === "shaping" || p === "writing" || p === "editing") return "shaping";
  if (p === "working" || p === "tool") return classifyTool(toolName);
  if (p === "relaying") return "relaying";
  return "idle";
}
function classifyTool(toolName) {
  const name = (toolName ?? "").toLowerCase();
  if (["edit", "write", "apply_patch", "str_replace"].some((n) => name.includes(n))) {
    return "shaping";
  }
  if (["read", "search", "grep", "glob", "find", "ls", "web_search", "web_fetch"].some(
    (n) => name.includes(n)
  )) {
    return "searching";
  }
  return "working";
}
const ID = "thinking-orbs";
const VOICE_BUS = "hermes:voice-bus";
const $state = atom("idle");
const $preview = atom("");
const bySession = /* @__PURE__ */ new Map();
function sessionAtom() {
  return host.state.focusedSessionId || host.state.activeSessionId;
}
function currentSid() {
  const atom2 = sessionAtom();
  const id = atom2 && typeof atom2.get === "function" ? atom2.get() : null;
  return typeof id === "string" && id.length > 0 ? id : "";
}
function currentState() {
  return $preview.get() || $state.get();
}
function eventIds(event, payload) {
  const ids = [event.session_id, payload.session_id, payload.stored_session_id];
  return ids.filter((id) => typeof id === "string" && id.length > 0);
}
function showFor(sid, next) {
  if (sid) bySession.set(sid, next);
  const focused = currentSid();
  if (!focused || !sid || sid === focused) $state.set(next);
}
function showActive() {
  const focused = currentSid();
  $state.set(focused && bySession.get(focused) || "idle");
}
function isDark() {
  var _a, _b;
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  const theme = root.dataset.theme || root.getAttribute("data-theme") || "";
  if (theme.includes("light")) return false;
  if (theme.includes("dark")) return true;
  return ((_b = (_a = window.matchMedia) == null ? void 0 : _a.call(window, "(prefers-color-scheme: dark)")) == null ? void 0 : _b.matches) ?? true;
}
function OrbCanvas({ size, label }) {
  const ref = useRef(null);
  const state = useValue($state);
  const preview = useValue($preview);
  const shown = preview || state;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    const started = performance.now();
    const loop = (now) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(size * dpr);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintOrb(ctx, size, currentState(), (now - started) / 1e3, isDark());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, shown]);
  return jsx("canvas", {
    ref,
    width: size,
    height: size,
    "aria-label": label,
    style: { width: size, height: size, display: "block" }
  });
}
function OrbPane() {
  const state = useValue($state);
  const preview = useValue($preview);
  const shown = preview || state;
  return jsxs("div", {
    className: "flex h-full flex-col items-center justify-center gap-3 p-3 text-sm",
    children: [
      jsx(OrbCanvas, { size: 96, label: `Thinking orb ${shown}` }),
      jsx("div", {
        className: "text-(--ui-text-secondary)",
        children: shown
      }),
      jsx("div", {
        className: "text-[0.6875rem] text-(--ui-text-quaternary)",
        children: preview ? "preview — /orbs off via palette" : "live"
      })
    ]
  });
}
function StatusChip() {
  const state = useValue($state);
  const preview = useValue($preview);
  const shown = preview || state;
  return jsx(Tip, {
    label: `Thinking orb · ${shown}`,
    children: jsx("div", {
      className: "inline-flex h-full items-center px-1",
      children: jsx(OrbCanvas, { size: 18, label: shown })
    })
  });
}
function applyEvent(event) {
  if (!event || typeof event !== "object") return;
  const type = String(event.type || "");
  if (type === "thinking.delta") return;
  const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
  const ids = eventIds(event, payload);
  const active = currentSid();
  const sid = ids[0] || active || "";
  const forActive = !ids.length || active && ids.includes(active);
  if (type === "session.info" && typeof payload.running === "boolean") {
    showFor(sid, payload.running ? bySession.get(sid) || "thinking" : "idle");
    return;
  }
  if (type === "message.start") {
    showFor(sid, "thinking");
    return;
  }
  if (type === "message.delta" || type === "message.interim") {
    if (forActive || sid) showFor(sid, "composing");
    return;
  }
  if (type === "message.complete" || type === "error") {
    showFor(sid, "idle");
    return;
  }
  if (type === "tool.start" || type === "tool.generating") {
    showFor(sid, classifyTool(payload.toolName || payload.name || payload.tool || payload.tool_name));
    return;
  }
  if (type === "tool.complete") {
    showFor(sid, "thinking");
  }
}
function onVoiceBus(event) {
  const detail = (event == null ? void 0 : event.detail) && typeof event.detail === "object" ? event.detail : {};
  const phase = String(detail.phase || detail.state || "");
  if (!phase) return;
  $preview.set("");
  showFor(currentSid() || "", phaseToOrbState(phase, detail.toolName));
}
const plugin = {
  id: ID,
  name: "Thinking Orbs",
  defaultEnabled: true,
  register(ctx) {
    const offGw = host.onEvent("*", applyEvent);
    const sidAtom = sessionAtom();
    const offSid = typeof sidAtom.subscribe === "function" ? sidAtom.subscribe(() => showActive()) : typeof sidAtom.listen === "function" ? sidAtom.listen(() => showActive()) : null;
    showActive();
    if (typeof window !== "undefined") {
      window.addEventListener(VOICE_BUS, onVoiceBus);
    }
    const dispose = ctx.registerMany ? ctx.registerMany([
      {
        id: "pane",
        area: "panes",
        title: "thinking orb",
        data: { placement: "right", width: "220px" },
        render: () => jsx(OrbPane, {})
      },
      {
        id: "chip",
        area: STATUSBAR_AREAS.right,
        order: 126,
        render: () => jsx(StatusChip, {})
      },
      {
        id: "preview",
        area: PALETTE_AREA,
        data: {
          id: "thinking-orbs.preview",
          label: "Thinking Orbs: Preview cycle",
          keywords: ["orb", "thinking", "preview"],
          run: () => {
            const seq = ["listening", "thinking", "searching", "working", "shaping", "composing", "speaking"];
            let i = 0;
            $preview.set(seq[0]);
            const tick = () => {
              i += 1;
              if (i >= seq.length) {
                $preview.set("");
                host.notify({ kind: "info", message: "Orb preview finished" });
                return;
              }
              $preview.set(seq[i]);
              setTimeout(tick, 1800);
            };
            setTimeout(tick, 1800);
          }
        }
      },
      {
        id: "live",
        area: PALETTE_AREA,
        data: {
          id: "thinking-orbs.live",
          label: "Thinking Orbs: Back to live",
          keywords: ["orb", "live"],
          run: () => $preview.set("")
        }
      }
    ]) : void 0;
    if (!ctx.registerMany) {
      ctx.register({
        id: "pane",
        area: "panes",
        title: "thinking orb",
        data: { placement: "right", width: "220px" },
        render: () => jsx(OrbPane, {})
      });
      ctx.register({
        id: "chip",
        area: STATUSBAR_AREAS.right,
        order: 126,
        render: () => jsx(StatusChip, {})
      });
    }
    return () => {
      try {
        offGw == null ? void 0 : offGw();
      } catch {
      }
      try {
        offSid == null ? void 0 : offSid();
      } catch {
      }
      if (typeof window !== "undefined") {
        window.removeEventListener(VOICE_BUS, onVoiceBus);
      }
      try {
        dispose == null ? void 0 : dispose();
      } catch {
      }
    };
  }
};
export {
  plugin as default
};
