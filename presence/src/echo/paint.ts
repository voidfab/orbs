import { paintTerminalFace } from '../terminal/palette';
import { textmodeGrid } from '../textmode/engines';
import { paintTextmode } from '../textmode/grid';
import type { EchoFrame } from './trail';

export type EchoSkin = 'cast' | 'terminal';

export function echoAlpha(amount: number): number {
  if (amount <= 0) return 0;
  return 0.18 + 0.55 * amount;
}

export function paintEcho(
  ctx: CanvasRenderingContext2D,
  frame: EchoFrame,
  size: number,
  dark: boolean,
  skin: EchoSkin,
  t: number
): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = dark ? '#0e1116' : '#eef1f4';
  ctx.fillRect(0, 0, size, size);
  const echoA = echoAlpha(frame.amount);
  if (skin === 'terminal') {
    if (echoA > 0) {
      ctx.globalAlpha = echoA;
      paintTerminalFace(ctx, frame.echo.phase, size, dark, { clear: false });
    }
    ctx.globalAlpha = 1;
    paintTerminalFace(ctx, frame.live.phase, size, dark, { clear: false });
    return;
  }
  if (echoA > 0) {
    ctx.globalAlpha = echoA;
    paintTextmode(ctx, textmodeGrid(frame.echo, t, 20, 16, 'auto'), size, dark, {
      clear: false,
      skipEmpty: true
    });
  }
  ctx.globalAlpha = 1;
  paintTextmode(ctx, textmodeGrid(frame.live, t, 20, 16, 'auto'), size, dark, {
    clear: false,
    skipEmpty: true
  });
}
