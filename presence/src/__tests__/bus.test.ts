import { describe, expect, it } from 'vitest';
import {
  fromAgentPet,
  fromClaudeFace,
  fromHitchEvent,
  fromSeam,
  toOrbState
} from '../bus/map';
import {
  IDLE_FLAGS,
  applyEvent,
  phaseFromFlags,
  reduceEvents,
  snapshotFromFlags,
  type ConversationEvent
} from '../bus/reduce';
import { PRESENCE_PHASES } from '../bus/types';
import { toFaceState } from '../face/map';

describe('conversation reducer', () => {
  it('runs a duplex turn with tool use through every live phase', () => {
    const events: ConversationEvent[] = [
      { kind: 'session.start' },
      { kind: 'human.start' },
      { kind: 'human.end' },
      { kind: 'agent.think' },
      { kind: 'tool.start', name: 'Bash' },
      { kind: 'tool.permission', name: 'Bash' },
      { kind: 'tool.end', name: 'Bash' },
      { kind: 'agent.speak' },
      { kind: 'agent.speak.end' },
      { kind: 'turn.end' }
    ];
    const phases = [];
    let flags = IDLE_FLAGS;
    for (const event of events) {
      flags = applyEvent(flags, event);
      phases.push(phaseFromFlags(flags));
    }
    expect(phases).toEqual([
      'idle',
      'listening',
      'idle',
      'thinking',
      'working',
      'waiting',
      'thinking',
      'speaking',
      'thinking',
      'done'
    ]);
  });

  it('lets human speech and agent speech overlap — speaking wins, both buses live', () => {
    const snap = reduceEvents([
      { kind: 'session.start' },
      { kind: 'human.start' },
      { kind: 'agent.speak' }
    ]);
    expect(snap.phase).toBe('speaking');
    expect(snap.duplex.input).toBeGreaterThan(0.5);
    expect(snap.duplex.output).toBeGreaterThan(0.5);
  });

  it('keeps waiting visible over thinking and speech flags', () => {
    let flags = IDLE_FLAGS;
    flags = applyEvent(flags, { kind: 'session.start' });
    flags = applyEvent(flags, { kind: 'agent.think' });
    flags = applyEvent(flags, { kind: 'tool.permission', name: 'Bash' });
    flags = applyEvent(flags, { kind: 'human.start' });
    expect(phaseFromFlags(flags)).toBe('waiting');
    expect(flags.tool).toEqual({ name: 'Bash', status: 'permission' });
  });

  it('surfaces errors above everything else', () => {
    const snap = reduceEvents([
      { kind: 'session.start' },
      { kind: 'agent.speak' },
      { kind: 'error', message: 'boom' }
    ]);
    expect(snap.phase).toBe('err');
    expect(snap.error).toBe('boom');
  });

  it('asleep only when nothing else is happening', () => {
    expect(reduceEvents([{ kind: 'asleep' }]).phase).toBe('asleep');
    expect(
      reduceEvents([{ kind: 'asleep' }, { kind: 'human.start' }]).phase
    ).toBe('listening');
  });
});

describe('foreign maps', () => {
  it('maps AgentPet, Seam, claude-terminal-face, and Hitch onto the bus', () => {
    expect(fromAgentPet('waiting')).toBe('waiting');
    expect(fromAgentPet('working')).toBe('working');
    expect(fromAgentPet('done')).toBe('done');
    expect(fromSeam('talking')).toBe('speaking');
    expect(fromSeam('processing')).toBe('thinking');
    expect(fromClaudeFace('err')).toBe('err');
    expect(fromClaudeFace('working')).toBe('working');
    expect(fromHitchEvent('tool.permission_requested')).toBe('waiting');
    expect(fromHitchEvent('tool.requested')).toBe('working');
    expect(fromHitchEvent('turn.assistant_started')).toBe('thinking');
    expect(fromHitchEvent('turn.user_prompt')).toBe('listening');
  });

  it('covers every presence phase with an orb verb and a face pose', () => {
    for (const phase of PRESENCE_PHASES) {
      expect(toOrbState(phase)).toBeTruthy();
      expect(toFaceState(phase)).toBeTruthy();
    }
    expect(toOrbState('waiting')).toBe('waiting');
    expect(toOrbState('done')).toBe('success');
    expect(toOrbState('err')).toBe('error');
    expect(toFaceState('waiting')).toBe('notify');
    expect(toFaceState('err')).toBe('exclaim');
    expect(toFaceState('working')).toBe('orbit');
  });
});

describe('snapshot shape', () => {
  it('carries tool name through working', () => {
    const snap = snapshotFromFlags(
      applyEvent(applyEvent(IDLE_FLAGS, { kind: 'session.start' }), {
        kind: 'tool.start',
        name: 'Read'
      })
    );
    expect(snap.tool).toEqual({ name: 'Read', status: 'running' });
    expect(snap.phase).toBe('working');
    expect(snap.session).toBe(true);
  });
});
