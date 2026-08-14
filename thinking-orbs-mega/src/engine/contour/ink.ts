export const ORB_MAX_ALPHA = 0.72;
export const ORB_SHIMMER_MAX_ALPHA = 0.92;

export function capOrbAlpha(alpha: number, maximum = ORB_MAX_ALPHA): number {
  return Math.min(maximum, Math.max(0, alpha));
}

export type ContourInk = readonly [number, number, number];

let tint: ContourInk | null = null;

export function setContourTint(rgb: ContourInk | null): void {
  tint = rgb;
}

export function contourCss(dark: boolean, alpha: number, maximum = ORB_MAX_ALPHA): string {
  const a = capOrbAlpha(alpha, maximum);
  if (tint) return `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
  return dark ? `rgba(250,250,250,${a})` : `rgba(24,24,27,${a})`;
}
