import { useEffect, useState } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import type { PresenceHost } from './PresenceHost';

export function usePresenceHost(host: PresenceHost): PresenceSnapshot {
  const [snapshot, setSnapshot] = useState(() => host.snapshot);
  useEffect(() => host.subscribe(setSnapshot), [host]);
  return snapshot;
}
