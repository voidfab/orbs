# Realms — agentic-state visualization beyond orbs

The megafork in `thinking-orbs-mega/` is one family: dotted 2D `ModeFrame` → `{dots, lines}`. Later zip drops live in `_new/` (gitignored). After a source is harvested into `presence/` or the megafork, its zip moves to `_processed/` (also gitignored).

Orb verdicts stay in [`thinking-orbs-mega/FORKS.md`](thinking-orbs-mega/FORKS.md). This file is the expansion map.

Policy change from the last harvest: **avatars, faces, terminal glyphs, meters, and CSS/WAAPI orbs are in scope.** WebGL / Three.js / shaders / Metal stay **ports or sidecar demos**, not the portable geometry contract. Full DAWs, dictation apps, and demoscene restorations stay **SKIP** (product) unless a specific visual primitive is named below.

## Shared bus (extract first)

Every interesting library already paints from a small lifecycle, then layers identity and audio on top. Do not fork a new verb list per realm. One bus, many bodies.

| Axis | Values seen in this drop | Who uses it |
|---|---|---|
| **Conversation phase** | `idle` · `listening` · `thinking` · `speaking` · `asleep` | Orbz, Conversation Seam, voice skins, Aurora moods |
| **Agent lifecycle** | `registered` · `working` · `waiting` · `done` · `idle` | AgentPet (`AgentState`) |
| **Terminal face** | `idle` · `thinking` · `working` · `done` · `err` | claude-terminal-face (Ghostty shader + OSC 12) |
| **Turn / tool events** | session · turn · llm · tool · retry · subagent · error | Hitch Face (`eventMap` → CSS expression classes) |
| **Identity pose** | `idle` · `happy` · `sad` · `mad` · `thinking` · … | Blobatar (`blobatar/expression`) |
| **Grok silhouette** | `circle` · `egg` · `squircle` · `pill` · `triangle` · `hexagon` · `cloud` · `drop` | grokbot-wall SDF styles; bloub catalog overlaps |

`waiting` (needs user / permission) is the gap the orb engine barely covers. AgentPet and Hitch Face both treat it as first-class. That is the first new bus value, not a new painter.

## Realms

### 1. Orb (already shipping)

Canonical: `thinking-orbs-mega` ModeFrame. Conversation Seam is the dual-channel overlay.

**New in this drop**

| Artifact | Verdict | Why |
|---|---|---|
| `orbz-staging` (`@neongate-ai/orbz`) | **EXTRACT** contract + **DEMO** skin | Web Component `<orb-z>`. States `idle/listening/thinking/speaking/asleep`. Six CSS/WAAPI layers (`root, aura, ring, field, core, highlight`) driven from `orbz.config.json`. Not dots — a **layered CSS orb port**. Speech is explicit (`startTalking()`), which matches Seam. MIT. |
| `codeorb-master` | **SKIP** product | JARVIS-style Three.js **codebase** graph. Wrong subject (repo topology, not agent state). |
| `hypercube-main` | **EXTRACT** | **Landed:** n-cube + Gray comet as `HypercubePresence`. XR/Schlegel chrome skipped. MIT. |
| `ENTHEA-main` | **SKIP** engine; **DEMO** later | Single-file WebGL2 psychedelic synth, 29 “visionary modes”. Spectacle, AGPL, not a state indicator. |
| `bloom-main` | **SKIP** for orbs | Trigger→menu morph (button becomes panel). UI chrome, not presence. |

### 2. Face / silhouette

A filled body + two eyes. State is a **pose**, not a particle field. This is the Grok Bot language.

| Artifact | Verdict | Why |
|---|---|---|
| `bloub-main` | **EXTRACT** (first face harvest) | SVG recreation of the xAI bot: **one black silhouette** + **two white eyes**, 14 catalog states measured off the reference video. States: `idle, thinking, wink, wide, alert, notify, exclaim, sleep, egg, hexagon, play, orbit, burst, comet` (+ `swirl` as UI-only). Engine is pose interpolation (`Pose` → silhouette radii, gaze, eye capsules, dots/arcs). No animation library. MIT. Repo: `jeremy-prt/bloub`. |
| `grokbot-wall-main` | **EXTRACT** silhouettes + brand ramps | **Landed:** brand hexes, idle motions, form→bloub shape map. Meetup wall / Luma / email queue skipped. ASCII/WebGL shader not copied. |
| `grok-bot-0.18-reconstructed-main` | **WATCH** host | Unofficial reconstruction of the shipped macOS Grok Bot app. Too much product chrome to extract; use as a **reference for official poses**, not a source tree. |
| `blobatar-main` | **EXTRACT** identity layer | Deterministic geometric “blobatar” from any name. Silhouettes gen1 `round/organic/boxy/nub/cloud/sun`, gen2 adds `capsule/triangle/hexagon/droplet`. Expressions are a **separate axis** from idle breath: `idle, happy, sad, mad, surprised, wink, sleepy, smug, unsure, scared, love, shy, sick, thinking`. Pose-only — never adds a mouth. MIT. This is **who**, not **what the agent is doing**. |
| `boring-avatars-master` | **VENDOR** identicon | SVG from username + palette. No state. Fine as a fallback identity mark. |
| `avatar-main` (Vercel) | **SKIP** | Gradient identicon. Covered by boring-avatars / blobatar. |
| `hitch-face-main` | **EXTRACT** event→expression map; **VENDOR** BMO chrome | BMO widget. Hitch events (`turn.assistant_started`, `tool.permission_requested`, `error.reported`, …) map to CSS expression classes. The **mapper** is the harvest; the Adventure Time body is a skin. |

