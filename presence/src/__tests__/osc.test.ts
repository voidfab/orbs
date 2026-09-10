import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import {
  OSC12_CORE,
  claudeHookToConversation,
  decodePhaseCursor,
  encodeOsc12,
  encodePhaseCursor,
  phaseFromClaudeHook
} from '../terminal/osc';
import { TERMINAL_KEYS, nearestPhase } from '../terminal/palette';

describe('OSC 12 sidechannel', () => {
  it('emits BEL-terminated OSC 12', () => {
    expect(encodeOsc12('#5ce0c9')).toBe('\x1b]12;#5ce0c9\x07');
    expect(encodeOsc12('e00000')).toBe('\x1b]12;#e00000\x07');
  });

  it('round-trips the official five keys', () => {
    for (const [phase, hex] of Object.entries(OSC12_CORE)) {
      expect(TERMINAL_KEYS[phase as keyof typeof OSC12_CORE]).toBe(hex);
      expect(decodePhaseCursor(hex)).toBe(phase);
      expect(encodePhaseCursor(phase as keyof typeof OSC12_CORE)).toContain(hex);
    }
  });

  it('keeps every presence key unique under nearest-neighbour', () => {
    for (const phase of PRESENCE_PHASES) {
      expect(nearestPhase(TERMINAL_KEYS[phase])).toBe(phase);
    }
  });

  it('maps Claude Code hooks the way claude-face-hook.sh does', () => {
    expect(phaseFromClaudeHook({ hook_event_name: 'UserPromptSubmit' })).toBe('thinking');
    expect(phaseFromClaudeHook({ hook_event_name: 'PreToolUse', tool_name: 'Read' })).toBe('thinking');
    expect(phaseFromClaudeHook({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBe('working');
    expect(phaseFromClaudeHook({ hook_event_name: 'Stop' })).toBe('done');
    expect(phaseFromClaudeHook({ hook_event_name: 'SessionStart' })).toBe('idle');
    expect(phaseFromClaudeHook({ hook_event_name: 'UserPromptSubmit', agent_id: 'sub' })).toBe('idle');
    expect(claudeHookToConversation({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toEqual({
      kind: 'tool.start',
      name: 'Bash'
    });
  });
});
