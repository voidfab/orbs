import { useEffect, useMemo, useState } from 'react';
import {
  ORB_STATES,
  ThinkingOrb,
  type OrbState,
  type OrbVariant,
  type PaletteName
} from 'thinking-orbs';
import { CallPulse } from './skins/CallPulse';
import { LiveGlow } from './skins/LiveGlow';
import { ParticlesField } from './skins/ParticlesField';
import { SKIN_PHASES, type SkinPhase } from './skins/phase';
import { PolarTicks } from './skins/PolarTicks';
import { SoftBlob } from './skins/SoftBlob';
import { WaveRing } from './skins/WaveRing';

const CONTOURABLE = new Set<OrbState>([
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'composing',
  'breathing',
  'shaping',
  'idle',
  'thinking',
  'responding'
]);

const EXTRACTED = new Set<OrbState>([
  'building',
  'hypercube',
  'conjuring',
  'conjuring_static',
  'assembling',
  'evolving',
  'spinning',
  'responding',
  'presence',
  'cognition',
  'speaking'
]);

type Tab = 'gallery' | 'skins';

export function ReviewApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tab, setTab] = useState<Tab>('gallery');
  const [state, setState] = useState<OrbState>('working');
  const [size, setSize] = useState(64);
  const [speed, setSpeed] = useState(1);
  const [renderer, setRenderer] = useState<'canvas' | 'svg'>('canvas');
  const [variant, setVariant] = useState<OrbVariant>('classic');
  const [volumeOn, setVolumeOn] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [paused, setPaused] = useState(false);
  const [isStatic, setStatic] = useState(false);
  const [palette, setPalette] = useState<PaletteName>('mono');
  const [color, setColor] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'contour'>('all');
  const [skinPhase, setSkinPhase] = useState<SkinPhase>('listening');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const states = useMemo(() => {
    if (filter === 'new') return ORB_STATES.filter((s) => EXTRACTED.has(s));
    if (filter === 'contour') return ORB_STATES.filter((s) => CONTOURABLE.has(s));
    return ORB_STATES;
  }, [filter]);

  return (
    <>
      <header>
        <h1>Review gallery</h1>
        <p>
          Official 0.3.1 engine plus fork extras. Classic dots morph between states. Contour is
          the Schoolees line-cage family. Hover uses the localized pointer spring. Skins are
          isolated aesthetic orbs with real phase mixing. The Fox9 conversation field is{' '}
          <a href="/seam.html">Seam</a>.
        </p>
        <nav className="tabs">
          <button type="button" className={tab === 'gallery' ? 'chip on' : 'chip'} onClick={() => setTab('gallery')}>
            gallery
          </button>
          <button type="button" className={tab === 'skins' ? 'chip on' : 'chip'} onClick={() => setTab('skins')}>
            skins
          </button>
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
        {tab === 'gallery' ? (
          <>
            <label>
              palette
              <select value={palette} onChange={(e) => setPalette(e.target.value as PaletteName)}>
                <option value="mono">mono</option>
                <option value="live">live</option>
                <option value="callisto">callisto</option>
                <option value="voice">voice</option>
                <option value="ocean">ocean</option>
                <option value="ember">ember</option>
                <option value="iris">iris</option>
                <option value="neon">neon</option>
              </select>
            </label>
            <label>
              ink
              <input
                type="text"
                placeholder="#7bf or empty"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 110 }}
              />
            </label>
            <span className="sizes">
              <button type="button" className={variant === 'classic' ? 'chip on' : 'chip'} onClick={() => setVariant('classic')}>
                classic
              </button>
              <button type="button" className={variant === 'contour' ? 'chip on' : 'chip'} onClick={() => setVariant('contour')}>
                contour
              </button>
            </span>
            <label>
              renderer
              <select
                value={renderer}
                onChange={(e) => setRenderer(e.target.value as 'canvas' | 'svg')}
              >
                <option value="canvas">canvas</option>
                <option value="svg">svg</option>
              </select>
            </label>
            <label>
              show
              <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
                <option value="all">all {ORB_STATES.length}</option>
                <option value="new">extracted {EXTRACTED.size}</option>
                <option value="contour">contour {CONTOURABLE.size}</option>
              </select>
            </label>
          </>
        ) : (
          <span className="sizes">
            {SKIN_PHASES.map((p) => (
              <button
                key={p}
                type="button"
                className={skinPhase === p ? 'chip on' : 'chip'}
                onClick={() => setSkinPhase(p)}
              >
                {p}
              </button>
            ))}
          </span>
        )}
        <label>
          size
          <input
            type="range"
            min={20}
            max={128}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          {size}
        </label>
        <span className="sizes">
          {[20, 64, 96, 128].map((n) => (
            <button key={n} type="button" className={size === n ? 'chip on' : 'chip'} onClick={() => setSize(n)}>
              {n}
            </button>
          ))}
        </span>
        <label>
          speed
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          {speed.toFixed(1)}×
        </label>
        {tab === 'skins' ? (
          <label>
            energy
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
        ) : null}
        {tab === 'gallery' ? (
          <>
            <label>
              <input type="checkbox" checked={volumeOn} onChange={(e) => setVolumeOn(e.target.checked)} />
              volume
            </label>
            {volumeOn ? (
              <label>
                amp
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </label>
            ) : null}
            <label>
              <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
              paused
            </label>
            <label>
              <input type="checkbox" checked={isStatic} onChange={(e) => setStatic(e.target.checked)} />
              static
            </label>
          </>
        ) : null}
      </div>

      {tab === 'gallery' ? (
        <>
          <div className="stage">
            <ThinkingOrb
              key={`stage-${variant}`}
              state={state}
              size={size}
              theme={theme}
              palette={palette}
              color={color || undefined}
              variant={variant}
              speed={speed}
              renderer={variant === 'contour' ? 'canvas' : renderer}
              volume={volumeOn ? volume : undefined}
              paused={paused}
              static={isStatic}
              interaction={{ hover: { enabled: true, spring: true } }}
            />
            <div>
              <strong>{state}</strong>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                {variant === 'contour' && CONTOURABLE.has(state)
                  ? 'contour family'
                  : EXTRACTED.has(state)
                    ? 'extracted extra'
                    : 'official / existing'}{' '}
                · {size}px
              </div>
            </div>
          </div>
          <div className="grid">
            {states.map((s) => (
              <button
                key={s}
                type="button"
                className={`cell${s === state ? ' sel' : ''}`}
                onClick={() => setState(s)}
              >
                <ThinkingOrb
                  key={`${s}-${variant}`}
                  state={s}
                  size={48}
                  theme={theme}
                  palette={palette}
                  color={color || undefined}
                  variant={variant}
                  speed={speed}
                  renderer={variant === 'contour' ? 'canvas' : renderer}
                  volume={volumeOn ? volume : undefined}
                  paused={paused}
                  static={isStatic}
                  interaction={{ hover: { enabled: true, spring: true } }}
                />
                <span className="name">{s}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="skin-list">
          {(
            [
              ['particles', 'VoiceOrbs particle field — sphere, ripple, inward pulse, scatter', ParticlesField],
              ['polar ticks', 'Prototype polar ring + thinking mini-orbits', PolarTicks],
              ['wave ring', 'VoiceOrbs waveform ring', WaveRing],
              ['live glow', 'Hermes / ChatGPT Live sphere + phase rings', LiveGlow],
              ['call pulse', 'AuraRTC aurora particles + expanding rings', CallPulse],
              ['soft blob', 'Codex-style 2D blob with phase deform', SoftBlob]
            ] as const
          ).map(([title, blurb, Comp]) => (
            <section key={title} className="skin-row">
              <div className="skin-meta">
                <strong>{title}</strong>
                <span>{blurb}</span>
              </div>
              <div className="skin-phases">
                {SKIN_PHASES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`cell${p === skinPhase ? ' sel' : ''}`}
                    onClick={() => setSkinPhase(p)}
                  >
                    <div className="skin">
                      <Comp size={88} phase={p} level={volume} />
                    </div>
                    <span className="name">{p}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
