/**
 * n-cube construction and plane rotations, ported from gianlucamazza/hypercube
 * (MIT). XR, Schlegel chrome, and the adaptive projection cascade were not copied.
 * Vertex index i IS its coordinate signature: bit b → ±0.5.
 */

export function hypercube(n: number): { n: number; vertices: number[][]; edges: Array<[number, number]> } {
  const count = 2 ** n;
  const vertices: number[][] = [];
  for (let i = 0; i < count; i++) {
    const v: number[] = [];
    for (let b = 0; b < n; b++) v.push(i & (1 << b) ? 0.5 : -0.5);
    vertices.push(v);
  }
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    for (let b = 0; b < n; b++) {
      if (!(i & (1 << b))) edges.push([i, i | (1 << b)]);
    }
  }
  return { n, vertices, edges };
}

/** Binary-reflected Gray code: consecutive entries differ in one bit. */
export function grayCode(n: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < 2 ** n; i++) seq.push(i ^ (i >> 1));
  return seq;
}

export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    return row;
  });
}

export function mulMatVec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (v[j] ?? 0), 0));
}

/** Q' = R(i,j,θ) Q, touching only rows i and j. */
export function applyPlaneRotation(Q: number[][], i: number, j: number, theta: number): number[][] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const out = Q.map((row) => row.slice());
  const n = Q[0]?.length ?? 0;
  for (let k = 0; k < n; k++) {
    const a = Q[i]![k]!;
    const b = Q[j]![k]!;
    out[i]![k] = c * a - s * b;
    out[j]![k] = s * a + c * b;
  }
  return out;
}

/**
 * Fixed-distance perspective 4D→2D. Safe for the unit hypercube
 * (camera sits outside the circumradius).
 */
export function project4to2(v: number[]): { x: number; y: number; depth: number; warm: number } {
  const x = v[0] ?? 0;
  const y = v[1] ?? 0;
  const z = v[2] ?? 0;
  const w = v[3] ?? 0;
  const d4 = 2.2;
  const s4 = d4 / (d4 - w);
  const x3 = x * s4;
  const y3 = y * s4;
  const z3 = z * s4;
  const d3 = 2.4;
  const s3 = d3 / (d3 - z3);
  return { x: x3 * s3, y: y3 * s3, depth: z3, warm: w };
}

export function hamming(a: number, b: number): number {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += x & 1;
    x >>= 1;
  }
  return n;
}
