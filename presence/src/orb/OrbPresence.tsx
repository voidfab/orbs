import { ThinkingOrb } from 'thinking-orbs-mega';
import type { PresenceSnapshot } from '../bus/types';
import { toOrbState } from '../bus/map';

export function OrbPresence({
  snapshot,
  size = 64,
  theme = 'auto',
  paused = false,
  renderer = 'canvas'
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  theme?: 'auto' | 'dark' | 'light';
  paused?: boolean;
  renderer?: 'canvas' | 'svg';
}) {
  const energy = Math.max(snapshot.duplex.input, snapshot.duplex.output);
  return (
    <ThinkingOrb
      state={toOrbState(snapshot.phase)}
      size={size}
      theme={theme}
      paused={paused}
      renderer={renderer}
      volume={energy > 0.04 ? energy : undefined}
    />
  );
}
