import {
	fibDir,
	frac,
	type InkColor,
	makeProj,
	paint,
	radiusScale,
} from "./core.js";
import type { Dot, ModeDraw } from "./types.js";

export const drawBraid: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const center = size / 2;
	const radius = (size / 2) * 0.76;
	const project = makeProj(t * 0.4, 0.3, center, center, 1);
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const dots: Dot[] = [];
	const ghostN = o.ghostN ?? 150;

	for (let i = 0; i < ghostN; i++) {
		const direction = fibDir(i, ghostN);
		const [x, y, z] = project(
			direction[0] * radius,
			direction[1] * radius,
			direction[2] * radius,
		);
		const depth = (z / radius + 1) / 2;
		dots.push({
			x,
			y,
			z,
			r: 0.8 * radiusMultiplier,
			white: 0.78,
			a: 0.1 + 0.22 * depth,
		});
	}

	const strandN = o.strandN ?? 52;
	const turns = o.turns ?? 3;
	for (let strand = 0; strand < 3; strand++) {
		const phase = (strand / 3) * 2 * Math.PI;
		for (let i = 0; i < strandN; i++) {
			const u = (frac(i / strandN + t * 0.045) * 2 - 1) * 0.96;
			const surface = Math.sqrt(Math.max(0, 1 - u * u));
			const endFade = Math.min(1, (1 - Math.abs(u)) / 0.1);
			const angle = u * Math.PI * turns + phase;
			const weave =
				1 + 0.075 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * 0.8);
			const strandRadius = surface * radius * weave;
			const [x, y, z] = project(
				Math.cos(angle) * strandRadius,
				u * radius * weave,
				Math.sin(angle) * strandRadius,
			);
			const depth = (z / radius + 1) / 2;
			dots.push({
				x,
				y,
				z,
				r: ((o.rBase ?? 1.2) + (o.rDepth ?? 1.8) * depth) * radiusMultiplier,
				white: 0.55 - 0.45 * depth,
				a: endFade * (0.45 + 0.55 * depth),
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};
