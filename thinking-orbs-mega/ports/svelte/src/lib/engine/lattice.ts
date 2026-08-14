import {
	angleDelta,
	hashD,
	makeProj,
	paint,
	radiusScale,
	type InkColor,
} from "./core.js";
import type { Dot, ModeDraw } from "./types.js";

interface Move {
	axis: 0 | 1 | 2;
	lo: number;
	hi: number;
	ang: number;
}

function solveCycle(
	time: number,
	count: number,
	slotDuration: number,
	rest: number,
) {
	const cycle = 2 * count * slotDuration + rest;
	const cycleTime = time % cycle;
	const amount = new Array<number>(count).fill(0);
	let active = -1;
	if (cycleTime < 2 * count * slotDuration) {
		const slot = Math.floor(cycleTime / slotDuration);
		const progress = (cycleTime - slot * slotDuration) / slotDuration;
		const clamped = Math.min(1, progress / 0.7);
		const eased = 1 - (1 - clamped) ** 3;
		if (slot < count) {
			for (let i = 0; i < slot; i++) amount[i] = 1;
			amount[slot] = eased;
			active = slot;
		} else {
			const reverse = 2 * count - 1 - slot;
			for (let i = 0; i < reverse; i++) amount[i] = 1;
			amount[reverse] = 1 - eased;
			active = reverse;
		}
	}
	return { amount, active };
}

function applyMoves(
	point: [number, number, number],
	moves: Move[],
	cycle: { amount: number[]; active: number },
): [number, number, number, boolean] {
	let [x, y, z] = point;
	let inActive = false;
	for (let i = 0; i < moves.length; i++) {
		if (cycle.amount[i] <= 0) continue;
		const move = moves[i];
		const coord = move.axis === 0 ? x : move.axis === 1 ? y : z;
		if (coord < move.lo || coord >= move.hi) continue;
		if (i === cycle.active) inActive = true;
		const angle = move.ang * cycle.amount[i];
		const cosine = Math.cos(angle);
		const sine = Math.sin(angle);
		if (move.axis === 0) {
			const nextY = y * cosine - z * sine;
			z = y * sine + z * cosine;
			y = nextY;
		} else if (move.axis === 1) {
			const nextX = x * cosine + z * sine;
			z = -x * sine + z * cosine;
			x = nextX;
		} else {
			const nextX = x * cosine - y * sine;
			y = x * sine + y * cosine;
			x = nextX;
		}
	}
	return [x, y, z, inActive];
}

function makeMoves(count: number): Move[] {
	const moves: Move[] = [];
	for (let i = 0; i < count; i++) {
		const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3)) as 0 | 1 | 2;
		const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
		const direction = hashD(i, 7.7) < 0.5 ? 1 : -1;
		moves.push({ axis, lo, hi: lo + 0.5, ang: (direction * Math.PI) / 2 });
	}
	return moves;
}

