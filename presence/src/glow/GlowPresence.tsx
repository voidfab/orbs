import { useEffect, useRef, type CSSProperties } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS, SILENT_DUPLEX } from '../bus/types';
import { auroraPalette, auroraSpeed } from './map';
import './glow.css';

export function GlowPresence({
  snapshot,
  size = 96,
  dark = true,
  paused = false,
  reducedMotion = false
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  dark?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const auraRef = useRef<HTMLSpanElement>(null);
  const washRef = useRef<HTMLSpanElement>(null);
  const sparkRef = useRef<HTMLSpanElement>(null);
  const palette = auroraPalette(snapshot.phase);
  const speed = auroraSpeed(snapshot.phase);
  const duplex = snapshot.duplex ?? SILENT_DUPLEX;
  const energy = Math.max(0.22, duplex.input, duplex.output, snapshot.phase === 'asleep' ? 0.12 : 0);

  useEffect(() => {
    const aura = auraRef.current;
    const wash = washRef.current;
    const spark = sparkRef.current;
    if (!aura || !wash || !spark || typeof aura.animate !== 'function') return;
    if (reducedMotion) return;
    const base = 9000 / speed;
    const animations = [
      aura.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
        duration: base,
        iterations: Infinity,
        easing: 'linear'
      }),
      wash.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], {
        duration: base * 1.35,
        iterations: Infinity,
        easing: 'linear'
      }),
      spark.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 0.55 },
          { transform: 'translate(18%, 12%) scale(1.15)', opacity: 0.95 },
          { transform: 'translate(-8%, 22%) scale(0.9)', opacity: 0.7 },
          { transform: 'translate(0, 0) scale(1)', opacity: 0.55 }
        ],
        { duration: base * 0.7, iterations: Infinity, easing: 'ease-in-out' }
      )
    ];
    if (paused) for (const a of animations) a.pause();
    return () => {
      for (const a of animations) a.cancel();
    };
  }, [speed, paused, reducedMotion, snapshot.phase]);

  const style = {
    '--aurora-size': `${size}px`,
    '--aurora-base': palette.base,
    '--aurora-a0': palette.anchors[0],
    '--aurora-a1': palette.anchors[1],
    '--aurora-a2': palette.anchors[2],
    '--aurora-a3': palette.anchors[3],
    '--aurora-plate': dark ? '#141418' : '#f3f3f6',
    '--aurora-energy': String(0.7 + energy * 0.7)
  } as CSSProperties;

  return (
    <span className="aurora-host" role="img" aria-label={PHASE_LABELS[snapshot.phase]} style={style}>
      <div className="aurora-root" aria-hidden="true">
        <span ref={auraRef} className="aurora-aura" />
        <span ref={washRef} className="aurora-wash" />
        <span className="aurora-ring" />
        <span className="aurora-core" />
        <span ref={sparkRef} className="aurora-spark" />
      </div>
    </span>
  );
}