### 3. Companion / pet

Desktop characters that **react** to the bus. Do not clone the Tamagotchi products. Steal the mapper and the care/wait semantics.

| Artifact | Verdict | Why |
|---|---|---|
| `agentpet-main` | **EXTRACT** `AgentState` + hook payloads | Normalised lifecycle independent of Claude/Codex/Gemini/Cursor/Grok/Pi. `registered / working / waiting / done / idle`. This is the bus we should speak. Pets, XP, and sprite catalogs stay in their app. MIT. |
| `PawPause-main` | **WATCH** | Pixel companion for breaks, focus, hydration, **agent activity nudges**. Product; glossary is useful. |
| `omagotchi-master` | **SKIP** product | Full Tamagotchi (egg→ace/gremlin, window climbing). Fun, not a state indicator. |
| `omarchy-googly-eyes-main` | **SKIP** gag | Googly eyes overlay. |
| `companion-tts-main` | **SKIP** product | Floating TTS of Claude output. Audio host, not a visual family. |
| `Talkify-main` | **SKIP** | Notch dictation app. |
| `cc-beeper-main` | **SKIP** | Claude Code pager. UX host. |

### 4. Terminal / textmode

Agent state as glyphs in a character grid. Natural fit for CLI hosts (Pi, Grok Build, Ghostty).

| Artifact | Verdict | Why |
|---|---|---|
| `claude-terminal-face-main` | **EXTRACT** protocol | Ghostty custom shader draws an ASCII/dot-matrix face. Claude hooks write **OSC 12 (cursor colour)** as a sidechannel. Shader nearest-neighbours a 5-colour palette → `idle/thinking/working/done/err`. SDF morph between phases. This is how a terminal host should learn state without a pane. |
| `textmode.js-main` | **EXTRACT** grid contract; **SKIP** WebGL engine | Glyph Cast (Seal / Hyphae / Beat) now paints the portable `CharacterGrid`. Corona stays 3D in Glyph. Add-ons (overlay / filters / synth / accurate / export) stay local. MIT. |
| `omacy-main` + vendored `ttfx` | **EXTRACT** effect names; **SKIP** screensaver host | Metal ASCII engine. ttfx effects (`matrix, decrypt, beams, rings, swarm, waves, orbittingvolley, …`) are a catalog of **text-field verbs**. Host is a macOS screensaver. |
| `cliamp-plugin-{vu-meter,led-burst,block-burst,sine-rainbow,reverb}` | **EXTRACT** meter drawings | Terminal spectrum visuals in **Unicode braille**. Analog needles, LED tiers, nested bursts, overlapping sines. Perfect for a CLI “speaking/listening” skin. |
| `theattyr-main` | **WATCH** | Livecoding terminal theatre. Later. |
| `prism-main` TUI | **WATCH** | Desktop analyzer with a C++ TUI of the same scopes. |

### 5. Glyph / icon / sigil

Toolbar-scale state. Morphicons was already queued; this drop confirms the family.

| Artifact | Verdict | Why |
|---|---|---|
| `morphicons-main` | **EXTRACT** (not for orb blends) | Stroke-icon morph with spring physics, zero runtime deps. Bindings for React/Vue/Svelte/RN. Use for **tool/status icons**, not ModeFrame polar blends. MIT. |
| `respinner-main` | **VENDOR** | Classic SVG spinners (wave, bounce, copper, …). Loading-only. |
| `sigils-main` (`three-sigils`) | **DEMO** | Stroke → relief field → chrome Three/WebGPU mesh. Beautiful, 3D, not inline. |
| `dialkit-main` | **SKIP** | Parameter tweak UI + timeline. Authoring chrome. |
| `pasito-main` | **SKIP** | Stepper animation. |

### 6. Wave / meter / glow

