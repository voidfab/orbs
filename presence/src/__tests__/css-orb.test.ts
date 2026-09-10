import { describe, expect, it } from 'vitest';
import { PRESENCE_PHASES } from '../bus/types';
import config from '../css-orb/orbz.config.json';
import { CSS_ORB_STATES, cssOrbSpeed, toCssOrbState } from '../css-orb/map';

describe('css orb port', () => {
  it('has motion profiles for every Orbz state', () => {
    expect([...CSS_ORB_STATES]).toEqual(['idle', 'listening', 'thinking', 'speaking', 'asleep']);
    for (const state of CSS_ORB_STATES) {
      expect(config.motion.full[state], state).toBeTruthy();
      expect(config.motion.reduced[state], state).toBeTruthy();
      expect(config.appearance.byState[state], state).toBeTruthy();
    }
  });

  it('maps every presence phase onto an Orbz motion profile', () => {
    for (const phase of PRESENCE_PHASES) {
      const state = toCssOrbState(phase);
      expect(CSS_ORB_STATES.includes(state), phase).toBe(true);
      expect(cssOrbSpeed(phase)).toBeGreaterThan(0);
    }
    expect(toCssOrbState('working')).toBe('thinking');
    expect(toCssOrbState('waiting')).toBe('listening');
    expect(toCssOrbState('err')).toBe('thinking');
    expect(toCssOrbState('done')).toBe('idle');
    expect(cssOrbSpeed('working')).toBeGreaterThan(cssOrbSpeed('idle'));
  });

  it('ships the neongate palette', () => {
    expect(config.appearance.presets.neongate.primary).toMatch(/^#/);
    expect(config.appearance.colorKeys).toEqual([
      'accent',
      'background',
      'highlight',
      'primary',
      'secondary'
    ]);
  });
});
