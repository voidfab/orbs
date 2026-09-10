# pi-thinking-orbs

An unofficial [Pi](https://pi.dev) extension that renders the upstream [Thinking Orbs](https://github.com/Jakubantalik/thinking-orbs) Canvas animations as agent activity states in the terminal.

[![Thinking Orbs composing state](https://cdn.jsdelivr.net/gh/ringoshiina/pi-thinking-orbs@fd56ea944dfed0ca2ab8b31365a0139808415f09/assets/preview.png)](https://cdn.jsdelivr.net/gh/ringoshiina/pi-thinking-orbs@fd56ea944dfed0ca2ab8b31365a0139808415f09/assets/demo.mp4)

It uses real 64×64 RGBA PNG frames through Pi's Kitty or iTerm2 image support. Terminals without an image protocol, or systems where the native Canvas renderer cannot load, fall back to a text spinner.

Activity events also drive a `PresenceHost` (`presence/host`) so the same conversation bus as the gallery (face, glow, textmode, …) sees the live turn. The widget still paints orb verbs (`searching` / `shaping` / …) from tool priority.

## Install

From this checkout (uses the megafork engine, not the npm `thinking-orbs` package):

```bash
cd thinking-orbs-mega
npm install
npm run build
cd ports/pi
npm install
pi install .
```

Try it without installing:

```bash
pi -e .
```

After installation, start Pi and run `/orbs` to open the settings menu.

## Activity states

| Activity | Orb state |
| --- | --- |
| Editor contains visible text while Pi is idle | `listening` |
| Agent starts | `solving` |
| Assistant emits text | `composing` |
| Read and search tools | `searching` |
| Bash and unclassified tools | `working` |
| Edit and write tools | `shaping` |
| Idle editor is empty | hidden |

Parallel tools are tracked independently. The highest-priority active tool wins (`shaping` → `working` → `searching`), and finishing it restores the next active state.

## Settings and preview

Run `/orbs` for the interactive menu, or use direct commands:

```text
/orbs status
/orbs on | off
/orbs fps <8-60>
/orbs appearance <auto|dark|light>
/orbs listening <on|off>
/orbs placement <above|below>
/orbs motion <normal|reduced|static>
/orbs preview <all|working|searching|solving|listening|composing|shaping|off>
/orbs retry
/orbs reset
/orbs help
```

Defaults:

```text
64px · 30 FPS · auto appearance · above editor · normal motion
```

`normal` uses the configured FPS, `reduced` caps image animation at 12 FPS, and `static` displays a representative frame without an animation timer. `preview all` shows each state for three seconds and stops when real agent activity begins.

Settings are stored at `$PI_CODING_AGENT_DIR/thinking-orbs.json`, or `~/.pi/agent/thinking-orbs.json` when that environment variable is unset. The extension does not watch the file; run `/reload` after editing it manually.

## Terminal support

Image rendering requires a terminal that supports the Kitty graphics protocol or iTerm2 inline images. Ghostty works directly.

Herdr 0.7.5 requires this setting in `~/.config/herdr/config.toml`:

```toml
[experimental]
kitty_graphics = true
```

Apply it with:

```bash
herdr config check
herdr server reload-config
```

Use `/orbs status` to see the detected image protocol, Canvas availability, effective FPS, appearance, and fallback reason.

## Privacy

The extension polls the editor every 100 ms only to determine whether trimmed input is empty. It does not store editor text, send network requests, or collect telemetry. Its settings file contains preferences only.

## Development

Requirements: Node.js 24 and Pi 0.82.1 or newer.

```bash
npm install
npm test
npm run typecheck
npm audit --omit=peer --omit=dev
pi -e ./index.ts --list-models
```

Regenerate the Gallery media on macOS with FFmpeg installed:

```bash
node scripts/render-demo.mjs
```

The demo uses the same `MODE_DRAWS` and `resolvePreset()` painters as the extension. It renders six states at 30 FPS with the macOS Menlo and Helvetica Neue system fonts, without recording terminal content or desktop data.

## License and attribution

This extension is licensed under the MIT License. See [LICENSE](LICENSE).

The animation painters and presets come from `thinking-orbs`, also licensed under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This is an unofficial integration and is not affiliated with or endorsed by Jakub Antalik or the Pi maintainers.
