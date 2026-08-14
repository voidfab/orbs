import type { CSSProperties } from 'react';
import {
  ANALYSIS_SOURCES,
  KNOB_META,
  knobRange,
  type AnalysisSource,
  type BusAnalysis,
  type KnobKey,
  type SeamBindings,
  type SeamKnobs
} from 'thinking-orbs';

export function SeamAdmin({
  open,
  onOpen,
  knobs,
  bindings,
  onKnob,
  onBind,
  input,
  output
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  knobs: SeamKnobs;
  bindings: SeamBindings;
  onKnob: (key: KnobKey, value: number) => void;
  onBind: (key: KnobKey, source: AnalysisSource) => void;
  input: BusAnalysis;
  output: BusAnalysis;
}) {
  return (
    <aside style={panel}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#c5cbd6' }}>
        <input type="checkbox" checked={open} onChange={(e) => onOpen(e.target.checked)} />
        admin override
      </label>
      <p style={{ margin: '8px 0 14px', fontSize: 11, color: '#6c7380', lineHeight: 1.45 }}>
        Camera is locked unless you move yaw / tilt / hitch. Bind a knob to an analysis bus to try
        RMS → pulse instead of spin.
      </p>
      {open ? (
        <>
          <BusMeters title="in" bus={input} color="#a8ff48" />
          <BusMeters title="out" bus={output} color="#ff3084" />
          {(['camera', 'layers', 'motes', 'rails', 'motion'] as const).map((group) => (
            <section key={group} style={{ marginTop: 14 }}>
              <div style={groupLabel}>{group}</div>
              {KNOB_META.filter((k) => k.group === group).map((meta) => {
                const range = knobRange(meta.key);
                const bound = bindings[meta.key] ?? 'manual';
                return (
                  <div key={meta.key} style={{ marginBottom: 8 }}>
                    <div style={row}>
                      <span>{meta.label}</span>
                      <span style={{ color: '#9aa1ad' }}>{knobs[meta.key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={knobs[meta.key]}
                      disabled={bound !== 'manual'}
                      onChange={(e) => onKnob(meta.key, Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <select
                      value={bound}
                      onChange={(e) => onBind(meta.key, e.target.value as AnalysisSource)}
                      style={select}
                    >
                      {ANALYSIS_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </section>
          ))}
        </>
      ) : null}
    </aside>
  );
}

function BusMeters({ title, bus, color }: { title: string; bus: BusAnalysis; color: string }) {
  const keys: Array<keyof BusAnalysis> = ['rms', 'peak', 'vad', 'bass', 'mid', 'high', 'onset', 'centroid'];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={groupLabel}>{title}</div>
      {keys.map((k) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 28px', gap: 6, alignItems: 'center', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: '#7d8596' }}>{k}</span>
          <div style={{ height: 3, background: '#1a1d24', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round(Math.min(1, bus[k]) * 100)}%`, height: '100%', background: color }} />
          </div>
          <span style={{ color: '#6c7380', textAlign: 'right' }}>{bus[k].toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

const panel: CSSProperties = {
  width: 280,
  maxHeight: 'calc(100vh - 48px)',
  overflow: 'auto',
  padding: '16px 16px 28px',
  color: '#8b93a2',
  fontSize: 12
};

const groupLabel: CSSProperties = {
  letterSpacing: '0.14em',
  fontSize: 10,
  color: '#7d8596',
  textTransform: 'uppercase',
  marginBottom: 8
};

const row: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 2
};

const select: CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: '#11141a',
  color: 'inherit',
  border: '1px solid #2a3140',
  borderRadius: 6,
  font: 'inherit',
  fontSize: 11,
  padding: '2px 6px'
};
