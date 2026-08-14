import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ConversationSeam,
  SILENT_BUS,
  ThinkingOrb,
  defaultKnobs,
  knobsFromPhase,
  resolveKnobs,
  useSeamAudio,
  type AnalysisSource,
  type KnobKey,
  type OrbState,
  type SeamBindings,
  type SeamGeneration,
  type SeamKnobs,
  type SeamPhase,
  type SeamVariant
} from 'thinking-orbs';
import { SeamAdmin } from './SeamAdmin';

const PHASES: SeamPhase[] = ['idle', 'listening', 'thinking', 'speaking'];

const SCRIPT: Array<{ phase: SeamPhase; ms: number; line: string }> = [
  { phase: 'idle', ms: 1400, line: 'waiting for you' },
  { phase: 'listening', ms: 3200, line: 'STT is catching the turn' },
  { phase: 'thinking', ms: 2400, line: 'Brain is holding the question' },
  { phase: 'speaking', ms: 3200, line: 'TTS is leaving the core' },
  { phase: 'listening', ms: 2000, line: 'ready for barge-in' }
];

function orbFor(phase: SeamPhase): OrbState {
  if (phase === 'listening') return 'listening';
  if (phase === 'thinking') return 'cognition';
  if (phase === 'speaking') return 'speaking';
  return 'presence';
}

