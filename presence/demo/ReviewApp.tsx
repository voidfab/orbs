import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BraillePresence,
  CssOrbPresence,
  DEMO_TURN,
  DEMO_TURN_DURATION,
  EchoPresence,
  FacePresence,
  GhostPresence,
  GlowPresence,
  GlyphPresence,
  IDENTITY_EXPRESSIONS,
  IdentityPresence,
  MeterPresence,
  OrbPresence,
  PHASE_LABELS,
  PRESENCE_PHASES,
  PresenceHost,
  SEQUENCE,
  autoCastEngine,
  TerminalPresence,
  TextmodePresence,
  snapshotAt,
  usePresenceHost,
  type IdentityExpressionId,
  type PresencePhase,
  type PresenceSnapshot,
  type ShapeId,
  type StateId
} from 'presence';
import { useSeamAudio } from 'thinking-orbs-mega';

type Tab = 'conversation' | 'live' | 'catalog' | 'identity';

const PHASES = [...PRESENCE_PHASES];

function snapshotFor(phase: PresencePhase, input: number, output: number): PresenceSnapshot {
  const duplex =
    phase === 'listening'
      ? { input: Math.max(input, 0.45), output }
      : phase === 'speaking'
        ? { input, output: Math.max(output, 0.5) }
        : { input, output };
  return {
    phase,
    duplex,
    tool:
      phase === 'working'
        ? { name: 'Bash', status: 'running' }
        : phase === 'waiting'
          ? { name: 'Bash', status: 'permission' }
          : null,
    error: phase === 'err' ? 'tool failed' : null,
    session: phase !== 'idle' && phase !== 'asleep'
  };
}

function initialFromUrl(): { tab: Tab; phase: PresencePhase; event: string | null; paused: boolean } {
  if (typeof location === 'undefined') return { tab: 'conversation', phase: 'listening', event: null, paused: false };
  const q = new URLSearchParams(location.search);
  const tabParam = q.get('tab');
  const tab: Tab =
    tabParam === 'catalog' || tabParam === 'identity' || tabParam === 'live' ? tabParam : 'conversation';
  const raw = q.get('phase');
  const phase = PHASES.includes(raw as PresencePhase) ? (raw as PresencePhase) : 'listening';
  return { tab, phase, event: q.get('event'), paused: q.get('paused') === '1' };
}

function seedHost(host: PresenceHost, event: string | null): void {
  if (!event) return;
  host.push({ kind: 'session.start' });
  if (event === 'think') host.push({ kind: 'agent.think' });
  else if (event === 'working') host.push({ kind: 'tool.start', name: 'Bash' });
  else if (event === 'waiting') host.push({ kind: 'tool.permission', name: 'Bash' });
  else if (event === 'speak') host.push({ kind: 'agent.speak' });
  else if (event === 'err') host.push({ kind: 'error', message: 'tool failed' });
}

function PresenceStage({
  snapshot,
  size,
  theme,
  paused,
  who
}: {
  snapshot: PresenceSnapshot;
  size: number;
  theme: 'dark' | 'light';
  paused: boolean;
  who: string;
}) {
  const dark = theme === 'dark';
  return (
    <div className="stage">
      <div className="realm">
        <strong>Face</strong>
        <FacePresence snapshot={snapshot} size={size} theme={theme} paused={paused} />
        <div className="meta">bloub pose mapped from the bus</div>
      </div>
      <div className="realm">
        <strong>Ghost</strong>
        <GhostPresence snapshot={snapshot} size={size} theme={theme} paused={paused} />
        <div className="meta">sheet body, same two eyes</div>
      </div>
      <div className="realm">
        <strong>Orb</strong>
        <OrbPresence snapshot={snapshot} size={Math.min(size, 96)} theme={theme} paused={paused} />
        <div className="meta">thinking-orbs-mega verb</div>
      </div>
      <div className="realm">
        <strong>CSS orb</strong>
        <CssOrbPresence snapshot={snapshot} size={size} paused={paused} />
        <div className="meta">Orbz WAAPI layers</div>
      </div>
      <div className="realm">
        <strong>Glow</strong>
        <GlowPresence snapshot={snapshot} size={size} dark={dark} paused={paused} />
        <div className="meta">Aurora mood ring</div>
      </div>
      <div className="realm">
        <strong>Identity</strong>
        <IdentityPresence name={who} snapshot={snapshot} size={size} />
        <div className="meta">blobatar · {who}</div>
      </div>
      <div className="realm">
        <strong>Meter</strong>
        <MeterPresence snapshot={snapshot} size={size} dark={dark} paused={paused} />
        <div className="meta">duplex in / out + bands</div>
      </div>
      <div className="realm">
        <strong>Textmode</strong>
        <TextmodePresence snapshot={snapshot} size={size} dark={dark} paused={paused} />
        <div className="meta">Cast {autoCastEngine(snapshot.phase)}</div>
      </div>
      <div className="realm">
        <strong>Echo</strong>
        <EchoPresence snapshot={snapshot} size={size} dark={dark} paused={paused} />
        <div className="meta">afterimage of the last phase</div>
      </div>
      <div className="realm">
        <strong>Braille</strong>
        <BraillePresence snapshot={snapshot} size={size} dark={dark} paused={paused} />
        <div className="meta">TTY needles / leds / sines</div>
      </div>
      <div className="realm">
        <strong>Terminal</strong>
        <TerminalPresence snapshot={snapshot} size={size} dark={dark} />
        <div className="meta">palette key + glyph</div>
      </div>
      <div className="realm">
        <strong>Glyph</strong>
        <GlyphPresence snapshot={snapshot} size={Math.min(size, 72)} dark={dark} paused={paused} />
        <div className="meta">morphicons stroke</div>
      </div>
    </div>
  );
}

