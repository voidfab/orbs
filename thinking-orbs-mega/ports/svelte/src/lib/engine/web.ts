import {
	fibDir,
	frac,
	hashD,
	type InkColor,
	lerp,
	makeProj,
	paint,
	paintLines,
	radiusScale,
	vnoise,
} from "./core.js";
import type { Dot, Line, ModeDraw } from "./types.js";

export const drawWeb: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const center = size / 2;
	const radius = (size / 2) * 0.8 * (o.spread ?? 1);
	const project = makeProj(t * 0.12, 0.32, center, center, radius);
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const nodeN = o.nodeN ?? 30;
	const threshold = o.thr ?? 0.72;
	const nodeRadius = o.nodeR ?? 1.4;
	const nodeRadiusDepth = o.nodeRDepth ?? 1.8;
	const nodes: Array<[number, number, number]> = [];

	for (let i = 0; i < nodeN; i++) {
		const direction = fibDir(i, nodeN);
		const x = direction[0] + 0.3 * (vnoise(i * 0.31 + 9, t * 0.24) - 0.5) * 2;
		const y = direction[1] + 0.3 * (vnoise(i * 0.53 + 27, t * 0.21) - 0.5) * 2;
		const z = direction[2] + 0.3 * (vnoise(i * 0.77 + 55, t * 0.27) - 0.5) * 2;
		const length = Math.sqrt(x * x + y * y + z * z);
		nodes.push([x / length, y / length, z / length]);
	}

	const lines: Line[] = [];
	const dots: Dot[] = [];
	for (let i = 0; i < nodeN; i++) {
		for (let j = i + 1; j < nodeN; j++) {
			const dx = nodes[i][0] - nodes[j][0];
			const dy = nodes[i][1] - nodes[j][1];
			const dz = nodes[i][2] - nodes[j][2];
			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
			if (distance >= threshold) continue;
			const [x1, y1, z1] = project(...nodes[i]);
			const [x2, y2, z2] = project(...nodes[j]);
			const depth = ((z1 + z2) / 2 + 1) / 2;
			lines.push({
				x1,
				y1,
				x2,
				y2,
				white: 0.42,
				a: (1 - distance / threshold) * (0.3 + 0.55 * depth),
				w: Math.max(0.6, (o.lineW ?? 0.8) * radiusMultiplier),
			});
		}
	}

	for (let i = 0; i < nodeN; i++) {
		const [x, y, z] = project(...nodes[i]);
		const depth = (z + 1) / 2;
		const pulse = 1 + 0.25 * Math.sin(t * 1.4 + i * 2.7);
		dots.push({
			x,
			y,
			z,
			r: (nodeRadius + nodeRadiusDepth * depth) * pulse * radiusMultiplier,
			white: 0.55 - 0.45 * depth,
		});
	}

	const signals = o.signals ?? 5;
	for (let signal = 0; signal < signals; signal++) {
		const segment = Math.floor(t * 0.55 + signal * 7.31);
		const a = Math.floor(hashD(segment, signal * 3.1 + 1.7) * nodeN);
		const b = Math.floor(hashD(segment, signal * 5.7 + 4.2) * nodeN);
		if (a === b) continue;
		const amount = frac(t * 0.55 + signal * 7.31);
		const x = lerp(nodes[a][0], nodes[b][0], amount);
		const y = lerp(nodes[a][1], nodes[b][1], amount);
		const z = lerp(nodes[a][2], nodes[b][2], amount);
		const length = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
		const [projectedX, projectedY, projectedZ] = project(
			x / length,
			y / length,
			z / length,
		);
		const depth = (projectedZ + 1) / 2;
		dots.push({
			x: projectedX,
			y: projectedY,
			z: projectedZ,
			r: (nodeRadius * 1.5 + nodeRadiusDepth * depth) * radiusMultiplier,
			white: 0.05,
			a: 0.5 + 0.5 * depth,
		});
	}

	paintLines(ctx, lines, dark, ink);
	paint(ctx, dots, dark, o.rMin, ink);
};
