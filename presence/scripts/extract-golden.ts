// Emits spec/face-golden.json — geometry for every catalog pose at fixed times.
// Run: npx tsx scripts/extract-golden.ts

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BotEngine } from '../src/face/bloub/engine';
import { RAYON } from '../src/face/bloub/repere';
import { POSES, SEQUENCE, type StateId } from '../src/face/bloub/states';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string };

const TIMES = [0.6, 1.7];
const P = 4;
const r = (n: number) => Number(n.toFixed(P));

function flatten(state: StateId, t: number) {
  const engine = new BotEngine(RAYON, state);
  const frame = engine.sample(t);
  return {
    key: `${state}-${t}`,
    state,
    t,
    bodyPath: frame.bodyPath,
    bodyAlpha: r(frame.bodyAlpha),
    eyeCount: frame.eyes.length,
    eyes: frame.eyes.map((e) => ({ d: e.d, matrix: e.matrix, alpha: r(e.alpha) })),
    dots: frame.dots.flatMap((d) => [r(d.x), r(d.y), r(d.r), r(d.opacity)]),
    arcs: frame.arcs.map((a) => ({
      id: a.id,
      front: a.front,
      back: a.back,
      width: r(a.width),
      opacity: r(a.opacity)
    })),
    notif: frame.notif ? [r(frame.notif.x), r(frame.notif.y), r(frame.notif.r)] : null
  };
}

const cases = [];
for (const state of SEQUENCE) {
  const poseT = POSES[state];
  cases.push(flatten(state, poseT));
  for (const t of TIMES) cases.push(flatten(state, t));
}

const golden = {
  specVersion: '1.0.0',
  sourceLibrary: { name: 'presence', version: pkg.version, face: 'bloub' },
  note: 'BotEngine.sample at RAYON=100. Dots stride 4: x, y, r, opacity. Paths are already r2-rounded by the engine.',
  tolerance: 1e-3,
  times: TIMES,
  cases
};

mkdirSync(resolve(root, 'spec'), { recursive: true });
writeFileSync(resolve(root, 'spec/face-golden.json'), JSON.stringify(golden));
console.log(`wrote spec/face-golden.json (${cases.length} cases)`);
