import type { BotFrame } from './bloub/engine';
import { DEMI_VIEWBOX } from './bloub/repere';

export interface FacePaintTheme {
  dark: boolean;
  ink: string;
  paper: string;
}

export function faceTheme(dark: boolean): FacePaintTheme {
  return dark
    ? { dark: true, ink: '#f4f4f5', paper: '#111113' }
    : { dark: false, ink: '#111113', paper: '#f4f4f5' };
}

function parseMatrix(m: string): DOMMatrix | null {
  const match = /^matrix\((.+)\)$/.exec(m);
  if (!match) return null;
  const n = match[1].split(',').map(Number);
  if (n.length !== 6 || n.some((v) => !Number.isFinite(v))) return null;
  return new DOMMatrix([n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, n[5]!]);
}

function paintPath(
  ctx: CanvasRenderingContext2D,
  d: string,
  fill: string,
  alpha: number
): void {
  if (alpha <= 0.01 || !d) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(d));
  ctx.restore();
}

export function paintFaceFrame(
  ctx: CanvasRenderingContext2D,
  frame: BotFrame,
  size: number,
  theme: FacePaintTheme
): void {
  const dim = 2 * DEMI_VIEWBOX;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / dim, size / dim);

  if (frame.dotsBehind) {
    for (const d of frame.dots) {
      ctx.save();
      ctx.globalAlpha = d.opacity;
      ctx.fillStyle = d.color ?? theme.ink;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (const arc of frame.arcs) {
    if (arc.back) {
      ctx.save();
      ctx.globalAlpha = arc.opacity * 0.45;
      ctx.strokeStyle = arc.grad.stops[0] ?? theme.ink;
      ctx.lineWidth = arc.width;
      ctx.stroke(new Path2D(arc.back));
      ctx.restore();
    }
  }

  paintPath(ctx, frame.bodyPath, theme.ink, frame.bodyAlpha);

  ctx.save();
  ctx.fillStyle = theme.paper;
  for (const eye of frame.eyes) {
    const matrix = parseMatrix(eye.matrix);
    if (!matrix) continue;
    ctx.save();
    ctx.globalAlpha = eye.alpha;
    ctx.setTransform(
      matrix.a * (size / dim),
      matrix.b * (size / dim),
      matrix.c * (size / dim),
      matrix.d * (size / dim),
      size / 2 + matrix.e * (size / dim),
      size / 2 + matrix.f * (size / dim)
    );
    ctx.fill(new Path2D(eye.d));
    ctx.restore();
  }
  ctx.restore();

  for (const arc of frame.arcs) {
    if (arc.front) {
      ctx.save();
      ctx.globalAlpha = arc.opacity;
      ctx.strokeStyle = arc.grad.stops[1] ?? arc.grad.stops[0] ?? theme.ink;
      ctx.lineWidth = arc.width;
      ctx.stroke(new Path2D(arc.front));
      ctx.restore();
    }
  }

  if (!frame.dotsBehind) {
    for (const d of frame.dots) {
      ctx.save();
      ctx.globalAlpha = d.opacity;
      ctx.fillStyle = d.color ?? theme.ink;
      if (d.d) {
        ctx.translate(d.x, d.y);
        if (d.rot) ctx.rotate((d.rot * Math.PI) / 180);
        if (d.dScale && d.dScale !== 1) ctx.scale(d.dScale, d.dScale);
        ctx.fill(new Path2D(d.d));
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (frame.notif) {
    ctx.save();
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(frame.notif.x, frame.notif.y, frame.notif.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function faceFrameToSvg(frame: BotFrame, size: number, theme: FacePaintTheme): string {
  const vb = DEMI_VIEWBOX;
  const eyes = frame.eyes
    .map(
      (e) =>
        `<path d="${e.d}" transform="${e.matrix}" fill="${theme.paper}" opacity="${e.alpha.toFixed(3)}"/>`
    )
    .join('');
  const dots = frame.dots
    .map((d) => {
      if (d.d) {
        const rot = d.rot ? ` rotate(${d.rot})` : '';
        const scale = d.dScale && d.dScale !== 1 ? ` scale(${d.dScale})` : '';
        return `<path d="${d.d}" transform="translate(${d.x} ${d.y})${rot}${scale}" fill="${d.color ?? theme.ink}" opacity="${d.opacity}"/>`;
      }
      return `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${d.color ?? theme.ink}" opacity="${d.opacity}"/>`;
    })
    .join('');
  const arcs = frame.arcs
    .map((a) => {
      const back = a.back
        ? `<path d="${a.back}" fill="none" stroke="${a.grad.stops[0] ?? theme.ink}" stroke-width="${a.width}" opacity="${(a.opacity * 0.45).toFixed(3)}"/>`
        : '';
      const front = a.front
        ? `<path d="${a.front}" fill="none" stroke="${a.grad.stops[1] ?? a.grad.stops[0] ?? theme.ink}" stroke-width="${a.width}" opacity="${a.opacity}"/>`
        : '';
      return back + front;
    })
    .join('');
  const notif = frame.notif
    ? `<circle cx="${frame.notif.x}" cy="${frame.notif.y}" r="${frame.notif.r}" fill="#3b82f6"/>`
    : '';
  const behind = frame.dotsBehind ? dots : '';
  const front = frame.dotsBehind ? '' : dots;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-vb} ${-vb} ${vb * 2} ${vb * 2}" role="img">${behind}${arcs}${frame.bodyPath ? `<path d="${frame.bodyPath}" fill="${theme.ink}" opacity="${frame.bodyAlpha}"/>` : ''}${eyes}${front}${notif}</svg>`;
}
