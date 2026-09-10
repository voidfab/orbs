import { useEffect, useRef, type CSSProperties } from 'react';
import type { PresenceSnapshot } from '../bus/types';
import { PHASE_LABELS } from '../bus/types';
import { applyCssOrbMotion, cssOrbColors, type CssOrbLayers } from './animate';
import { cssOrbSpeed, toCssOrbState } from './map';
import './orbz.css';

export function CssOrbPresence({
  snapshot,
  size = 96,
  preset = 'neongate',
  paused = false,
  reducedMotion = false
}: {
  snapshot: PresenceSnapshot;
  size?: number;
  preset?: 'neongate' | 'periwinkle' | 'magenta' | 'peach' | 'mocha' | 'ivory';
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);

  const state = toCssOrbState(snapshot.phase);
  const colors = cssOrbColors(snapshot.phase === 'err' ? 'magenta' : preset);
  const speed = cssOrbSpeed(snapshot.phase);

  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      !auraRef.current ||
      !ringRef.current ||
      !fieldRef.current ||
      !coreRef.current ||
      !highlightRef.current
    ) {
      return;
    }
    const layers: CssOrbLayers = {
      root,
      aura: auraRef.current,
      ring: ringRef.current,
      field: fieldRef.current,
      core: coreRef.current,
      highlight: highlightRef.current
    };
    const animations = applyCssOrbMotion(layers, state, {
      speed,
      reduced: reducedMotion,
      paused
    });
    return () => {
      for (const a of animations) a.cancel();
    };
  }, [state, speed, paused, reducedMotion]);

  const style = {
    '--orbz-size': `${size}px`,
    '--orbz-accent': colors.accent,
    '--orbz-background': colors.background,
    '--orbz-highlight': colors.highlight,
    '--orbz-primary': colors.primary,
    '--orbz-secondary': colors.secondary
  } as CSSProperties;

  return (
    <span className="orbz-host" role="img" aria-label={PHASE_LABELS[snapshot.phase]} style={style}>
      <div ref={rootRef} className="orbz-root" aria-hidden="true">
        <span ref={auraRef} className="orbz-aura" />
        <span ref={ringRef} className="orbz-ring" />
        <span className="orbz-sphere">
          <span ref={fieldRef} className="orbz-field" />
          <span className="orbz-texture" />
          <span ref={coreRef} className="orbz-core" />
          <span ref={highlightRef} className="orbz-highlight" />
        </span>
      </div>
    </span>
  );
}
