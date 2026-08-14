import type { ModeOpts } from "./profiles.js";

export type { Dot, InkColor, Line } from "./core.js";

import type { InkColor } from "./core.js";

export type ModeDraw = (
	ctx: CanvasRenderingContext2D,
	size: number,
	t: number,
	dark: boolean,
	opts: ModeOpts,
	ink?: InkColor,
) => void;
