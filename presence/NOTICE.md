# Attribution

`presence` is original Fox9 / voidfab work plus harvested engines.

## Face engine (vendored)

**bloub** — https://github.com/jeremy-prt/bloub  
MIT © 2026 Jérémy Perret.

The files under `src/face/bloub/` are that engine: a measured SVG recreation of
the xAI Grok Bot silhouette (one filled body, two eyes, 14 catalog states).
This package does not claim the Grok Bot mark. Do not publish it as an official
xAI avatar.

The Vue customiser, cycle editor, and GIF export were not copied.

## Identity (vendored)

**blobatar** 2.5.0 — https://github.com/Alain00/blobatar  
MIT © 2026 Alain.

The files under `src/identity/blobatar/` are that engine: a name hashes to a
deterministic silhouette, and expression is a second axis. Vue/React adapters
were not copied; we wrap `blobatar()` ourselves.

## Orb realm

Dotted orb painting is `thinking-orbs-mega` (megafork of thinking-orbs 0.3.1).
See that package's NOTICE.md. This package maps presence phases onto existing
`OrbState` verbs.

## CSS orb (harvested config)

**@neongate-ai/orbz** 1.0.0 — https://github.com/NeonGate-AI/orbz  
MIT © 2026 Neongate AI.

`src/css-orb/orbz.config.json` and the layered CSS/WAAPI painter are adapted
from that package. Speech adapters, Realtime ports, and the `<orb-z>` custom
element were not copied.

## Glyph (vendored core)

**morphicons** — https://github.com/guillermolg00/morphicons  
MIT © 2026 Guillermo.

`src/glyph/morphicons/` is the DOM-free core (parse → plan → polar interpolate).
React/DOM adapters were not copied. Toolbar icons are ours, mapped from the bus.

## Meter frames

Headless waveform / spectrum / meter shapes follow the
waveform-component contract (channels in [-1, 1], envelope in [0, 1], separate
spectrum). The WebGL VFX catalogue was not copied.

## Terminal OSC 12

Key palette and hook mapping match claude-terminal-face
(https://github.com/isoden/claude-terminal-face): `#5ce0c9` idle, `#f7b81f`
thinking, `#41419c` working, `#0a9900` done, `#e00000` err. The Ghostty shader
was not copied.

## Glow (mood tables)

**Aurora** — https://github.com/tornikegomareli/Aurora

The drop ships no LICENSE file and GitHub reports none. We copied only the
named mood/palette tables (Apple Intelligence / ocean / error / success and
the listening=1.5 / thinking=0.6 speed knobs) as typed CSS colours. The Metal
shader, SwiftUI views, and intro/outro machinery were not copied.

## Textmode grid

**textmode.js** 0.18.0 — https://github.com/humanbydefinition/textmode.js  
MIT © 2025 humanbydefinition.

We took the grid contract (cols × rows, per-cell character + colour, density
ramp) as a portable frame. The WebGL2 engine, font atlas, and add-ons
(`textmode.overlay.js`, `textmode.filters.js`, `textmode.synth.js`,
`textmode.accurate.js`, `textmode.export.js`) were not vendored.

**Glyph Cast** — Fox9 `apps/glyph` (Seal / Hyphae / Beat sketches and Cast
phase-drive / mood palettes). Corona (3D sphere/torus) stays a textmode.js
WebGL sidecar in Glyph and is not copied here.

## Echo

Afterimage of the last named phase. The verb matches Conversation Seam's
fainter overlay knot. The TTY skin reuses the claude-terminal-face glyph
rows. `ghostty-web` (full VT emulator) was not vendored.

## Grok Bot brand (harvested table)

**grokbot-wall** — meetup wall using official Grok Bot silhouettes and brand ramps.

`src/face/brand.ts` copies the colour names/hexes, idle motions, and form→shape map.
The Luma check-in wall, email queue, and Three.js ASCII shader were not copied.

## ttfx verbs

**ttfx** (TerminalTextEffects port vendored by omacy) — effect names only.

`src/textmode/ttfx.ts` lists the verbs and paints three portable grid skins
(matrix, decrypt, waves). The Metal screensaver host was not copied.

## Cuelume cues

**cuelume** — https://github.com/Danilaa1/cuelume (MIT © 2026 Daniel Belyi).

A subset of synthesized Web Audio recipes plus a slim player. The full 17-sound
palette and DOM `bind()` helper were not copied.

## Identicon fallback

**boring-avatars** marble hash (MIT). Name → SVG, no expression axis.

## Waiting spinner

**respinner** wave loader (waiting phase only). Other spinner variants were not copied.

## Ghost face

Sheet silhouette on the bloub eye rig (`shape="ghost"`). Same 14 poses; the
body is a draped head + scalloped hem instead of the ball. Idle and listening
hover (traveling hem, bob, squash) follow the motion of a reference mascot
loop; blink stays the bloub lid calendar. Blob poses modulate the sheet.
Thinking keeps three dots above the head. Alert is an italic buzzing `!`;
exclaim is an upright shout.

## Live host

`PresenceHost` is original. Duplex analysis in the review **live** tab uses
`SeamAudio` from `thinking-orbs-mega` (mic / demo TTS / speaker tap). A
production host should feed RMS from its own STT and TTS graphs.

## Braille TTY meters

**cliamp-plugin-vu-meter** (and led-burst / sine-rainbow siblings) —
https://github.com/AlexZeitler/cliamp-plugin-vu-meter  
MIT © 2026 Alexander Zeitler.

Unicode braille bit layout (U+2800..U+28FF, 2×4), Bresenham needles, and the
LED/sine drawings are ported as a TTY string surface. The Lua cliamp host was
not copied.
