export interface Dot {
	x: number;
	y: number;
	z: number;
	r: number;
	/** Ink value: 0 = darkest ink on paper. Mirrored on dark themes. */
	white: number;
	a?: number;
}

export interface Line {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	white: number;
	a?: number;
	w: number;
}

export type InkColor = readonly [number, number, number];

export type Projector = (
	x: number,
	y: number,
	z: number,
) => [number, number, number];

export function lerp(a: number, b: number, amount: number): number {
	return a + (b - a) * amount;
}

export function frac(value: number): number {
	return value - Math.floor(value);
}

export function vnoise(x: number, y: number): number {
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

/** Deterministic hash in [0, 1). */
export function hashD(a: number, b: number): number {
	const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return h - Math.floor(h);
}

/** Stable directions on a unit sphere (Fibonacci lattice). */
export function fibDir(i: number, n: number): [number, number, number] {
	const golden = Math.PI * (3 - Math.sqrt(5));
	const y = 1 - (2 * (i + 0.5)) / n;
	const rad = Math.sqrt(1 - y * y);
	const a = i * golden;
	return [rad * Math.cos(a), y, rad * Math.sin(a)];
}

/** Shortest signed angular distance, wrapped to (-pi, pi]. */
export function angleDelta(a: number, b: number): number {
	return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Shared spin + tilt + orthographic projection. */
export function makeProj(
	yaw: number,
	tilt: number,
	cx: number,
	cy: number,
	scale: number,
): Projector {
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

/** Paint dots far-to-near with theme-aware grayscale or a custom ink color. */
export function paint(
	ctx: CanvasRenderingContext2D,
	dots: Dot[],
	dark: boolean,
	rMin = 0.3,
	ink?: InkColor,
): void {
	dots.sort((a, b) => a.z - b.z);
	for (const d of dots) {
		const alpha = d.a ?? 1;
		if (alpha < 0.02) continue;
		const w = Math.min(1, Math.max(0, d.white));
		// Custom ink is theme-independent: its hue stays stable while dot weight carries depth.
		const intensity = ink ? 1 - w : dark ? 1 - w : w;
		const [red, green, blue] = ink
			? ink.map((channel) => Math.round(channel * intensity))
			: [
					Math.round(intensity * 255),
					Math.round(intensity * 255),
					Math.round(intensity * 255),
				];
		ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
		ctx.beginPath();
		ctx.arc(d.x, d.y, Math.max(rMin, d.r), 0, Math.PI * 2);
		ctx.fill();
	}
}

export function paintLines(
	ctx: CanvasRenderingContext2D,
	lines: Line[],
	dark: boolean,
	ink?: InkColor,
): void {
	for (const line of lines) {
		const alpha = line.a ?? 1;
		if (alpha < 0.02) continue;
		const white = Math.min(1, Math.max(0, line.white));
		const intensity = ink ? 1 - white : dark ? 1 - white : white;
		const [red, green, blue] = ink
			? ink.map((channel) => Math.round(channel * intensity))
			: [
					Math.round(intensity * 255),
					Math.round(intensity * 255),
					Math.round(intensity * 255),
				];
		ctx.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
		ctx.lineWidth = line.w;
		ctx.beginPath();
		ctx.moveTo(line.x1, line.y1);
		ctx.lineTo(line.x2, line.y2);
		ctx.stroke();
	}
}

export function radiusScale(size: number, pow: number): number {
	return (size / 300) ** pow;
}
