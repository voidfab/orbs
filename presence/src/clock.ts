export type Tick = (dt: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;
let clock = 0;

export function sharedClock(): number {
  return clock;
}

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  clock += dt;
  for (const fn of Array.from(subs)) fn(dt);
  if (subs.size > 0) raf = requestAnimationFrame(frame);
  else raf = 0;
}

export function subscribe(fn: Tick): () => void {
  subs.add(fn);
  if (raf === 0 && typeof requestAnimationFrame !== 'undefined') {
    last = typeof performance !== 'undefined' ? performance.now() : 0;
    raf = requestAnimationFrame(frame);
  }
  return () => {
    subs.delete(fn);
    if (subs.size === 0 && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