export function ReviewApp() {
  const boot = initialFromUrl();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tab, setTab] = useState<Tab>(boot.tab);
  const [phase, setPhase] = useState<PresencePhase>(boot.phase);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(0);
  const [input, setInput] = useState(0.15);
  const [output, setOutput] = useState(0.1);
  const [size, setSize] = useState(96);
  const [catalog, setCatalog] = useState<StateId>('idle');
  const [catalogShape, setCatalogShape] = useState<ShapeId>('cercle');
  const [identityExpr, setIdentityExpr] = useState<IdentityExpressionId>('idle');
  const [who, setWho] = useState('presence');
  const [paused, setPaused] = useState(boot.paused);

  const hostRef = useRef<PresenceHost | null>(null);
  if (!hostRef.current) {
    hostRef.current = new PresenceHost({ audio: 'listen' });
    seedHost(hostRef.current, boot.event);
  }
  const host = hostRef.current;
  const liveSnapshot = usePresenceHost(host);
  const audio = useSeamAudio();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (t > DEMO_TURN_DURATION) {
        setPlaying(false);
        setPlayT(0);
        return;
      }
      setPlayT(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (tab !== 'live') {
      audio.stop();
      return;
    }
    const id = window.setInterval(() => {
      const levels = audio.levelsRef.current;
      host.ingestAudio({ input: levels.input, output: levels.output, vad: levels.vad });
    }, 40);
    return () => window.clearInterval(id);
  }, [tab, host, audio]);

  const snapshot = useMemo(() => {
    if (playing) return snapshotAt(DEMO_TURN, playT);
    return snapshotFor(phase, input, output);
  }, [playing, playT, phase, input, output]);

  const stageSnapshot = tab === 'live' ? liveSnapshot : snapshot;

  return (
    <>
      <header>
        <h1>Presence — conversation realms</h1>
        <p>
          Full-duplex human↔agent turn with tool use. One bus, several bodies. Live tab drives
          the same painters from a <code>PresenceHost</code> (mic VAD + host events).{' '}
          <a href="http://127.0.0.1:5177/review.html">thinking-orbs-mega</a>
        </p>
        <nav className="tabs">
          {(['conversation', 'live', 'catalog', 'identity'] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'chip on' : 'chip'}
              onClick={() => setTab(id)}
            >
              {id === 'catalog' ? 'face catalog' : id}
            </button>
          ))}
        </nav>
      </header>

      <div className="bar">
        <label>
          theme
          <select value={theme} onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}>
            <option value="dark">dark</option>
            <option value="light">light</option>
          </select>
        </label>
        <label>
          size
          <input type="range" min={48} max={160} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          paused
        </label>
        <label>
          who
          <input value={who} onChange={(e) => setWho(e.target.value)} style={{ width: 120 }} />
        </label>
      </div>

      {tab === 'conversation' ? (
        <>
          <div className="bar">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                className={!playing && phase === p ? 'chip on' : 'chip'}
                onClick={() => {
                  setPlaying(false);
                  setPhase(p);
                }}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={playing ? 'chip on' : 'chip'}
              onClick={() => {
                setPlayT(0);
                setPlaying(true);
              }}
            >
              play duplex turn
            </button>
          </div>
          <div className="bar">
            <label>
              in
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={input}
                onChange={(e) => setInput(Number(e.target.value))}
              />
            </label>
            <label>
              out
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={output}
                onChange={(e) => setOutput(Number(e.target.value))}
              />
            </label>
            <span className="name">
              {PHASE_LABELS[snapshot.phase]}
              {snapshot.tool ? ` · ${snapshot.tool.name} (${snapshot.tool.status})` : ''}
              {playing ? ` · t=${playT.toFixed(1)}s` : ''}
            </span>
          </div>
          <PresenceStage snapshot={stageSnapshot} size={size} theme={theme} paused={paused} who={who} />
        </>
      ) : tab === 'live' ? (
        <>
          <div className="bar">
            <button
              type="button"
              className={audio.status.mic ? 'chip on' : 'chip'}
              onClick={() => {
                if (audio.status.mic) {
                  audio.stopMic();
                  host.push({ kind: 'human.end' });
                  return;
                }
                host.push({ kind: 'session.start' });
                void audio.startMic();
              }}
            >
              mic
            </button>
            <button
              type="button"
              className={audio.status.output === 'demo' ? 'chip on' : 'chip'}
              onClick={() => {
                if (audio.status.output === 'demo') {
                  audio.stopOutput();
                  host.push({ kind: 'agent.speak.end' });
                  return;
                }
                host.push({ kind: 'session.start' });
                host.push({ kind: 'agent.speak' });
                void audio.startDemo('out');
              }}
            >
              demo tts
            </button>
            <button type="button" className="chip" onClick={() => host.push({ kind: 'agent.think' })}>
              think
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => host.push({ kind: 'tool.start', name: 'Bash' })}
            >
              bash
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => host.push({ kind: 'tool.permission', name: 'Bash' })}
            >
              permission
            </button>
            <button type="button" className="chip" onClick={() => host.push({ kind: 'tool.end', name: 'Bash' })}>
              tool end
            </button>
            <button type="button" className="chip" onClick={() => host.push({ kind: 'turn.end' })}>
              done
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => host.push({ kind: 'error', message: 'tool failed' })}
            >
              err
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                audio.stop();
                host.reset();
              }}
            >
              reset
            </button>
            <span className="name">
              {PHASE_LABELS[liveSnapshot.phase]}
              {liveSnapshot.tool ? ` · ${liveSnapshot.tool.name} (${liveSnapshot.tool.status})` : ''}
              {` · in ${liveSnapshot.duplex.input.toFixed(2)} out ${liveSnapshot.duplex.output.toFixed(2)}`}
              {audio.status.error ? ` · ${audio.status.error}` : ''}
            </span>
          </div>
          <PresenceStage snapshot={stageSnapshot} size={size} theme={theme} paused={paused} who={who} />
        </>
      ) : tab === 'catalog' ? (
        <>
          <div className="bar">
            <button
              type="button"
              className={catalogShape === 'cercle' ? 'chip on' : 'chip'}
              onClick={() => setCatalogShape('cercle')}
            >
              ball
            </button>
            <button
              type="button"
              className={catalogShape === 'ghost' ? 'chip on' : 'chip'}
              onClick={() => setCatalogShape('ghost')}
            >
              ghost
            </button>
            <span className="name">
              {catalogShape === 'ghost' ? 'sheet body, same 14 poses' : 'video-faithful ball'}
            </span>
          </div>
          <div className="grid">
            {SEQUENCE.map((id) => (
              <button
                key={id}
                type="button"
                className={catalog === id ? 'cell sel' : 'cell'}
                onClick={() => setCatalog(id)}
              >
                <FacePresence state={id} shape={catalogShape} size={88} theme={theme} paused={paused} />
                <span className="name">{id}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid">
          {(Object.keys(IDENTITY_EXPRESSIONS) as IdentityExpressionId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={identityExpr === id ? 'cell sel' : 'cell'}
              onClick={() => setIdentityExpr(id)}
            >
              <IdentityPresence name={who} expression={IDENTITY_EXPRESSIONS[id]} size={88} title={`${who} · ${id}`} />
              <span className="name">{id}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