Audio-reactive and “Apple Intelligence” presence. Conversation Seam already has RMS/onset; this drop is **surfaces**.

| Artifact | Verdict | Why |
|---|---|---|
| `waveform-component-main` | **EXTRACT** frame contract | Headless: canonical waveform / envelope / spectrum / meter / band-energy frames → Canvas 2D, SVG, DOM/CSS, WebGL2. No `window` at module scope. This is how Seam should grow **renderer-agnostic audio frames**. MIT. |
| `swift/Waveform-main` (AudioKit) | **VENDOR** native | GPU SwiftUI waveform. iOS/macOS port later. |
| `swift/MetalAudioVisualizer-master` | **VENDOR** | Metal audio viz. |
| `swift/Aurora-main` | **EXTRACT** mood table | Apple Intelligence glow ring + shimmer text. Moods: `neutral, listening, thinking, error, success` (thinking slows the ring, listening speeds it). Metal. Native glow port. |
| `swift/beam-main` | **VENDOR** | Animated Metal border beam on any SwiftUI view. |
| `astra-dev` / `prism-main` | **SKIP** product; **WATCH** scope list | Desktop players/analyzers: oscilloscope, spectrogram, spectrum, vectorscope, VU, LUFS, waveform. The **scope set** is the vocabulary; the Electron shells are not. |
| `beats-visualiser-main` | **SKIP** | SuperCollider + wasm music viz. |
| `audiotype-main` | **DEMO** | p5 audio-reactive tricolor type. Fun speaking skin, not a library. |
| `cuelume-main` | **VENDOR** SFX | 17 synthesized UI sounds, no files. Pair with visual state changes. |
| `uisfx-main` | **VENDOR** SFX | Sample packs. Heavier than Cuelume. |

### 7. Field / livecoding / demoscene

Generative fields as a **thinking** skin, not a product.

| Artifact | Verdict | Why |
|---|---|---|
| `hydra-synth-main` / `hydra-main` / `Fun-Hydra-Patterns` | **DEMO** | Video synth. Could drive a full-bleed “cognition” backdrop. Do not take over the indicator. |
| `strudel-main` / `flok-main` / `sonic-pi-dev` / `conjurer-main` | **SKIP** as hosts | Livecoding workstations. Keep as reference for OSC-driven visuals. |
| `etudes-master` | **WATCH** | Small Canvas generative études (spinning circles, etc.). Portable ideas. |
| `screamer-main` / `poser-main` / `tilt-main` / `cdak-main` | **SKIP** for now | Shader languages / 4k intro ports. |
| `scenesat/*` + `SecondReality-*` | **SKIP** | Demoscene restorations (Second Reality, Tesla, Descent3, …). Spectacle archive, not agent UI. |
| `three-nebula-master` | **WATCH** | Three.js particle engine if we ever do a 3D particle port. |
| `three-retropass-main` | **VENDOR** | Pixel/quantize postpass. |
| `PhotonicsSim-main` | **SKIP** | Laser physics lab. |
| `oil-motion-main` / `open-motion-main` | **WATCH** skills | Agent skills for generating motion, not runtime indicators. |

### 8. UI kits / skills (not realms)

| Artifact | Verdict | Why |
|---|---|---|
| `23rd.dev-main` / `Nexvyn-ui-master` / `threeui-main` / `toolcraft-main` / `Skills-main` | **SKIP** | Component registries and agent skill packs. Useful to humans, not a presence language. |
| `freya-main` | **SKIP** | Rust GUI toolkit. |
| `react-native-skia-yoga-main` | **WATCH** | Skia layout — maybe later for the RN port. |
| `jarvis-OS-main` | **SKIP** | Full assistant OS. |

### 9. Audio engines (do not extract)

`Tone.js`, `openDAW`, `opendaw-headless`, `AudioMass`, `audiotool` (1.6 GB), `supercollider`, `librosa`, `pydub`, `nsynth`, `HachiTune`, `tr-909`, `tonematrix`, `pipeorgan`, `synth-designer`, `synthcity`, `radar-main` (audio game), `ZLSpectrumEqualizer`, `web-audio-api-automator`, `wavebuilder`, `wavesurfer` (Python Jupyter), `waveform-main` (macOS dictation — different from AudioKit Waveform).

Seam already analyses RMS / bands / onset. If we need a better analyser, **waveform-component** + the existing `SeamAudio` graph is the path. Do not vendor a DAW.

## First harvest order

Usable package: [`presence/`](presence/). Review: `cd presence && npm run review` → http://127.0.0.1:5188/review.html

Harvested zip drops live in `_processed/`. DAW and demoscene archives live in `_later/` (look at later).

