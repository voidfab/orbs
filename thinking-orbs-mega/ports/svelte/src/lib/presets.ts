import {
	BASE_PROFILES,
	type ModeOpts,
	scaleCounts,
	scaleRadii,
} from "./engine/profiles.js";
import type { OrbSize, OrbState } from "./types.js";

export const MIN_ORB_SIZE = 12;
export const MAX_ORB_SIZE = 256;

export type ModeKey =
	| "orbits"
	| "globe"
	| "rubik"
	| "wave"
	| "web"
	| "braid"
	| "ribbon"
	| "ring"
	| "morph";

export const STATE_TO_MODE: Record<OrbState, ModeKey> = {
	working: "orbits",
	searching: "globe",
	solving: "rubik",
	listening: "wave",
	connecting: "web",
	weaving: "braid",
	composing: "ribbon",
	breathing: "ring",
	shaping: "morph",
};

interface Preset {
	speed: number;
	count: number;
	size: number;
	extra?: ModeOpts;
}

const PRESETS: Record<ModeKey, Record<20 | 64, Preset>> = {
	orbits: {
		64: { speed: 1.885, count: 1, size: 1 },
		20: { speed: 3.9, count: 0.238, size: 2.4 },
	},
	globe: {
		64: {
			speed: 2.015,
			count: 0.42,
			size: 1.15,
			extra: { scanMul: 4.08, dimBase: 0.45 },
		},
		20: {
			speed: 2.665,
			count: 0.105,
			size: 1.75,
			extra: { scanMul: 4.335, dimBase: 0.45 },
		},
	},
	rubik: {
		64: { speed: 1.82, count: 0.35, size: 1.05 },
		20: { speed: 1.95, count: 0.088, size: 1.9 },
	},
	wave: {
		64: { speed: 4.388, count: 0.341, size: 1 },
		20: { speed: 3.998, count: 0.105, size: 1.6 },
	},
	web: {
		64: { speed: 3.315, count: 1.35, size: 0.95 },
		20: { speed: 6.63, count: 0.25, size: 1.52 },
	},
	braid: {
		64: { speed: 1.625, count: 0.5, size: 1 },
		20: { speed: 2.75, count: 0.1125, size: 1.36 },
	},
	ribbon: {
		64: {
			speed: 2.34,
			count: 0.25,
			size: 0.85,
			extra: { spin: 0, bandMul: 3.9, wobMul: 1 },
		},
		20: {
			speed: 3.12,
			count: 0.051,
			size: 1.073,
			extra: { spin: 0, bandMul: 4.94, wobMul: 1 },
		},
	},
	ring: {
		64: {
			speed: 3.24,
			count: 0.25,
			size: 0.956,
			extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 },
		},
		20: {
			speed: 3.78,
			count: 0.028,
			size: 1.622,
			extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 },
		},
	},
	morph: {
		64: { speed: 2.405, count: 0.54, size: 0.395, extra: { spread: 1.45 } },
		20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } },
	},
};

export interface Resolved {
	mode: ModeKey;
	speed: number;
	opts: ModeOpts;
}

const cache = new Map<string, Resolved>();

export function clampOrbSize(size: OrbSize): number {
	return Number.isFinite(size)
		? Math.min(MAX_ORB_SIZE, Math.max(MIN_ORB_SIZE, size))
		: 64;
}

function interpolate(a: number, b: number, amount: number): number {
	return a + (b - a) * amount;
}

function resolveTuning(mode: ModeKey, size: number): Preset {
	const small = PRESETS[mode][20];
	const large = PRESETS[mode][64];
	if (size <= 20) {
		return { ...small, count: small.count * Math.sqrt(size / 20) };
	}
	if (size >= 64) {
		return { ...large, count: large.count * Math.sqrt(size / 64) };
	}

	const amount = (size - 20) / 44;
	const extra: ModeOpts = {};
	for (const key of new Set([
		...Object.keys(small.extra ?? {}),
		...Object.keys(large.extra ?? {}),
	])) {
		const from = small.extra?.[key] ?? large.extra?.[key];
		const to = large.extra?.[key] ?? from;
		if (from != null && to != null) extra[key] = interpolate(from, to, amount);
	}
	return {
		speed: interpolate(small.speed, large.speed, amount),
		count: interpolate(small.count, large.count, amount),
		size: interpolate(small.size, large.size, amount),
		extra,
	};
}

export function resolvePreset(state: OrbState, size: OrbSize): Resolved {
	const resolvedSize = clampOrbSize(size);
	const key = `${state}-${resolvedSize}`;
	const hit = cache.get(key);
	if (hit) return hit;

	const mode = STATE_TO_MODE[state];
	const preset = resolveTuning(mode, resolvedSize);
	let opts: ModeOpts = { ...BASE_PROFILES[mode] };
	if (preset.count !== 1) opts = scaleCounts(opts, preset.count);
	if (preset.size !== 1) opts = scaleRadii(opts, preset.size);
	if (preset.extra) opts = { ...opts, ...preset.extra };

	const resolved: Resolved = { mode, speed: preset.speed, opts };
	cache.set(key, resolved);
	return resolved;
}
