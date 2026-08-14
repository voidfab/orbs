import { hashD, makeProj, paint, radiusScale, type InkColor } from "./core.js";
import type { Dot, ModeDraw } from "./types.js";

export const drawOrbits: ModeDraw = (
	ctx,
	size,
	t,
	dark,
	o,
	ink: InkColor | undefined,
) => {
	const cx = size / 2;
	const cy = size / 2;
	const radius = (size / 2) * 0.82;
	const project = makeProj(t * 0.12, 0.3, cx, cy, 1);
	const radiusMultiplier = radiusScale(size, o.rsPow ?? 0.6);
	const dots: Dot[] = [];
	const orbitN = o.orbitN ?? 12;
	const ghostN = o.ghostN ?? 40;
	const particles = o.particles ?? 3;

	for (let orb = 0; orb < orbitN; orb++) {
		const h1 = hashD(orb, 1.7);
		const h2 = hashD(orb, 5.2);
		const h3 = hashD(orb, 8.9);
		const orbitRadius = radius * (0.45 + 0.52 * h1);
		const theta = h1 * 2 * Math.PI;
		const phi = Math.acos(2 * h2 - 1);
		const nx = Math.sin(phi) * Math.cos(theta);
		const ny = Math.cos(phi);
		const nz = Math.sin(phi) * Math.sin(theta);
		let ux = -ny;
		let uy = nx;
		const uz = 0;
		const length = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
		ux /= length;
		uy /= length;
		const vx = ny * uz - nz * uy;
		const vy = nz * ux - nx * uz;
		const vz = nx * uy - ny * ux;
		const orbitSpeed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

		for (let k = 0; k < ghostN; k++) {
			const angle = (k / ghostN) * 2 * Math.PI;
			const [x, y, z] = project(
				(ux * Math.cos(angle) + vx * Math.sin(angle)) * orbitRadius,
				(uy * Math.cos(angle) + vy * Math.sin(angle)) * orbitRadius,
				(uz * Math.cos(angle) + vz * Math.sin(angle)) * orbitRadius,
			);
			const depth = (z / orbitRadius + 1) / 2;
			dots.push({
				x,
				y,
				z,
				r: (o.ghostR ?? 0.9) * radiusMultiplier,
				white: 0.72,
				a: (o.ghostA ?? 0.5) * (0.4 + 0.6 * depth),
			});
		}

		for (let particle = 0; particle < particles; particle++) {
			const angle =
				t * orbitSpeed + (particle / particles) * 2 * Math.PI + h2 * 6;
			const [x, y, z] = project(
				(ux * Math.cos(angle) + vx * Math.sin(angle)) * orbitRadius,
				(uy * Math.cos(angle) + vy * Math.sin(angle)) * orbitRadius,
				(uz * Math.cos(angle) + vz * Math.sin(angle)) * orbitRadius,
			);
			const depth = (z / orbitRadius + 1) / 2;
			dots.push({
				x,
				y,
				z,
				r:
					((o.partR ?? 1.2) + (o.partRDepth ?? 1.6) * depth) * radiusMultiplier,
				white: 0.3 - 0.22 * depth,
			});
		}
	}
	paint(ctx, dots, dark, o.rMin, ink);
};