export const drawGlobe: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const spin = 0.5;
	const center = size / 2;
	const radius = (size / 2) * 0.82;
	const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
	const project = makeProj(t * spin, tilt, center, center, radius);
	const scan = t * (spin + (1.7 - spin) * (o.scanMul ?? 1));
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const dimBase = o.dimBase ?? 1;
	const dots: Dot[] = [];
	const latRings = o.latRings ?? 17;
	const lonDensity = o.lonDensity ?? 44;

	for (let latIndex = 0; latIndex <= latRings; latIndex++) {
		const latitude = -Math.PI / 2 + (latIndex / latRings) * Math.PI;
		const cosineLatitude = Math.cos(latitude);
		const sineLatitude = Math.sin(latitude);
		const lonCount = Math.max(
			1,
			Math.round(Math.abs(cosineLatitude) * lonDensity),
		);
		for (let lonIndex = 0; lonIndex < lonCount; lonIndex++) {
			const longitude = (lonIndex / lonCount) * 2 * Math.PI;
			const [x, y, z] = project(
				cosineLatitude * Math.cos(longitude),
				sineLatitude,
				cosineLatitude * Math.sin(longitude),
			);
			const depth = (z + 1) / 2;
			const distance = angleDelta(longitude + t * spin, scan);
			const boost = Math.exp(-(distance * distance) / 0.18) * Math.max(0, z);
			dots.push({
				x,
				y,
				z,
				r:
					((o.rBase ?? 0.6) +
						(o.rDepth ?? 1.7) * depth +
						(o.rBoost ?? 1) * boost) *
					radiusMultiplier,
				white: (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
				a: dimBase + (1 - dimBase) * Math.min(1, boost),
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};

export const drawRubik: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const center = size / 2;
	const radius = (size / 2) * 0.82;
	const project = makeProj(
		t * 0.55,
		0.35 + 0.1 * Math.sin(t * 0.9),
		center,
		center,
		radius,
	);
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const moveCount = o.moveCount ?? 14;
	const moves = makeMoves(moveCount);
	const cycle = solveCycle(t, moveCount, 0.42, 1.2);
	const dots: Dot[] = [];
	const latRings = o.latRings ?? 15;
	const lonDensity = o.lonDensity ?? 40;

	for (let latIndex = 0; latIndex <= latRings; latIndex++) {
		const latitude = -Math.PI / 2 + (latIndex / latRings) * Math.PI;
		const cosineLatitude = Math.cos(latitude);
		const sineLatitude = Math.sin(latitude);
		const lonCount = Math.max(
			1,
			Math.round(Math.abs(cosineLatitude) * lonDensity),
		);
		for (let lonIndex = 0; lonIndex < lonCount; lonIndex++) {
			const longitude = (lonIndex / lonCount) * 2 * Math.PI;
			const [x, y, z, inActive] = applyMoves(
				[
					cosineLatitude * Math.cos(longitude),
					sineLatitude,
					cosineLatitude * Math.sin(longitude),
				],
				moves,
				cycle,
			);
			const [projectedX, projectedY, projectedZ] = project(x, y, z);
			const depth = (projectedZ + 1) / 2;
			dots.push({
				x: projectedX,
				y: projectedY,
				z: projectedZ,
				r:
					((o.rBase ?? 0.6) +
						(o.rDepth ?? 1.7) * depth +
						(inActive ? (o.rActive ?? 0.3) : 0)) *
					radiusMultiplier,
				white:
					(o.inkFar ?? 0.62) -
					(o.inkSpan ?? 0.54) * depth -
					(inActive ? 0.14 : 0),
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};

export const drawWave: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const center = size / 2;
	const radius = (size / 2) * 0.874;
	const project = makeProj(t * 0.18, 0.38, center, center, 1);
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const dots: Dot[] = [];
	const rings = o.rings ?? 15;
	const lonDensity = o.lonDensity ?? 40;

	for (let ring = 0; ring <= rings; ring++) {
		const latitude = -Math.PI / 2 + (ring / rings) * Math.PI;
		const cosineLatitude = Math.cos(latitude);
		const sineLatitude = Math.sin(latitude);
		const wave =
			0.62 * Math.sin(t * 2.1 - ring * 0.52) +
			0.38 * Math.sin(t * 1.27 + ring * 0.83);
		const ringRadius = radius * (0.88 + 0.105 * wave);
		const lonCount = Math.max(
			1,
			Math.round(Math.abs(cosineLatitude) * lonDensity),
		);
		for (let lonIndex = 0; lonIndex < lonCount; lonIndex++) {
			const longitude = (lonIndex / lonCount) * 2 * Math.PI;
			const [x, y, z] = project(
				cosineLatitude * Math.cos(longitude) * ringRadius,
				sineLatitude * ringRadius,
				cosineLatitude * Math.sin(longitude) * ringRadius,
			);
			const depth = (z / radius + 1) / 2;
			const crest = Math.max(0, wave);
			dots.push({
				x,
				y,
				z,
				r:
					((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth) *
					(1 + 0.4 * crest) *
					radiusMultiplier,
				white: 0.66 - 0.56 * depth - 0.1 * crest,
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};
