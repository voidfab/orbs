#!/usr/bin/env node
// Start the megafork review server (and optionally host-port demos).
//
//   node scripts/review-web.mjs           # mega only — 5177
//   node scripts/review-web.mjs --ports   # also svelte/solid/universal/svg/vanilla

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const withPorts = process.argv.includes('--ports');

const jobs = [
  {
    name: 'mega',
    cwd: root,
    cmd: 'npx',
    args: ['vite', '--config', 'vite.config.demo.ts', '--host', '127.0.0.1', '--port', '5177', '--strictPort'],
    url: 'http://127.0.0.1:5177/play.html',
    install: null
  }
];

if (withPorts) {
  jobs.push(
    {
      name: 'solid',
      cwd: resolve(root, 'ports/solid'),
      cmd: 'npx',
      args: ['vite', '--config', 'vite.config.demo.ts', '--host', '127.0.0.1', '--port', '5178', '--strictPort'],
      url: 'http://127.0.0.1:5178/',
      install: 'npm'
    },
    {
      name: 'svelte',
      cwd: resolve(root, 'ports/svelte'),
      cmd: 'pnpm',
      args: ['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', '5179', '--strictPort'],
      url: 'http://127.0.0.1:5179/',
      install: 'pnpm'
    },
    {
      name: 'universal',
      cwd: resolve(root, 'ports/universal'),
      cmd: 'npx',
      args: ['vite', '--host', '127.0.0.1', '--port', '5180', '--strictPort'],
      url: 'http://127.0.0.1:5180/',
      install: 'npm'
    },
    {
      name: 'svg-morphing',
      cwd: resolve(root, 'ports/svg-morphing'),
      cmd: 'npx',
      args: ['vite', '--host', '127.0.0.1', '--port', '5181', '--strictPort'],
      url: 'http://127.0.0.1:5181/',
      install: 'npm'
    },
    {
      name: 'vanilla',
      cwd: resolve(root, 'ports/vanilla'),
      cmd: 'npx',
      args: ['vite', 'demo', '--host', '127.0.0.1', '--port', '5182', '--strictPort'],
      url: 'http://127.0.0.1:5182/',
      install: 'npm'
    },
    {
      name: 'rn-views',
      cwd: resolve(root, 'ports/react-native-views'),
      cmd: 'npx',
      args: ['vite', '--config', 'vite.config.demo.ts', '--host', '127.0.0.1', '--port', '5183', '--strictPort'],
      url: 'http://127.0.0.1:5183/',
      install: 'npm'
    }
  );
}

function run(cmd, args, cwd, inherit = true) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: inherit ? 'inherit' : 'pipe',
      env: { ...process.env, BROWSER: 'none' }
    });
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
    child.on('error', reject);
  });
}

async function ensureInstall(job) {
  if (!job.install) return;
  if (existsSync(resolve(job.cwd, 'node_modules'))) return;
  if (job.install === 'pnpm') {
    console.log(`[${job.name}] pnpm install`);
    await run('pnpm', ['install'], job.cwd);
    return;
  }
  console.log(`[${job.name}] npm install`);
  await run('npm', ['install'], job.cwd);
}

const children = [];

async function start(job) {
  await ensureInstall(job);
  console.log(`[${job.name}] ${job.url}`);
  const child = spawn(job.cmd, job.args, {
    cwd: job.cwd,
    stdio: 'inherit',
    env: { ...process.env, BROWSER: 'none' }
  });
  children.push(child);
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', shutdown);

console.log('Playable review:');
console.log('  mega hub          http://127.0.0.1:5177/play.html');
console.log('  official demo     http://127.0.0.1:5177/');
console.log('  review gallery    http://127.0.0.1:5177/review.html');
console.log('  codex voice orb   http://127.0.0.1:5177/aesthetics/codex-voice-orb/index.html');
console.log('  aurartc styles    http://127.0.0.1:5177/aesthetics/aurartc-orb.html');
console.log('  hermes live glow  http://127.0.0.1:5177/aesthetics/hermes-live.html');
if (withPorts) {
  console.log('  solid             http://127.0.0.1:5178/');
  console.log('  svelte            http://127.0.0.1:5179/');
  console.log('  universal         http://127.0.0.1:5180/');
  console.log('  svg-morphing      http://127.0.0.1:5181/');
  console.log('  vanilla           http://127.0.0.1:5182/');
  console.log('  rn-views          http://127.0.0.1:5183/');
} else {
  console.log('(pass --ports to also install and start the host-framework demos)');
}

for (const job of jobs) {
  await start(job);
}
