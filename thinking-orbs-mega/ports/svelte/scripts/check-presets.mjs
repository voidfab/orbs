import assert from "node:assert/strict";
import { subscribeFrame } from "../dist/animation.js";
import { MODE_DRAWS } from "../dist/engine/registry.js";
import {
	clampOrbSize,
	MAX_ORB_SIZE,
	MIN_ORB_SIZE,
	resolvePreset,
	STATE_TO_MODE,
} from "../dist/presets.js";

assert.equal(clampOrbSize(1), MIN_ORB_SIZE);
assert.equal(clampOrbSize(999), MAX_ORB_SIZE);
assert.equal(clampOrbSize(Number.NaN), 64);
assert.equal(Object.keys(STATE_TO_MODE).length, 9);

for (const state of Object.keys(STATE_TO_MODE)) {
	for (const size of [12, 20, 48, 64, 128, 256]) {
		const preset = resolvePreset(state, size);
		assert.ok(Number.isFinite(preset.speed));
		assert.equal(typeof MODE_DRAWS[preset.mode], "function");
		assert.ok(
			Object.values(preset.opts).every(
				(value) => value === undefined || Number.isFinite(value),
			),
		);
	}
}

assert.equal(resolvePreset("working", 20).opts.orbitN, 3);
assert.equal(resolvePreset("working", 64).opts.orbitN, 12);
assert.ok((resolvePreset("working", 128).opts.orbitN ?? 0) > 12);
assert.equal(resolvePreset("breathing", 64).opts.ghostN, 0);

let queuedFrame;
let requestedFrames = 0;
globalThis.requestAnimationFrame = (callback) => {
	queuedFrame = callback;
	return ++requestedFrames;
};
globalThis.cancelAnimationFrame = () => {};
const times = [];
const unsubscribeFirst = subscribeFrame((time) => times.push(time));
const unsubscribeSecond = subscribeFrame((time) => times.push(time));
assert.equal(requestedFrames, 1);
queuedFrame(1000);
assert.deepEqual(times, [1, 1]);
unsubscribeFirst();
unsubscribeSecond();

console.log("Dynamic orb presets and shared clock verified");