export function SeamDemo() {
  const [phase, setPhase] = useState<SeamPhase>('listening');
  const [variant, setVariant] = useState<SeamVariant>('conduit');
  const [generation, setGeneration] = useState<SeamGeneration>(2);
  const [auto, setAuto] = useState(true);
  const [core, setCore] = useState(false);
  const [line, setLine] = useState(SCRIPT[1].line);
  const [stage, setStage] = useState(360);
  const [meters, setMeters] = useState({ input: 0.2, output: 0, vad: 0 });
  const [admin, setAdmin] = useState(false);
  const [manual, setManual] = useState<SeamKnobs>(() => defaultKnobs());
  const [bindings, setBindings] = useState<SeamBindings>({
    railThreads: 'thinking',
    railSpeed: 'thinking',
    wave: 'out.rms'
  });
  const [liveKnobs, setLiveKnobs] = useState<SeamKnobs>(() => defaultKnobs());
  const audio = useSeamAudio();
  const inputRef = useRef(0.2);
  const outputRef = useRef(0);
  const vadRef = useRef(0);
  const knobsRef = useRef<SeamKnobs>(defaultKnobs());
  const phaseRef = useRef(phase);
  const adminRef = useRef(admin);
  const manualRef = useRef(manual);
  const bindingsRef = useRef(bindings);
  phaseRef.current = phase;
  adminRef.current = admin;
  manualRef.current = manual;
  bindingsRef.current = bindings;

  useEffect(() => {
    const fit = () => setStage(Math.max(260, Math.min(440, window.innerWidth - 64)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (!auto) return;
    let i = 1;
    let timer = 0;
    const tick = () => {
      const step = SCRIPT[i % SCRIPT.length];
      setPhase(step.phase);
      setLine(step.line);
      i += 1;
      timer = window.setTimeout(tick, step.ms);
    };
    timer = window.setTimeout(tick, SCRIPT[1].ms);
    return () => window.clearTimeout(timer);
  }, [auto]);

  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();
    let lastMeter = 0;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const live = audio.levelsRef.current;
      const tap = audio.statusRef.current;
      const phaseNow = phaseRef.current;
      if (tap.mic) {
        inputRef.current = live.input;
      } else if (phaseNow === 'listening') {
        inputRef.current = 0.22 + 0.38 * Math.abs(Math.sin(t * 4.4));
      } else if (phaseNow === 'idle') {
        inputRef.current = 0.04;
      } else {
        inputRef.current *= 0.92;
      }

      if (tap.output !== 'none') {
        outputRef.current = live.output;
      } else if (phaseNow === 'speaking') {
        outputRef.current = 0.28 + 0.46 * Math.abs(Math.sin(t * 5.2));
      } else if (phaseNow === 'thinking') {
        outputRef.current = 0.07 + 0.05 * Math.sin(t * 2);
      } else {
        outputRef.current *= 0.88;
      }

      vadRef.current = tap.mic
        ? live.vad
        : phaseNow === 'listening'
          ? Math.min(1, inputRef.current * 1.15)
          : live.vad * 0.9;

      const phaseKnobs = knobsFromPhase(phaseNow, inputRef.current, outputRef.current);
      const base = adminRef.current ? manualRef.current : phaseKnobs;
      knobsRef.current = resolveKnobs(
        base,
        adminRef.current ? bindingsRef.current : {},
        base.thinking,
        live.in ?? SILENT_BUS,
        live.out ?? SILENT_BUS
      );

      if (now - lastMeter > 50) {
        lastMeter = now;
        setMeters({ input: inputRef.current, output: outputRef.current, vad: vadRef.current });
        setLiveKnobs({ ...knobsRef.current });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [audio.levelsRef, audio.statusRef]);

  const barge = () => {
    setAuto(false);
    setPhase('listening');
    setLine('barge-in — you took the floor');
    outputRef.current = 0;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        background:
          generation === 2
            ? 'radial-gradient(ellipse at 50% 38%, #140c14 0%, #07050a 58%)'
            : 'radial-gradient(ellipse at 50% 40%, #12151c 0%, #07080b 62%)'
      }}
    >
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minWidth: 0 }}>
      <header style={{ padding: '28px 32px 8px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <p style={{ margin: 0, letterSpacing: '0.16em', fontSize: 11, color: '#7d8596' }}>
          FOX9 · STT → BRAIN → TTS · {generation === 2 ? 'V2 RIFT' : 'V1 SEAM'}
        </p>
        <h1 style={{ margin: '6px 0 8px', fontSize: 32, fontWeight: 560 }}>
          {generation === 2 ? 'Seam · rift' : 'Seam'}
        </h1>
        <p style={{ margin: 0, maxWidth: '62ch', color: '#9aa1ad' }}>
          Two domains. Internal is Channel In (mic) — orb, helix, or cube. External is Channel Out
          (speakers) — {generation === 2 ? 'a closed (2,3) trefoil' : 'the globe field'}. They never
          paint each other. Conduit is an orb in a compact knot. Halo is a helix in a wider wrap. Well
          is a cube the cursor folds.
        </p>
      </header>

      <main style={{ display: 'grid', placeItems: 'center', padding: '12px 24px 24px' }}>
        <ConversationSeam
          phase={phase}
          variant={variant}
          generation={generation}
          size={stage}
          inputVolumeRef={inputRef}
          outputVolumeRef={outputRef}
          vadRef={vadRef}
          knobsRef={knobsRef}
          onBargeIn={barge}
        >
          {core && generation === 1 ? (
            <ThinkingOrb
              state={orbFor(phase === 'speaking' ? 'idle' : phase)}
              size={variant === 'halo' ? 148 : 108}
              palette={phase === 'thinking' ? 'iris' : 'voice'}
              volume={meters.input}
              interaction={{ hover: { enabled: true, spring: true } }}
            />
          ) : null}
        </ConversationSeam>
      </main>

      <footer style={{ padding: '0 32px 36px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div style={{ color: '#c5cbd6', marginBottom: 10, minHeight: 22 }}>{line}</div>
        <Meters input={meters.input} output={meters.output} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', color: '#8b93a2' }}>
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAuto(false);
                setPhase(p);
                setLine(p);
              }}
              style={chip(phase === p)}
            >
              {p}
            </button>
          ))}
          <span style={{ width: 12 }} />
          {([1, 2] as SeamGeneration[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGeneration(g);
                setCore(g === 1);
              }}
              style={chip(generation === g, g === 2)}
            >
              v{g}
            </button>
          ))}
          {(
            [
              ['conduit', 'orb in'],
              ['halo', 'helix in'],
              ['well', 'cube in']
            ] as Array<[SeamVariant, string]>
          ).map(([v, note]) => (
            <button key={v} type="button" onClick={() => setVariant(v)} style={chip(variant === v, generation === 2)}>
              {v}
              <span style={{ opacity: 0.55, marginLeft: 6 }}>{note}</span>
            </button>
          ))}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            auto turn
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={core} onChange={(e) => setCore(e.target.checked)} />
            official orb in the core
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            color: '#8b93a2',
            marginTop: 12
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (audio.status.mic) audio.stopMic();
              else void audio.startMic();
            }}
            style={chip(audio.status.mic)}
          >
            mic
          </button>
          <button
            type="button"
            onClick={() => {
              if (audio.status.output === 'demo') audio.stopOutput();
              else {
                setAuto(false);
                setPhase('speaking');
                setLine('demo voice → default speakers');
                void audio.startDemo();
              }
            }}
            style={chip(audio.status.output === 'demo', generation === 2)}
          >
            demo voice
          </button>
          <button
            type="button"
            onClick={() => {
              if (audio.status.output === 'speakers') audio.stopOutput();
              else {
                setLine('share a tab (or system) with audio');
                void audio.startSpeakers();
              }
            }}
            style={chip(audio.status.output === 'speakers', generation === 2)}
          >
            tap speakers
          </button>
          <a href="/review.html" style={{ color: 'inherit', marginLeft: 'auto' }}>
            review gallery
          </a>
        </div>
        {audio.status.error ? (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#ff8aa0' }}>{audio.status.error}</p>
        ) : (
          <p style={{ margin: '16px 0 0', fontSize: 12, color: '#6c7380', maxWidth: '70ch' }}>
            <code>inputVolume</code> drives the internal body only. <code>outputVolume</code> drives the
            external knot or globe only. Pass those props (or refs), <code>phase</code>, and{' '}
            <code>onBargeIn</code>.
          </p>
        )}
      </footer>
      </div>
      <SeamAdmin
        open={admin}
        onOpen={(v) => {
          if (v) {
            setAuto(false);
            setManual({ ...knobsRef.current });
          }
          setAdmin(v);
        }}
        knobs={admin ? resolveKnobs(manual, bindings, manual.thinking, audio.levels.in, audio.levels.out) : liveKnobs}
        bindings={bindings}
        onKnob={(key, value) => setManual((prev) => ({ ...prev, [key]: value }))}
        onBind={(key: KnobKey, source: AnalysisSource) => setBindings((prev) => ({ ...prev, [key]: source }))}
        input={audio.levels.in}
        output={audio.levels.out}
      />
    </div>
  );
}

function Meters({ input, output }: { input: number; output: number }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginBottom: 14, maxWidth: 420 }}>
      <Meter label="in" value={input} color="#a8ff48" />
      <Meter label="out" value={output} color="#ff3084" />
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, alignItems: 'center', fontSize: 11 }}>
      <span style={{ color: '#7d8596' }}>{label}</span>
      <div style={{ height: 4, background: '#1a1d24', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(Math.min(1, value) * 100)}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function chip(on: boolean, alien = false): CSSProperties {
  return {
    background: on ? (alien ? '#1a1016' : '#1c2230') : '#11141a',
    color: inheritColor,
    border: '1px solid #2a3140',
    outline: on ? `2px solid ${alien ? '#c8ff48' : '#7bf'}` : 'none',
    borderRadius: 999,
    padding: '4px 10px',
    font: 'inherit',
    cursor: 'pointer'
  };
}

const inheritColor = 'inherit';
