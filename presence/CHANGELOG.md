# Changelog

## 0.10.1

- Ghost idle / listening hover from `deja-mascot.gif`: traveling hem, bob, squash. Blink stays the existing lid calendar. Pose-owned silhouettes (thinking dots, egg, burst, …) are unchanged.

## 0.10.0

- Pi and Hermes drive `PresenceHost` (`presence/host`) so the live turn is the same bus as the gallery.
- Grok Bot brand ramps + idle motions from grokbot-wall. ttfx matrix/decrypt/waves on the character grid. Cuelume phase cues. boring-avatars identicon fallback. respinner wave on waiting.

## 0.9.1

- Ghost alert and exclaim carry a real `!` beside the sheet: italic buzzing mark vs upright shout, so they no longer share the wide face.

## 0.9.0

- Ghost wears every catalog pose. Blob animations (sleep, egg, hex, play, orbit, burst, comet) modulate the sheet. Thinking keeps the ghost plus dots above the head. Alert/exclaim keep the creature (bang marks land in 0.9.1).

## 0.8.0

- Ghost is now a **sheet-body face**: same two eyes as the ball, scalloped hem. `GhostPresence` / `FacePresence shape="ghost"`.
- Afterimage painter renamed **Echo** (`EchoPresence` / `EchoTrail`). Seam lag verb, not a body.
- Face catalog: ball | ghost toggle.

## 0.7.0

- Ghost realm: afterimage of the last named phase (Seam ghost-knot idea). Cast runes or TTY face. Asleep hangs longer. Not ghostty-web.

## 0.6.0

- Textmode Cast engines from Fox9 Glyph: Seal (rune rings), Hyphae (walker trails), Beat (duplex rings). Phase drive + mood palettes mapped onto the bus.
- Auto engine: listening/speaking → Beat, thinking → Hyphae, working/waiting/err → Seal, else the density field.
- textmode.js WebGL, overlay/filters/synth add-ons, and TTY emulators (restty/wterm) were not vendored.

## 0.5.0

- `PresenceHost`: stateful bus a live STT/TTS host drives (`push`, `ingestAudio`, `adoptPhase`). Input VAD becomes `human.start` / `human.end`.
- Host adapters: Pi activity events, Claude Code hooks, Hermes voice-bus phases.
- Review gallery **live** tab: mic + demo TTS + tool events feed the same ten painters.
- Hermes pane follows `focusedSessionId` (tile-aware) when the Desktop SDK provides it.

## 0.4.0

- Glow realm: Aurora mood + palette tables as a CSS/WAAPI rounded-rect ring (listening speeds, thinking slows; Metal shader not copied).
- Textmode realm: portable character-grid (`cols × rows`, glyph ramp, terminal-face stamp). textmode.js WebGL engine not vendored.
- Braille TTY meters: Unicode 2×4 canvas, Bresenham needles, LED burst, overlapping sines. Kind follows the phase.
- Review gallery shows ten painters on one duplex snapshot.
- Megafork: SVG morph test + `?renderer=svg` gallery boot. Wrapper IntersectionObserver keeps the SVG clock alive.

## 0.3.0

- Glyph realm: morphicons polar morph between per-phase stroke icons.
- Meter frames now carry duplex waveform samples and a 16-bin spectrum.
- OSC 12 encoder/decoder aligned with claude-terminal-face’s five key colours, plus Claude Code hook mapping.

## 0.2.0

- Identity realm: vendored blobatar 2.5.0. Same name → same body; expression maps from the bus.
- CSS orb realm: Orbz layered WAAPI painter on the same snapshot (working/waiting/err fold onto Orbz states).
- Review gallery: identity catalog + CSS orb on the conversation stage.

## 0.1.0

- Shared presence bus: `idle | listening | thinking | working | waiting | speaking | done | err | asleep`.
- Full-duplex conversation reducer (STT / tools / TTS) with a scripted demo turn.
- Face realm: vendored bloub engine, 42 golden vectors, canvas + SVG paint.
- Orb adapter onto `thinking-orbs-mega` verbs.
- Meter and terminal sketches on the same snapshot.
- Review gallery at `:5188/review.html`.
