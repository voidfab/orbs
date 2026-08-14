#!/usr/bin/env node
// Fast megafork gate: typecheck + unit/smoke tests.
//   npm run smoke

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = (name) => resolve(root, 'node_modules/.bin', name);

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (result.status) process.exit(result.status);
}

run(bin('tsc'), ['--noEmit']);
run(bin('vitest'), ['run']);
console.log('smoke ok');
