# Fork inventory

**Upstream:** [Jakubantalik/thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) **0.3.1** (`e04f3e8`).

Canonical remotes for attribution and later re-checks: [SOURCES.md](./SOURCES.md).

That release already has the geometry/paint split (`ModeFrame` → `{dots, lines}`), `finalizeFrame`, `thinking-orbs/engine`, golden vectors (`spec/orbs-golden.json`), and an official React Native Skia port. The earlier local zip was **0.2.0** and did not include any of that.

This megafork copies 0.3.1 as the tree, then adds fork extras around it. The original nine painters are untouched; `resolvePreset` at size 20/64 for those states is the official path. Size **128** for those nine uses Danko’s Swift `.large` table (`PRESETS_128`); sizes between 64 and 128 log-lerp 64↔128.

Canonical remotes (watch for later extracts): [SOURCES.md](./SOURCES.md).

Playable review: `npm run review` then open [http://127.0.0.1:5177/review.html](http://127.0.0.1:5177/review.html). Fox9 conversation field: [http://127.0.0.1:5177/seam.html](http://127.0.0.1:5177/seam.html).

## First drop (web forks + GPUI + first Swift)

| Zip / fork | Verdict | What landed |
|---|---|---|
| Official 0.3.1 | **BASE** | Engine, demo, RN Skia, spec/golden |
| size / new-modes interpolation | **EXTRACT** | Any size 12–256; 20/64 stay exact |
| new-modes extra verbs | **EXTRACT** | Adapted via `asFrame(DotBuffer)` |
| colorized + color-exp | **EXTRACT** | OkLab ramps, `registerPalette`, hex shorthand |
| animated | **EXTRACT** | Polar morph, dedicated `idle` |
| transitions | **EXTRACT** | Hover/focus overlay |
| cubed | **EXTRACT** | `shape="cube"` remesh of the original nine |
| GPUI | **VENDOR** + **EXTRACT** | `ports/gpui`; `focusing` / `pondering` / `recalling` |
| Swift / ThinkingOrbsDemo | **VENDOR** | `ports/ios/ThinkingOrbsDemo` |

`connecting` remains the official constellation. The new-modes great-circle is `tracing`.

## Second drop (more Swift + other hosts)

| Artifact | Verdict | Why |
|---|---|---|
| `thinking-orbs-swift-main` | **VENDOR** | `ports/ios/ThinkingOrbs` — SPM, SwiftUI + AppKit, CGContext. Host only. |
| `thinking-orbs-swift-main-alt` (Danko) | **VENDOR** + **EXTRACT** | `ports/ios/ThinkingOrbsKit`. The only TS-worthy extract is the **128px `.large` table**. |
| `thinking-orbs-swift-alt-v2` | **VENDOR** | `ports/ios/ThinkingOrbsKit-v2` — keep for diff; near-duplicate of alt, no extra tunings. |
| netseye demo | **VENDOR** | already at `ports/ios/ThinkingOrbsDemo` |
| svelte | **VENDOR** | `ports/svelte` — faithful 9-state bind |
| solid | **VENDOR** + **EXTRACT** | hypercube / conjuring / assembling / building / evolving / spinning |
| universal | **VENDOR** | `ports/universal` — Vue + web component + vanilla |
| morphing-orbs | **VENDOR** + **EXTRACT** | `renderer="svg"` |
| schoolees | **VENDOR** + **EXTRACT** | `responding`; contour family deferred |
| RN views (shrit1401) | **VENDOR** | `ports/react-native-views` (no-Skia alternative) |
| pi-thinking-orbs | **VENDOR** + **WIRED** | `ports/pi` now paints the megafork engine. `pi install .` |

Skipped from those Swifts: Ripul-style full engine clones, AppKit/tint/`scenePhase` host glue.

Svelte now rebinds to the megafork `ModeFrame` engine (plus `color`, `static`, `variant`). Schoolees **contour** family + pointer **spring** live on `ThinkingOrb` (`variant="contour"`, `interaction.hover.spring`).

## Fourth drop (last aesthetic apps + two extra visualizers)

Later drops live in `_new/` (gitignored, not published). Harvest pass finished.

| Artifact | Verdict | What landed |
|---|---|---|
| `voiceorbs` | **EXTRACT** skins + palettes | `particles` field, `wave ring`; palettes `iris` / `neon` |
| `voice-orb-prototype` | **EXTRACT** skin | `polar ticks` + thinking mini-orbits. Skip ribbon wings / product chrome |
| `glass-voice-orb-study` | **SKIP** engine | WebGL glass. 2D stand-in is `soft blob` |
| `tbpn-voice-orb` | **EXTRACT** skin | `broadcast` — 3 rings, 18 polar ticks, 16 core bars. Skip T-logo / CSS glow |
| `wisp` | **SKIP** | Swift GPT-Live clone |
| `akari` | **EXTRACT** geometry | `relaying` / `synapse` — proximity web + traveling electrons |
| `bigkijimon-voiceorb` | **SKIP** product; **EXTRACT** | Same synapse family: spokes + listen-in / speak-out polarity (in the synapse skin). WebGL blob skipped |
| `jarvis-demo` | **SKIP** | WebGL ferrofluid variants A–D |
| `Nour` / `ClairVoiceAI` | **SKIP** | Full products / Three.js glass |
| `3d-visualizer` / `audible-visuals` | **SKIP** | Old Three.js audio visualizers |

Skins tab shows **idle / listening / thinking / speaking** for each: particles, polar ticks, wave ring, live glow, call pulse, soft blob, synapse, broadcast, stardust.

## Third drop (more aesthetic / voice products)

Policy: extract only dotted 2D ideas that fit `ModeFrame`. Skip WebGL, Three.js, shaders, `ctx.filter` glow, ferrofluid, avatars, and full assistant apps. Sidecar **playable web demos** are kept so the skipped looks are still reviewable.

| Artifact | Tech | Verdict | Why |
|---|---|---|---|
| alainux Orb / VoiceOrb / Callisto / VoiceX | mixed | **SKIP** product; **EXTRACT** already landed | `presence` / `cognition` / `speaking`, palettes `callisto` + `voice`, `volume` |
| `codex-voice-orb-study` | WebGL 1 + 2D fallback | **SKIP** engine; **DEMO** | Filled noise blob, not dots. Play at `/aesthetics/codex-voice-orb/` |
| `AuraRTC` | Canvas 2D | **SKIP** engine; **DEMO** | Glow core + particles. Pulse rings already exist as `waiting` (sonar). Play at `/aesthetics/aurartc-orb.html` |
| `hermes-desktop-voice-hud` | Canvas 2D glow | **SKIP** engine; **EXTRACT** palette | Soft white→periwinkle sphere. Palette `live`. Play at `/aesthetics/hermes-live.html` |
| `ada` | Zig + sokol shader | **SKIP** | Desktop avatar product, fragment-shader orb |
| `axis-agent` | Three.js + MediaPipe | **SKIP** | Holographic wireframe product, bloom/CA |
| `loqui` | Three.js Mesh/Stardust | **SKIP** product; **EXTRACT** skin | `stardust` — fib shell, warm lower rim, flecks. Skip Mesh / PWA |
| `lyns-voice` | Three.js HUD | **SKIP** | Oracle avatar product. Themes already covered (`aurora` / `ember`) |
| `vox-voice-assistant` / `vox-assistant-enhanced` | OGL / R3F liquid glass | **SKIP** | Shader iridescence + ferrofluid, not dotted |

## Original megafork work (not extracted)

**Conversation Seam** (`src/seam/`, demo `/seam.html`) is Fox9-original. Terms live in [GLOSSARY.md](./GLOSSARY.md).

- v1 — globe field. v2 — closed integer (2,3) trefoil.
- Internal (mic) lattice vs external (speakers) knot. Energy does not cross.
- Layouts: conduit (orb), halo (helix), well (cube).
- Auto map: external RMS → **wave** on the primary knot; thinking → **rift** + **rails**. Motes are particles, not rails.
- `SeamAudio` — demo voice, speaker tap, mic; RMS / peak / bands / onset.

`npm run smoke` typechecks and runs goldens + seam/audio smokes.

## Review

```bash
cd thinking-orbs-mega
npm install
npm run review          # mega + aesthetic sidecars on :5177
npm run review:ports    # also Solid :5178 Svelte :5179 Universal :5180 SVG :5181 Vanilla :5182
```
