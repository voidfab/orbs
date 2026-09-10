import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import { toOrbState } from '../bus/map';
import { toCssOrbState } from '../css-orb/map';
import { toFaceState } from '../face/map';
import { SEQUENCE } from '../face/bloub/states';
import { glyphFor } from '../glyph/icons';
import { toAuroraMood } from '../glow/map';
import { identityExpressionId } from '../identity/map';
import { brailleKind } from '../braille/meters';
import { DEMO_TURN } from '../conversation/script';
import { EchoTrail } from '../echo/trail';
import { PresenceHost } from '../host/PresenceHost';

describe('public surface', () => {
  it('exports a closed presence phase list', () => {
    expect([...PRESENCE_PHASES]).toEqual([
      'idle',
      'listening',
      'thinking',
      'working',
      'waiting',
      'speaking',
      'done',
      'err',
      'asleep'
    ]);
  });

  it('keeps orb, face, identity, and css-orb maps total', () => {
    expect(toOrbState('waiting')).toBe('waiting');
    expect(toFaceState('speaking')).toBe('play');
    expect(identityExpressionId('err')).toBe('mad');
    expect(toCssOrbState('working')).toBe('thinking');
    expect(toAuroraMood('err')).toBe('error');
    expect(brailleKind('thinking')).toBe('sines');
    expect(String(glyphFor('waiting')).length).toBeGreaterThan(8);
    expect(SEQUENCE).toHaveLength(14);
  });

  it('ships a scripted duplex turn', () => {
    expect(DEMO_TURN[0]?.event.kind).toBe('session.start');
    expect(DEMO_TURN.some((s) => s.event.kind === 'tool.permission')).toBe(true);
    expect(DEMO_TURN.some((s) => s.event.kind === 'agent.speak')).toBe(true);
  });

  it('exposes a live PresenceHost a real STT/TTS host can drive', () => {
    const host = new PresenceHost({ audio: 'off' });
    host.push({ kind: 'session.start' });
    host.push({ kind: 'human.start' });
    expect(host.snapshot.phase).toBe('listening');
  });

  it('keeps an echo of the previous phase', () => {
    const trail = new EchoTrail();
    trail.adopt({ ...hostIdle(), phase: 'listening' });
    trail.adopt({ ...hostIdle(), phase: 'thinking' });
    expect(trail.echo.phase).toBe('listening');
  });
});

function hostIdle() {
  return {
    phase: 'idle' as const,
    duplex: { input: 0, output: 0 },
    tool: null,
    error: null,
    session: true
  };
}
