import { fibDir, type InkColor, makeProj, paint, radiusScale } from "./core.js";
import type { Dot, ModeDraw } from "./types.js";

export const drawRibbon: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const center = size / 2;
	const radius = (size / 2) * 0.78;
	const spin = o.spin ?? 1;
	const cameraTilt = 0.3;
	const project = makeProj(t * 0.1 * spin, cameraTilt, center, center, 1);
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

	const yaw = t * 0.24 * spin;
	const tilt = o.faceOn ? -cameraTilt : 0.55 + 0.3 * Math.sin(t * 0.18) * spin;
	const ux = Math.cos(yaw);
	const uy = 0;
	const uz = Math.sin(yaw);
	const vx = -uz * Math.sin(tilt);
	const vy = Math.cos(tilt);
	const vz = ux * Math.sin(tilt);
	const nx = uy * vz - uz * vy;
	const ny = uz * vx - ux * vz;
	const nz = ux * vy - uy * vx;
	const wobbleAmplitude = 0.23 * (o.wobMul ?? 1);
	const baseRadius = o.faceOn ? radius / (1 + 0.85 * wobbleAmplitude) : radius;
	const baseLanes = o.lanes ?? 5;
	const segments = o.segs ?? 88;
	const lanes = Math.max(1, Math.round(baseLanes * (o.bandMul ?? 1)));

	for (let lane = 0; lane < lanes; lane++) {
		const laneOffset = (lane - (lanes - 1) / 2) * 0.075;
		const edge =
			Math.abs(lane - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
		for (let segment = 0; segment < segments; segment++) {
			const angle = (segment / segments) * 2 * Math.PI;
			const wobble =
				(0.16 * Math.sin(angle * 3 - t * 1.7 + lane * 0.22) +
					0.07 * Math.sin(angle * 5 + t * 1.1)) *
				(o.wobMul ?? 1);
			const radial = o.faceOn ? 1 + wobble : 1;
			const offset = o.faceOn ? laneOffset : laneOffset + wobble;
			const x = ux * Math.cos(angle) + vx * Math.sin(angle) + nx * offset;
			const y = uy * Math.cos(angle) + vy * Math.sin(angle) + ny * offset;
			const z = uz * Math.cos(angle) + vz * Math.sin(angle) + nz * offset;
			const length = Math.sqrt(x * x + y * y + z * z);
			const renderedRadius = baseRadius * radial;
			const [projectedX, projectedY, projectedZ] = project(
				(x / length) * renderedRadius,
				(y / length) * renderedRadius,
				(z / length) * renderedRadius,
			);
			const depth = (projectedZ / radius + 1) / 2;
			dots.push({
				x: projectedX,
				y: projectedY,
				z: projectedZ,
				r:
					((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) *
					(1 - 0.25 * edge) *
					radiusMultiplier,
				white: 0.52 - 0.44 * depth + 0.18 * edge,
				a: 0.4 + 0.6 * depth,
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};
