import { useEffect, useRef, useState } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { subscribe } from '../clock';
import { glyphFor } from './icons';
import { morphD } from './morph';
import { Spring } from './morphicons/core/spring';

export function GlyphPresence({
  snapshot,
  size = 48,
  dark = true,
  paused = false
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
}) {
  const phase = snapshot.phase;
  const fromRef = useRef(glyphFor(phase));
  const toRef = useRef(glyphFor(phase));
  const springRef = useRef(new Spring());
  const [d, setD] = useState(() => morphD(glyphFor(phase), glyphFor(phase), 1));

  useEffect(() => {
    const next = glyphFor(phase);
    fromRef.current = toRef.current;
    toRef.current = next;
    springRef.current.start();
    setD(morphD(fromRef.current, toRef.current, 0));
  }, [phase]);

  useEffect(() => {
    if (paused) return;
    return subscribe((dt) => {
      const settled = springRef.current.step(dt);
      setD(morphD(fromRef.current, toRef.current, springRef.current.x));
      if (settled) {
        /* keep last frame */
      }
    });
  }, [paused]);

  const stroke = dark ? '#e8e8ea' : '#161616';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={PHASE_LABELS[phase]}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
