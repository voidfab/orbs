# orbs — handoff

> **Read this first.** Single entry point for resuming work. Run the
> `handoff-continue` skill for the structured summary. Then read the files
> listed in `.handoff/config.yaml` under `project.readingOrder`.

---

## Required reading order

Read the files listed in `.handoff/config.yaml` under `project.readingOrder`.

---

## State of play

| Phase | Status | Notes |
|---|---|---|
| Megafork publish | ✓ | Public `voidfab/orbs` on `master` |
| `_new/` harvest | ✓ | Presence 0.9.1: bus, Face, Ghost, Echo, orb, CSS orb, identity, glyph, meter, glow, textmode, braille, terminal |
| Pi + Hermes plugins | ✓ | Installed locally; Hermes pane session-lock is upstream (ORBS-57c93e, low) |
| Realms expansion | ◐ | Painters + `PresenceHost` on the bus. Next: Pi/Hermes consume the host, not only orb verbs. |

---

<!-- handoff:state -->

Canonical tree is `thinking-orbs-mega/` plus sibling `presence/` (bus + painters + PresenceHost). `_new/` is gitignored.

Presence 0.9.1: Ghost wears every catalog pose (sheet body + two eyes; italic vs upright `!` on alert/exclaim). Echo is the afterimage. ghostty-web not vendored. Ready to land on `master`.

<!-- handoff:state-notes -->
Ghost is `FacePresence shape="ghost"`. Blob poses modulate the sheet; thinking keeps dots; alert/exclaim carry a `!` beside the sheet (italic vs upright). Pi/Hermes still paint orb verbs only.
<!-- /handoff:state-notes -->

<!-- /handoff:state -->

<!-- handoff:recent -->

- Presence 0.1.0–0.9.1 + megafork SVG/Hermes fixes logged and ready to commit.
- Closed ORBS-dd5884. Presence tests 71/71, megafork 30/30.

<!-- /handoff:recent -->

<!-- handoff:next -->

- ORBS-dc948a — Pi and Hermes consume PresenceHost, not only orb verbs.
- Epic ORBS-0a94c4 stays open until those hosts ride the same bus as the gallery.

<!-- /handoff:next -->

---

## Gotchas

- `_new/` and `_processed/` stay local. Never commit zip drops or `node_modules` under ports. Harvested zips move `_new/` → `_processed/`.
- SVG mode must observe the wrapper, not the hidden canvas, or the morph clock stops.
- The full SVG review grid (all 49 orbs) is expensive once that clock is alive. Boot `?renderer=svg&state=working&solo=1` for a single morphing orb.
- Aurora's zip/GitHub have no LICENSE. Presence glow copies only mood/palette tables as CSS; never the Metal shader.
- Do not extract morphicons for orb state transitions — those are already polar dot blends. Morphicons belong to the Glyph realm (`REALMS.md`).
- `_new/` harvests now split by realm. Do not smash Face poses, meter frames, and ModeFrame dots into one geometry type. One bus, many bodies.
- Hermes Desktop plugins may import only `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime`. Bundle the engine into `ports/hermes/plugin.js`.
- Pi `ports/pi` imports `thinking-orbs-mega/engine` from `file:../..`; run `npm run build` in the megafork first.
- Hermes Desktop panes should read `host.state.focusedSessionId` (tile-aware). `activeSessionId` is the older atom and locks a dropped pane to the session that was focused at add-time.

---

## Glossary

(Project-specific terms agents should know. Carried forward on every `--create --full`.)

---

## Where to look

| Looking for... | File |
|---|---|
| Megafork engine / Seam | `thinking-orbs-mega/` |
| Presence package (bus + painters) | `presence/` |
| Realms beyond orbs (faces, meters, terminal) | `REALMS.md` |
| Fork verdicts + remotes | `thinking-orbs-mega/FORKS.md`, `SOURCES.md` |
| Presence changelog / notices | `presence/CHANGELOG.md`, `presence/NOTICE.md` |
| Pi extension | `thinking-orbs-mega/ports/pi/` |
| Hermes Desktop plugin | `thinking-orbs-mega/ports/hermes/` |
| Dated checkpoint history | `DEVLOG.md` |
| Package changelog | `thinking-orbs-mega/CHANGELOG.md` |
| Root handoff changelog | `CHANGELOG.md` |
| Handoff config | `.handoff/config.yaml` |
| Tasks | `mm item list` (prefix `ORBS`) |

---

*This file is partly skill-managed. Sections inside `<!-- handoff:* -->` markers are rewritten by `handoff-create`. Everything else is yours to edit freely; the skill preserves your edits across cheap checkpoints and consults them on full checkpoints.*
