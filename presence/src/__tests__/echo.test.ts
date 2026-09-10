import { describe, expect, it } from 'vitest';
import { IDLE_SNAPSHOT, type PresenceSnapshot } from '../bus/types';
import { echoAlpha } from '../echo/paint';
import { EchoTrail, echoTau } from '../echo/trail';

function snap(phase: PresenceSnapshot['phase']): PresenceSnapshot {
  return { ...IDLE_SNAPSHOT, phase, duplex: { input: 0, output: 0 }, session: true };
}

describe('echo trail', () => {
  it('keeps the previous phase as an echo when the live phase changes', () => {
    const trail = new EchoTrail();
    trail.adopt(snap('listening'));
    const frame = trail.adopt(snap('thinking'));
    expect(frame.live.phase).toBe('thinking');
    expect(frame.echo.phase).toBe('listening');
    expect(frame.amount).toBe(1);
    expect(echoAlpha(frame.amount)).toBeGreaterThan(0.5);
  });

  it('decays the echo and hangs longer for asleep than for working', () => {
    const fast = new EchoTrail();
    fast.adopt(snap('working'));
    fast.adopt(snap('idle'));
    fast.step(0.5);
    const slow = new EchoTrail();
    slow.adopt(snap('asleep'));
    slow.adopt(snap('idle'));
    slow.step(0.5);
    expect(fast.amount).toBeGreaterThan(0);
    expect(slow.amount).toBeGreaterThan(fast.amount);
    expect(echoTau('asleep')).toBeGreaterThan(echoTau('working'));
  });

  it('does not refresh the echo when duplex moves inside the same phase', () => {
    const trail = new EchoTrail();
    trail.adopt(snap('speaking'));
    trail.adopt(snap('thinking'));
    trail.step(0.2);
    const amount = trail.amount;
    trail.adopt({ ...snap('thinking'), duplex: { input: 0.1, output: 0.8 } });
    expect(trail.echo.phase).toBe('speaking');
    expect(trail.amount).toBe(amount);
    expect(trail.live.duplex.output).toBe(0.8);
  });

  it('clears the echo after enough hangover', () => {
    const trail = new EchoTrail();
    trail.adopt(snap('listening'));
    trail.adopt(snap('idle'));
    trail.step(4);
    expect(trail.amount).toBe(0);
  });
});
