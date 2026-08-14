# morphing-orbs

The [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) animations,
rendered on **SVG** instead of canvas — pixel-crisp at any size, browser zoom,
and device-pixel-ratio — with **smooth morph transitions** between states: dots
travel to their counterparts in the next animation instead of hard-swapping.

[Live demo](https://rshelnutt.github.io/morphing-orbs/) ·
[Original project](https://orbs.jakubantalik.com) by Jakub Antalik

## What you get

- **Vector output.** The orb renders as SVG, so the compositor rasterizes it
  at its true resolution — crisp at every size, zoom level, and DPR, displayed
  at any CSS dimension you like.
- **Morphing.** When `state` changes, each dot glides to a partner dot in the
  incoming animation over an eased window; connection lines dissolve and
  re-form. Set `morphMs={0}` for a hard swap.
- **Inherent color.** Dots and lines ink in `currentColor` with depth carried
  by opacity — theming and coloring are ordinary CSS.
- **Exact animations, by construction.** The engine's math runs verbatim every
  frame; a test suite pins that its full output is captured, so the rendering
  cannot silently drift.

One shared clock keeps every mounted orb in phase, offscreen and hidden-tab
instances pause, and `prefers-reduced-motion` renders a static frame.

## Color

The orb inks in `currentColor` — dots and connection lines alike, with the
engine's depth shading carried by per-primitive opacity. No configuration:
it inherits the surrounding text color, so the default look follows your
theme automatically, and coloring it is any ordinary CSS color mechanism:

```tsx
<Orb state="connecting" className="text-teal-500" />
<Orb state="working" style={{ color: "#00b8af" }} />
```

## Install

```bash
npm install morphing-orbs react
```

## Quick start

```tsx
import { Orb } from "morphing-orbs";

function Status({ busy }: { busy: boolean }) {
  return <Orb state={busy ? "working" : "breathing"} size={64} />;
}
```

When `state` changes, the orb morphs. That's it.

## States

Nine states, each a hand-tuned animation:

`working` · `searching` · `solving` · `listening` · `connecting` · `weaving` ·
`composing` · `breathing` · `shaping`

## Props

```tsx
<Orb
  state="connecting"   // which animation (default "working")
  size={64}            // tuning preset: 64 | 20 — dot counts/sizes/speed
  display={40}         // rendered CSS size — ANY value; defaults to `size`
  speed={1.5}          // multiplier on the preset's baked speed
  morphMs={450}        // morph window on state change; 0 = hard swap
  paused={false}       // freeze on the current frame
  aria-label="Thinking…"
/>
```

`size` picks which of the two tuned designs drives the animation — dot
counts, dot sizes, and speed; `display` sets how large it renders. The output
is vector, so `display` can be anything without costing sharpness.

## How it works

The animation engine paints through 2D-context primitives — arcs and line
segments. Each frame runs it against a recording context that captures every
primitive with its exact geometry, ink, and paint order, and the recording
commits to a pool of SVG `<circle>`/`<line>` nodes. A dev-mode tripwire warns
if a primitive ever arrives that the recorder doesn't model, and the test
suite fails on it.

Morphing works on the recorded data: both states render their true frame,
dots pair index-wise (the longer set wraps onto the shorter, so surplus dots
converge into their partners), positions and ink interpolate through an
eased window, and lines crossfade out then in.

## Attribution

The animations — all nine states, their tuning, and the engine that computes
them — are [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) by
[Jakub Antalik](https://jakubantalik.com) (MIT), consumed as a dependency.
This project contributes the SVG renderer and the morphing layer.

## License

MIT © Rob Shelnutt — see [LICENSE](LICENSE).
