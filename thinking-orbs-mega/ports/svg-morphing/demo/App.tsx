import { useEffect, useState } from "react";
import { Orb, type OrbState } from "../src/index.js";

const STATES: OrbState[] = [
  "working", "searching", "solving", "listening", "connecting",
  "weaving", "composing", "breathing", "shaping",
];

const BLURBS: Record<OrbState, string> = {
  working: "particles on tilted orbits",
  searching: "a scan meridian sweeps a dotted globe",
  solving: "bands scramble, then click back solved",
  listening: "a waveform rolls through the rings",
  connecting: "a constellation wires itself",
  weaving: "three strands plait around the sphere",
  composing: "an undulating multi-band sash",
  breathing: "a ring slowly morphing",
  shaping: "dotted outline: circle → triangle → square",
};

/** The hero: cycles states on a timer so the morph is the first thing seen. */
function MorphHero() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % STATES.length), 2800);
    return () => clearInterval(id);
  }, [auto]);

  const state = STATES[index]!;
  return (
    <section className="hero">
      {/* display 176 — over 2.5× the tuned size. SVG output means this is
          exactly as crisp as the 64px original; zoom the page and it stays so. */}
      <Orb state={state} size={64} display={176} morphMs={650} />
      <p className="hero-state">
        <span className="mono">{state}</span> — {BLURBS[state]}
      </p>
      <div className="picker" role="group" aria-label="Pick a state">
        {STATES.map((s, i) => (
          <button
            key={s}
            type="button"
            className={s === state ? "chip active" : "chip"}
            onClick={() => { setAuto(false); setIndex(i); }}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className={auto ? "chip auto active" : "chip auto"}
          aria-pressed={auto}
          onClick={() => setAuto((v) => !v)}
        >
          auto-cycle
        </button>
      </div>
    </section>
  );
}

export function App() {
  return (
    <main>
      <header>
        <h1>morphing-orbs</h1>
        <p className="tagline">
          The <a href="https://orbs.jakubantalik.com">thinking-orbs</a> animations
          on SVG — crisp at any size, zoom, and device-pixel-ratio — with smooth
          morphs between states. Watch the dots travel:
        </p>
      </header>

      <MorphHero />

      <section className="grid-section">
        <h2>All nine states</h2>
        <div className="grid">
          {STATES.map((s) => (
            <figure key={s}>
              <Orb state={s} size={64} />
              <figcaption className="mono">{s}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sizes">
        <h2>Any display size</h2>
        <p>
          One tuned design, rendered as vectors — <code>display</code> takes any
          value with zero blur:
        </p>
        <div className="size-row">
          {[20, 32, 64, 96, 128].map((d) => (
            <figure key={d}>
              <Orb state="connecting" size={64} display={d} />
              <figcaption className="mono">{d}px</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="colors">
        <h2>Any color</h2>
        <p>
          The orb inks in <code>currentColor</code> — dots and connection lines,
          depth intact. Set a text color anywhere above it and it follows:
        </p>
        <div className="color-row">
          {["#08fef2", "#ff338b", "#a252ee", "#ffd23f"].map((c) => (
            <figure key={c} style={{ color: c }}>
              <Orb state="connecting" size={64} display={128} />
              <figcaption className="mono">{c}</figcaption>
            </figure>
          ))}
        </div>
        <p className="cycle-note">
          And because it is just CSS color, it animates like CSS color — one
          keyframe rule, no props:
        </p>
        <figure className="color-cycle">
          <Orb state="connecting" size={64} display={128} />
          <figcaption className="mono">animation: color-cycle 9s infinite</figcaption>
        </figure>
      </section>

      <footer>
        <p>
          <a href="https://github.com/rshelnutt/morphing-orbs">morphing-orbs</a> ·
          MIT © Rob Shelnutt · animations by{" "}
          <a href="https://github.com/Jakubantalik/thinking-orbs">thinking-orbs</a>{" "}
          (MIT © Jakub Antalik)
        </p>
        <pre className="mono install">npm install morphing-orbs</pre>
      </footer>
    </main>
  );
}
