# thinking-orbs-mega

Megafork of **[thinking-orbs 0.3.1](https://github.com/Jakubantalik/thinking-orbs)** (`e04f3e8`). This is **not** the official `thinking-orbs` package.

The official `ModeFrame` → `OrbFrame` engine, `thinking-orbs/engine` export, golden spec, and React Native + Skia port stay the foundation. Fork extras sit on top without rewriting the original nine painters. **Conversation Seam** is original to this tree.

Terms: [GLOSSARY.md](./GLOSSARY.md) · Inventory: [FORKS.md](./FORKS.md) · Credit: [NOTICE.md](./NOTICE.md) · Remotes: [SOURCES.md](./SOURCES.md)

Dotted thought-orb indicators for AI and agent UIs. Plain 2D canvas — no WebGL, no `ctx.filter`. Official live demo of the upstream nine: [orbs.jakubantalik.com](https://orbs.jakubantalik.com).

## Attribution

Upstream **thinking-orbs** is MIT © [Jakub Antalik](https://github.com/Jakubantalik/thinking-orbs). This megafork keeps that license and copyright, and adds a Fox9 copyright for Seam and integration work.

Extracts and vendored hosts are listed in [NOTICE.md](./NOTICE.md). Canonical GitHub remotes — for attribution and to re-check later commits — are in [SOURCES.md](./SOURCES.md). Do not publish this package under the name `thinking-orbs`.

## Install

Not on npm until a maintainer publishes. From a git checkout:

```bash
# from a git checkout of this repo
npm install ./thinking-orbs-mega
# or, after npm publish:
# npm install thinking-orbs-mega
```

Peer: React 18+.

## Quick start

```tsx
import { ThinkingOrb } from 'thinking-orbs-mega';

function Status() {
  return <ThinkingOrb state="searching" size={64} />;
}
```

The import path follows the package name. If you alias it to `thinking-orbs` locally (as the review demo does), either name works.

## Official states

Nine verbs, two official sizes (20 inline, 64 avatar). Size 128 uses the Danko Swift `.large` table. Any size 12–256 is accepted; 20 and 64 stay golden-exact.

```tsx
<ThinkingOrb state="working" />     {/* particles on tilted orbits */}
<ThinkingOrb state="searching" />   {/* a scan meridian sweeps a dotted globe */}
<ThinkingOrb state="solving" />     {/* bands scramble, then click back solved */}
<ThinkingOrb state="listening" />   {/* a waveform rolls through the rings */}
<ThinkingOrb state="connecting" />  {/* a constellation wires itself */}
<ThinkingOrb state="weaving" />     {/* three strands plait around the sphere */}
<ThinkingOrb state="composing" />   {/* an undulating multi-band sash */}
<ThinkingOrb state="breathing" />   {/* a ring slowly morphing */}
<ThinkingOrb state="shaping" />     {/* dotted outline: circle → triangle → square */}
```

Theme `auto` | `dark` | `light`. `prefers-reduced-motion` paints a static frame. Extra fork states, palettes, `shape="cube"`, and `variant="contour"` are documented in [FORKS.md](./FORKS.md).

## Conversation Seam

Fox9 overlay for STT → Brain → TTS. Two domains: **internal** (mic) and **external** (speakers). They do not paint each other.

```tsx
import { ConversationSeam, useSeamAudio } from 'thinking-orbs-mega';

function Live() {
  const audio = useSeamAudio();
  return (
    <ConversationSeam
      generation={2}
      phase="speaking"
      variant="conduit"
      inputVolumeRef={{ current: audio.levels.input }}
      outputVolumeRef={{ current: audio.levels.output }}
    />
  );
}
```

- **v1** — globe field. **v2** — closed (2,3) trefoil.
- **conduit / halo / well** — layouts (orb / helix / cube inside), not colourways.
- Auto map: external **RMS** → **wave** on the primary knot; **thinking** (0–1 mock) → **rift** and **rails**.
- `SeamAudio`: demo voice through the default speakers, tab/system tap, mic. Hosts that already know amplitude can pass `inputVolume` / `outputVolume`.

Play: `npm run review` → [http://127.0.0.1:5177/seam.html](http://127.0.0.1:5177/seam.html) (admin sliders on the right).

Full noun/verb list: [GLOSSARY.md](./GLOSSARY.md).

## Ports

Vendored next to the engine, **not** in the npm tarball.

| Host | Path |
|---|---|
| React Native + Skia | [`ports/react-native/thinking-orbs-native`](./ports/react-native/thinking-orbs-native) |
| Swift / AppKit | [`ports/ios/`](./ports/ios) |
| GPUI / Rust | [`ports/gpui`](./ports/gpui) |
| Svelte, Solid, Vue, vanilla, SVG | [`ports/README.md`](./ports/README.md) |

```bash
npm run review              # :5177 — official, gallery, seam, skins
npm run review:ports        # also Solid / Svelte / Universal / SVG / vanilla
```

## Scripts

```bash
npm test            # vitest (official goldens + seam + smoke)
npm run smoke       # tsc --noEmit && vitest
npm run build       # library → dist/
npm run pack:check  # npm pack --dry-run (no publish)
```

`prepublishOnly` runs `smoke` then `build`. Do **not** `npm publish` until the maintainer gives a thumbs-up.

## Accessibility

- `role="img"` and a per-state `aria-label`.
- Reduced motion: static representative frame.
- Shared clock; instances pause when offscreen or hidden.
- Canvas arcs only. Device-pixel-ratio capped at 2.

## License

MIT © Jakub Antalik and Fox9 / voidfab. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md).
