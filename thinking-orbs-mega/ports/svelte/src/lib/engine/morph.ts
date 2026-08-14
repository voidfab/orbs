import { paint, type InkColor } from "./core.js";
import type { Dot, ModeDraw } from "./types.js";

type Path = (fraction: number) => [number, number];

function smoothEase(value: number): number {
	return value * value * (3 - 2 * value);
}

function polygonPath(vertices: ReadonlyArray<readonly [number, number]>): Path {
	const count = vertices.length;
	const lengths: number[] = [];
	let total = 0;
	for (let i = 0; i < count; i++) {
		const start = vertices[i];
		const end = vertices[(i + 1) % count];
		const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
		lengths.push(length);
		total += length;
	}
	return (fraction) => {
		let target = fraction * total;
		let index = 0;
		while (target > lengths[index] && index < count - 1) {
			target -= lengths[index];
			index++;
		}
		const start = vertices[index];
		const end = vertices[(index + 1) % count];
		const progress = lengths[index] ? Math.min(1, target / lengths[index]) : 0;
		return [
			start[0] + (end[0] - start[0]) * progress,
			start[1] + (end[1] - start[1]) * progress,
		];
	};
}

const CIRCLE: Path = (fraction) => {
	const angle = -Math.PI / 2 + fraction * 2 * Math.PI;
	return [Math.cos(angle) * 0.24, Math.sin(angle) * 0.24];
};
const TRIANGLE = polygonPath([
	[0, -0.26],
	[0.24, 0.16],
	[-0.24, 0.16],
]);
const SQUARE = polygonPath([
	[0, -0.2],
	[0.2, -0.2],
	[0.2, 0.2],
	[-0.2, 0.2],
	[-0.2, -0.2],
]);
const CYCLE: Path[] = [CIRCLE, TRIANGLE, SQUARE];
const HOLD = 1.4;
const MORPH = 0.9;
const SEGMENT = HOLD + MORPH;

function morphCount(density: number): number {
	return Math.max(6, Math.round(34 * density));
}

export const drawMorph: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const cycleTime = t % (SEGMENT * CYCLE.length);
	const shapeIndex = Math.floor(cycleTime / SEGMENT);
	const localTime = cycleTime - shapeIndex * SEGMENT;
	const morph = localTime > HOLD ? smoothEase((localTime - HOLD) / MORPH) : 0;
	const spread = o.spread ?? 1;
	const startPath = CYCLE[shapeIndex];
	const endPath = CYCLE[(shapeIndex + 1) % CYCLE.length];
	const sampleCount = 160;
	const points: Array<[number, number]> = [];

	for (let i = 0; i < sampleCount; i++) {
		const fraction = i / sampleCount;
		const start = startPath(fraction);
		const end = endPath(fraction);
		points.push([
			(start[0] + (end[0] - start[0]) * morph) * spread,
			(start[1] + (end[1] - start[1]) * morph) * spread,
		]);
	}

	const lengths: number[] = [];
	let total = 0;
	for (let i = 0; i < sampleCount; i++) {
		const start = points[i];
		const end = points[(i + 1) % sampleCount];
		const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
		lengths.push(length);
		total += length;
	}

	const dotCount = morphCount(o.iconD ?? 1);
	const dotRadius = (o.rDot ?? 0.021) * 1.35 * spread;
	const pulse = 1 + 0.02 * Math.sin(localTime * 3.1);
	const dots: Dot[] = [];
	const center = size / 2;
	let segment = 0;
	let accumulated = 0;

	for (let dot = 0; dot < dotCount; dot++) {
		const target = (dot / dotCount) * total;
		while (
			accumulated + lengths[segment] < target &&
			segment < sampleCount - 1
		) {
			accumulated += lengths[segment];
			segment++;
		}
		const start = points[segment];
		const end = points[(segment + 1) % sampleCount];
		const fraction = lengths[segment]
			? Math.min(1, (target - accumulated) / lengths[segment])
			: 0;
		const x = (start[0] + (end[0] - start[0]) * fraction) * pulse;
		const y = (start[1] + (end[1] - start[1]) * fraction) * pulse;
		dots.push({
			x: center + x * size,
			y: center + y * size,
			z: 0,
			r: Math.max(0.35, dotRadius * size),
			white: 0.1,
		});
	}
	paint(ctx, dots, dark, o.rMin, ink);
};
