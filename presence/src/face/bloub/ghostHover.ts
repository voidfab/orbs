import { TAU } from './math'

/** deja-mascot.gif is a 4s / 10fps loop. */
export const GHOST_HOVER_PERIOD = 4

/**
 * Idle hover for the sheet ghost: traveling hem, vertical bob, squash.
 * At t=0 the displacement is zero so goldens and burst-vs-idle stay identical.
 * Head samples (upper hemisphere) are left alone so the two eyes stay put.
 */
export function ghostHover(
  rest: number[],
  t: number
): { radii: number[]; cy: number; sx: number; sy: number } {
  const phase = (t / GHOST_HOVER_PERIOD) * TAU
  const bob = Math.sin(phase)
  const n = rest.length
  const radii = rest.slice()
  const amp = 0.07
  const lobes = 3
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const s = Math.sin(a)
    if (s < 0.22) continue
    const hemT = (a - 0.22) / (Math.PI - 0.44)
    if (hemT <= 0 || hemT >= 1) continue
    const arg = TAU * (lobes - 1) * hemT
    // zero-mean vs rest: at phase=0, delta=0.
    const delta = Math.sin(arg - phase) - Math.sin(arg)
    const env = Math.min(1, (s - 0.22) / 0.5)
    radii[i] = (rest[i] ?? 1) * (1 + amp * env * delta)
  }
  return {
    radii,
    cy: 0.055 * bob,
    sx: 1 + 0.03 * bob,
    sy: 1 - 0.025 * bob
  }
}
