# Source remotes

URLs only. Later review drops in `_new/` stay local and are **not** part of a GitHub or npm release.

Use this file to (A) attribute and (B) re-check a remote before pulling a later extract. Verdicts stay in [FORKS.md](./FORKS.md).

`Watch` means “look here for later commits.” `No` means we skipped the product or the zip had no independent remote.

## Upstream

| Remote | Role |
|---|---|
| https://github.com/Jakubantalik/thinking-orbs | Official 0.3.1 base (`e04f3e8`). Watch. |

Several first-drop zips (`main-size`, `engine-canvas-decoupling`, `feat-color-expansion`, `feat-state-transitions`, `cubed`) still declare that same Jakub remote in `package.json`. They were local / task branches, not separate GitHub repos. Re-check **Jakubantalik/thinking-orbs**, not a second URL.

## Extracted into the TypeScript engine

| Remote | What we took |
|---|---|
| https://github.com/maslinedwin/thinking-orbs | Extra verbs (`tracing`, `queuing`, `syncing`, …) |
| https://github.com/Ogyeet10/thinking-orbs-animated | Polar morph, dedicated `idle` |
| https://github.com/Bardolog1/thinking-orbs-colorized | OkLab ramps, `registerPalette` |
| https://github.com/FrancoEscob/gpui-thinking-orbs | `focusing`, `pondering`, `recalling` |
| https://github.com/MichaelWDanko/thinking-orbs-swift | 128px `.large` table (`PRESETS_128`) |
| https://github.com/Mvkweb/solid-thinking-orbs | `hypercube`, `conjuring`, `assembling`, `building`, `evolving`, `spinning` |
| https://github.com/rshelnutt/morphing-orbs | `renderer="svg"` |
| https://github.com/Schoolees/thinking-orbs | `responding`; contour + pointer spring |
| https://github.com/alainux/orb | `presence`, `cognition`, `speaking`; palettes `callisto`, `voice` |
| https://github.com/amunozdev/voiceorbs | skins + palettes `iris`, `neon` |
| https://github.com/nelay04/Callisto | same voice-orb family as alainux (palette / presence overlap) |

## Vendored hosts (in `ports/`, not the npm tarball)

| Remote | Port path |
|---|---|
| https://github.com/Jakubantalik/thinking-orbs (official RN Skia) | `ports/react-native/thinking-orbs-native` |
| https://github.com/Shrit1401/react-native-thinking-orbs | `ports/react-native-views` |
| https://github.com/everlof/thinking-orbs-swift | `ports/ios/ThinkingOrbs` |
| https://github.com/MichaelWDanko/thinking-orbs-swift | `ports/ios/ThinkingOrbsKit` |
| https://github.com/ripulio/thinking-orbs-swift | `ports/ios/ThinkingOrbsKit-v2` |
| zip `thinking-orbs-swift-netseye-ThinkingOrbsDemo-main` | `ports/ios/ThinkingOrbsDemo` — no `repository` field in the zip; treat as netseye’s ThinkingOrbsDemo drop |
| https://github.com/FrancoEscob/gpui-thinking-orbs | `ports/gpui` |
| https://github.com/alexisgvrcia/svelte-thinking-orbs | `ports/svelte` |
| https://github.com/Mvkweb/solid-thinking-orbs | `ports/solid` |
| https://github.com/wangbin3162/thinking-orbs-universal | `ports/universal` |
| https://github.com/rshelnutt/morphing-orbs | `ports/svg-morphing` |
| https://github.com/Schoolees/thinking-orbs | `ports/vanilla` |
| https://github.com/ringoshiina/pi-thinking-orbs | `ports/pi` |

## Inspired / sidecar only (not engine)

| Remote | Notes |
|---|---|
| https://github.com/Aimer779/codex-voice-orb-study | Demo only: `/aesthetics/codex-voice-orb/` |
| https://github.com/JairFC/AuraRTC | Demo only: `/aesthetics/aurartc-orb.html` |
| https://github.com/PabloTheThinker/hermes-desktop-voice-hud | Palette `live` + `/aesthetics/hermes-live.html` |

`voice-orb-prototype` (polar ticks skin) had **no repository URL** in the drop. Re-find it from the zip name `voice-orb-prototype-main` if you need to watch it.

## Skipped products (do not extract; URLs only if we had them)

| Remote | Why skipped |
|---|---|
| https://github.com/abhi-wan-kenobi/loqui | Full voice PWA |
| https://github.com/dburks-svg/lyns-voice | Three.js HUD product |

Other skipped zips (`ada`, `akari`, `axis-agent`, `jarvis-demo`, `Nour`, `ClairVoiceAI`, `tbpn-voice-orb`, `wisp`, `vox-*`, `VoiceX`, `glass-voice-orb-study`, `3d-visualizer`, `audible-visuals`) had no trustworthy `repository` field in the drop. Do not invent remotes.

## How to re-check

```bash
# example: did Solid add another verb?
git ls-remote https://github.com/Mvkweb/solid-thinking-orbs.git HEAD
```

If a remote moved, update this file and [NOTICE.md](./NOTICE.md). Do not copy the remote’s tree into the megafork until FORKS has a new extract/skip verdict.
