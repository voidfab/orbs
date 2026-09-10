import { describe, expect, it } from 'vitest';
import { piActivityToConversation, voiceBusToConversation } from '../bus/map';
import { pushHermesGateway, pushPiActivity, pushVoiceBus } from '../host/drive';
import { PresenceHost } from '../host/PresenceHost';
import { claudeHookToConversation } from '../terminal/osc';

describe('PresenceHost', () => {
  it('reduces host events onto a live snapshot and notifies subscribers', () => {
    const host = new PresenceHost({ audio: 'off' });
    const seen: string[] = [];
    host.subscribe((s) => seen.push(s.phase));
    host.push({ kind: 'session.start' });
    host.push({ kind: 'human.start' });
    host.push({ kind: 'human.end' });
    host.push({ kind: 'agent.think' });
    expect(host.snapshot.phase).toBe('thinking');
    expect(seen.includes('listening')).toBe(true);
    expect(seen[seen.length - 1]).toBe('thinking');
  });

  it('keeps duplex independent of named phase', () => {
    const host = new PresenceHost({ audio: 'off' });
    host.push({ kind: 'session.start' });
    host.push({ kind: 'agent.think' });
    host.setDuplex({ input: 0.4, output: 0.1 });
    expect(host.snapshot.phase).toBe('thinking');
    expect(host.snapshot.duplex.input).toBeCloseTo(0.4);
    expect(host.snapshot.duplex.output).toBeCloseTo(0.1);
  });

  it('turns input VAD into listening with hangover', () => {
    const host = new PresenceHost({ audio: 'listen', hangoverMs: 200, vadStart: 0.12, vadStop: 0.05 });
    host.push({ kind: 'session.start' });
    host.ingestAudio({ input: 0.5, output: 0, vad: 0.7 }, 0);
    expect(host.snapshot.phase).toBe('listening');
    host.ingestAudio({ input: 0, output: 0, vad: 0 }, 100);
    expect(host.snapshot.phase).toBe('listening');
    host.ingestAudio({ input: 0, output: 0, vad: 0 }, 250);
    expect(host.snapshot.phase).toBe('idle');
  });

  it('does not auto-listen when audio policy is off', () => {
    const host = new PresenceHost({ audio: 'off' });
    host.push({ kind: 'session.start' });
    host.ingestAudio({ input: 0.9, output: 0, vad: 1 }, 0);
    expect(host.snapshot.phase).toBe('idle');
    expect(host.snapshot.duplex.input).toBeCloseTo(0.9);
  });

  it('maps output VAD to speaking under duplex policy', () => {
    const host = new PresenceHost({ audio: 'duplex', hangoverMs: 50 });
    host.push({ kind: 'session.start' });
    host.ingestAudio({ input: 0, output: 0.8, vad: 0 }, 0);
    expect(host.snapshot.phase).toBe('speaking');
    host.ingestAudio({ input: 0, output: 0, vad: 0 }, 80);
    expect(host.snapshot.phase).toBe('idle');
  });

  it('adopts a named phase without inheriting duplex as speech flags', () => {
    const host = new PresenceHost({ audio: 'off' });
    host.setDuplex({ input: 0.5, output: 0.5 });
    host.adoptPhase('thinking');
    expect(host.snapshot.phase).toBe('thinking');
    expect(host.snapshot.duplex.input).toBeCloseTo(0.5);
    host.adoptPhase('waiting', { tool: 'Bash' });
    expect(host.snapshot.phase).toBe('waiting');
    expect(host.snapshot.tool).toEqual({ name: 'Bash', status: 'permission' });
  });
});

describe('live host adapters', () => {
  it('maps Pi activity onto conversation events', () => {
    const host = new PresenceHost({ audio: 'off' });
    for (const event of [
      piActivityToConversation({ type: 'agent_started' }),
      piActivityToConversation({ type: 'tool_started', id: '1', toolName: 'Bash' }),
      piActivityToConversation({ type: 'tool_finished', id: '1' }),
      piActivityToConversation({ type: 'assistant_text_started' }),
      piActivityToConversation({ type: 'agent_settled' })
    ]) {
      if (event) host.push(event);
    }
    expect(host.snapshot.phase).toBe('done');
  });

  it('maps Claude Code hooks onto the bus', () => {
    const host = new PresenceHost({ audio: 'off' });
    host.push(claudeHookToConversation({ hook_event_name: 'SessionStart' })!);
    host.push(claudeHookToConversation({ hook_event_name: 'UserPromptSubmit' })!);
    expect(host.snapshot.phase).toBe('thinking');
    host.push(claudeHookToConversation({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })!);
    expect(host.snapshot.phase).toBe('working');
    expect(claudeHookToConversation({ hook_event_name: 'UserPromptSubmit', agent_id: 'sub' })).toBeNull();
  });

  it('maps a voice-bus phase name', () => {
    expect(voiceBusToConversation('listening')?.kind).toBe('human.start');
    expect(voiceBusToConversation('talking')?.kind).toBe('agent.speak');
    expect(voiceBusToConversation('working', 'Read')?.kind).toBe('tool.start');
  });

  it('Pi activity drives PresenceHost including a session start', () => {
    const host = new PresenceHost({ audio: 'off' });
    pushPiActivity(host, { type: 'agent_started' });
    expect(host.snapshot.phase).toBe('thinking');
    pushPiActivity(host, { type: 'tool_started', id: '1', toolName: 'Bash' });
    expect(host.snapshot.phase).toBe('working');
    expect(host.snapshot.tool?.name).toBe('Bash');
    pushPiActivity(host, { type: 'agent_settled' });
    expect(host.snapshot.phase).toBe('done');
  });

  it('Hermes gateway events drive PresenceHost', () => {
    const host = new PresenceHost({ audio: 'off' });
    pushHermesGateway(host, 'message.start');
    expect(host.snapshot.phase).toBe('thinking');
    pushHermesGateway(host, 'tool.start', { toolName: 'Read' });
    expect(host.snapshot.phase).toBe('working');
    expect(host.snapshot.tool?.name).toBe('Read');
    pushHermesGateway(host, 'message.complete');
    expect(host.snapshot.phase).toBe('done');
    pushVoiceBus(host, 'listening');
    expect(host.snapshot.phase).toBe('listening');
  });
});