| # | Item | Status |
|---|---|---|
| 1 | State bus (`PresenceSnapshot`, duplex + tools) | **landed** in `presence/src/bus` |
| 2 | Face (bloub) + 14-pose goldens | **landed** in `presence/src/face` |
| 3 | Orb adapter onto thinking-orbs-mega | **landed** (`toOrbState` + `OrbPresence`) |
| 4 | Meter + terminal sketches on the same bus | **landed**; 0.3.0 adds waveform/spectrum + OSC 12 |
| 5 | Identity (blobatar) | **landed** in `presence/src/identity` |
| 6 | CSS orb port (orbz layers) | **landed** in `presence/src/css-orb` |
| 7 | morphicons toolbar glyphs | **landed** in `presence/src/glyph` |
| 8 | Meter frames + OSC 12 | **landed** (waveform/spectrum frames; OSC 12 encoder) |
| 9 | Aurora glow moods | **landed** in `presence/src/glow` (CSS/WAAPI; Metal not copied) |
| 10 | textmode.js character grid | **landed** in `presence/src/textmode` — Glyph Cast Seal / Hyphae / Beat on the portable grid |
| 11 | cliamp braille meters | **landed** in `presence/src/braille` (needles / leds / sines) |
| 12 | Echo afterimage | **landed** in `presence/src/echo` (lagged snapshot; Cast or TTY skin) |
| 13 | Ghost sheet face | **landed** — `GhostPresence` / `shape="ghost"`; all 14 catalog poses; alert/exclaim `!` marks |
| 14 | grokbot-wall brand + motion | **landed** in `presence/src/face/brand.ts` |
| 15 | ttfx text-field verbs | **landed** matrix / decrypt / waves on the portable grid |
| 16 | Cuelume phase cues | **landed** in `presence/src/cue` |
| 17 | boring-avatars identicon | **landed** as IdentityPresence `variant="identicon"` |
| 18 | respinner wave | **landed** on Glyph waiting |
| 19 | hypercube tesseract | **landed** in `presence/src/hypercube` |
| 20 | googly look-vector | **landed** in `GooglyPresence` |
| 21 | vercel avatar gradient | **landed** as IdentityPresence `variant="gradient"` |

Sidecar demos (playable, not engine): hydra backdrop, ENTHEA, audiotype, grokbot-wall ASCII pass.

## Geometry contracts (do not collapse)

| Realm | Portable output | Not |
|---|---|---|
| Orb | `OrbFrame` `{dots, lines}` | CSS blobs, SDF meshes |
| Face | `Pose` (silhouette radii, gaze, eyes, extras) | Particle fields |
| Identity | marks + pose channels from a name | Agent lifecycle |
| Meter | `{waveform, envelope, spectrum, meter, bands}` | Web Audio ownership |
| Terminal | glyph grid + palette key | Ghostty-only shaders |
| Glyph | stroke `d` + morph plan | Filled orbs |
| Glow | mood + 4-anchor palette + CSS ring | Metal shader |
| Textmode | `{cols, rows, cells[]}` | WebGL2 engine |
| Echo | lagged snapshot + decay amount | Ghostty WASM VT |
| Ghost | bloub pose on a sheet silhouette | particle fields |
| Braille | TTY rows of U+2800..U+28FF | cliamp Lua host |

A host picks a realm. The bus is shared. Mixing a Grok face with ModeFrame dots in one canvas is a later composition problem, not a reason to smash the contracts.

## Remotes to record (when we extract)

Do not invent URLs. Confirmed from package.json / README in the zip:

| Remote | Realm |
|---|---|
| https://github.com/jeremy-prt/bloub | Face |
| https://github.com/Alain00/blobatar | Identity |
| https://github.com/NeonGate-AI/orbz | CSS orb |
| https://github.com/ntd4996/agentpet | Bus |
| https://github.com/isoden/claude-terminal-face | Terminal |
| https://github.com/sagebynature/hitch-face | Event map |
| https://github.com/guillermolg00/morphicons | Glyph |
| https://github.com/humanbydefinition/textmode.js | Terminal renderer |
| https://github.com/gianlucamazza/hypercube | Orb substrate |
| https://github.com/tornikegomareli/Aurora | Native glow (mood tables harvested; Metal not copied) |
| https://github.com/AlexZeitler/cliamp-plugin-vu-meter | Braille TTY meters |
| https://github.com/Tonejs/Tone.js | SKIP (engine) |

`waveform-component`, `grokbot-wall`, and several cliamp plugins had no `repository` field in the drop — re-find before SOURCES.md.

## What this is not

- A rewrite of thinking-orbs. The original nine at 20/64 stay golden.
- A 3D engine. Three.js stays in sidecars and ports.
- A pet game. Companions consume the bus; they are not the library.
- A DAW. Audio analysis stays a pair of 0–1 buses plus optional frames.
