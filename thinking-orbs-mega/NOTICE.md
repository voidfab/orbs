# Attribution

`thinking-orbs-mega` is a derivative of **thinking-orbs**. It is **not** the official package.

Source **URLs** (for credit and for later re-checks) live in [SOURCES.md](./SOURCES.md). This file is the license-facing summary.

## Upstream (required)

**thinking-orbs 0.3.1** — https://github.com/Jakubantalik/thinking-orbs  
Commit `e04f3e87075faa6dd7d42f3073198434d26ba730` (2026-08-11).  
MIT © Jakub Antalik.

The official `ModeFrame` → `OrbFrame` engine, golden vectors (`spec/orbs-golden.json`), `thinking-orbs/engine` export, and React Native + Skia port are that work. The original nine painters at sizes 20 and 64 are unchanged.

Live upstream demo: https://orbs.jakubantalik.com

## Extracted into the TypeScript engine

These remotes contributed geometry, tunings, or palettes adapted onto the official engine. Full URLs and “what to watch” are in [SOURCES.md](./SOURCES.md).

| Remote | What this tree took |
|---|---|
| https://github.com/maslinedwin/thinking-orbs | Extra verbs |
| https://github.com/Ogyeet10/thinking-orbs-animated | Polar morph, `idle` |
| https://github.com/Bardolog1/thinking-orbs-colorized | OkLab ramps |
| https://github.com/FrancoEscob/gpui-thinking-orbs | focusing / pondering / recalling |
| https://github.com/MichaelWDanko/thinking-orbs-swift | 128px table |
| https://github.com/Mvkweb/solid-thinking-orbs | hypercube / conjuring / assembling / … |
| https://github.com/rshelnutt/morphing-orbs | SVG renderer |
| https://github.com/Schoolees/thinking-orbs | responding, contour, spring |
| https://github.com/alainux/orb | presence / cognition / speaking |
| https://github.com/amunozdev/voiceorbs | skins, iris / neon |
| https://github.com/nelay04/Callisto | same voice-orb family |

Several first-drop zips still pointed at Jakub’s remote (size, canvas-decoupling, color-expansion, transitions, cubed). They were branches of upstream, not separate remotes.

## Vendored hosts

See [SOURCES.md](./SOURCES.md) and [ports/README.md](./ports/README.md). Host trees stay in `ports/` for local review and are **not** in the npm tarball.

## Original to this megafork

**Conversation Seam** (`src/seam/`, demo `/seam.html`) — Fox9. Dual-channel STT → Brain → TTS field. Layouts conduit / halo / well are not fork extracts.

## License

MIT. Include this NOTICE, [SOURCES.md](./SOURCES.md), and the LICENSE copyright lines with any distribution. Do not publish this package under the name `thinking-orbs`.
