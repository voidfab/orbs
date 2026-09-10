# orbs — changelog

User-facing changes. Follows [Keep a Changelog](https://keepachangelog.com/) loosely.

The `handoff-create --changelog` flow appends entries to "## Unreleased" as you go. Release tagging is manual.

---

## Unreleased

- Pi and Hermes consume `PresenceHost` (same conversation bus as the gallery).
- Harvested grokbot-wall brand ramps, ttfx matrix/decrypt/waves, Cuelume phase cues, boring-avatars identicon, respinner waiting wave.
- DAW and demoscene zip drops moved to `_later/` (local).

### presence 0.1.0–0.9.1 (new package)

Shared conversation bus plus visualization realms. Review gallery at `:5188/review.html`.

- **Bus** — `PresenceSnapshot`: `idle | listening | thinking | working | waiting | speaking | done | err | asleep`. Duplex RMS independent of named phase. Event reducer + `PresenceHost` (`push`, `ingestAudio`, `adoptPhase`).
- **Face** — vendored bloub pose engine, 14 Grok-measured states, canvas + SVG, 42 golden vectors.
- **Ghost** — sheet-body face (`GhostPresence` / `shape="ghost"`). Wears all 14 catalog poses. Alert: italic buzzing `!`. Exclaim: upright shout `!`.
- **Echo** — afterimage of the last named phase (Cast runes or TTY face). Not a Ghostty emulator.
- **Orb** — adapter onto `thinking-orbs-mega` verbs.
- **CSS orb** — Orbz layered WAAPI painter.
- **Identity** — vendored blobatar; same name → same body.
- **Glyph** — morphicons polar morph between per-phase stroke icons.
- **Meter** — duplex waveform + 16-bin spectrum + VU.
- **Glow** — Aurora mood/palette tables as CSS/WAAPI ring (Metal shader not copied).
- **Textmode** — Glyph Cast Seal / Hyphae / Beat on a portable character grid (textmode.js WebGL not vendored).
- **Braille** — Unicode 2×4 TTY meters (needles / LED burst / sines).
- **Terminal** — OSC 12 key palette + glyph face.
- Review: conversation / live / face catalog (ball | ghost) / identity tabs.

### thinking-orbs-mega

- SVG morph clock observes the visible wrapper, not the hidden canvas.
- Hermes pane follows `host.state.focusedSessionId` (tile-aware), falling back to `activeSessionId`.

---
