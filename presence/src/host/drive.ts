import { piActivityToConversation, voiceBusToConversation, type PiActivityEvent } from '../bus/map.ts';
import type { PresenceSnapshot } from '../bus/types.ts';
import type { PresenceHost } from './PresenceHost.ts';

function ensureSession(host: PresenceHost): void {
  if (!host.conversation.session) host.push({ kind: 'session.start' });
}

/** Drive the bus from a Pi coding-agent activity event. */
export function pushPiActivity(host: PresenceHost, event: PiActivityEvent): PresenceSnapshot {
  if (event.type === 'agent_started') ensureSession(host);
  const conv = piActivityToConversation(event);
  if (conv) return host.push(conv);
  return host.snapshot;
}

/** Drive the bus from a Hermes gateway event type + payload. */
export function pushHermesGateway(
  host: PresenceHost,
  type: string,
  payload: Record<string, unknown> = {}
): PresenceSnapshot {
  const t = String(type || '');
  if (t === 'thinking.delta') return host.snapshot;
  if (t === 'session.info') {
    if (payload.running === true) {
      ensureSession(host);
      return host.snapshot;
    }
    if (payload.running === false) return host.push({ kind: 'session.end' });
    return host.snapshot;
  }
  if (t === 'message.start') {
    ensureSession(host);
    return host.push({ kind: 'agent.think' });
  }
  if (t === 'message.delta' || t === 'message.interim') {
    ensureSession(host);
    return host.push({ kind: 'agent.speak' });
  }
  if (t === 'message.complete') return host.push({ kind: 'turn.end' });
  if (t === 'error') return host.push({ kind: 'error' });
  if (t === 'tool.start' || t === 'tool.generating') {
    const name = String(
      payload.toolName ?? payload.name ?? payload.tool ?? payload.tool_name ?? 'tool'
    );
    ensureSession(host);
    return host.push({ kind: 'tool.start', name });
  }
  if (t === 'tool.complete') {
    host.push({ kind: 'tool.end' });
    return host.push({ kind: 'agent.think' });
  }
  return host.snapshot;
}

/** Drive the bus from a Hermes `hermes:voice-bus` phase name. */
export function pushVoiceBus(host: PresenceHost, phase: string, toolName?: string): PresenceSnapshot {
  const conv = voiceBusToConversation(phase, toolName);
  if (!conv) return host.snapshot;
  if (conv.kind !== 'session.end' && conv.kind !== 'asleep') ensureSession(host);
  return host.push(conv);
}
