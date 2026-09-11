/**
 * Pupil look from omarchy-googly-eyes (Wayland port of Sindre Sorhus's
 * menu-bar googly eyes). Host chrome was not copied — just the look vector
 * and a spring so pupils overshoot like loose discs.
 */

export function lookVector(
  dx: number,
  dy: number,
  ramp = 48
): { x: number; y: number; distance: number } {
  const distance = Math.hypot(dx, dy);
  if (!(distance > 0.0001)) return { x: 0, y: 0, distance: 0 };
  const reach = ramp > 0 ? Math.min(1, distance / ramp) : 1;
  return { x: (dx / distance) * reach, y: (dy / distance) * reach, distance };
}

export interface Spring2 {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function stepSpring(s: Spring2, targetX: number, targetY: number, dt: number): Spring2 {
  const stiffness = 180;
  const damping = 16;
  const ax = (targetX - s.x) * stiffness - s.vx * damping;
  const ay = (targetY - s.y) * stiffness - s.vy * damping;
  return {
    x: s.x + s.vx * dt,
    y: s.y + s.vy * dt,
    vx: s.vx + ax * dt,
    vy: s.vy + ay * dt
  };
}
