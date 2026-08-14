# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with the API stability rules described in the README (**API surface**).

## [Unreleased]

### Added

- Three original, low-density dot-only concepts: `Focusing`, `Reasoning`, and
  `Recalling`, each tuned independently for avatar and inline sizes
- `OrbState::ALL_STATES`, a future-proof slice containing the complete gallery;
  the original `[OrbState; 9]` `ALL` constant remains as a deprecated alias for
  source compatibility
- `OrbSize::Large` (96 px) and `OrbSize::Hero` (128 px), with progressive
  density/radius tuning and `OrbSize::ALL_SIZES` for gallery iteration

### Changed

- Give `Solving` a quieter base lattice and brighter, slower, smoothly eased
  active bands so each quarter-turn remains legible
- Redesign `Reasoning` as three softly precessing inference tracks with bright
  thought packets traveling in alternating directions
- Polish every animation family with calmer listening, composing, and breathing
  rhythms; continuous shaping pulses; seamless weaving and recalling loops; and
  edge-bound connecting packets that fade cleanly between journeys

### Performance

- Retain geometry across unrelated parent renders and keep only one animation
  timer in flight, preventing redundant math and timer cancellation churn
- Cache reusable Fibonacci sphere and unit-circle topology per thread
- Cache deterministic Rubik move tables until the requested count changes
- Skip repeat `ModeOpts` sanitization only for the widget's trusted built-in
  presets; public raw-engine calls retain their full sanitization boundary
- Avoid depth sorting for face-on modes whose dots all use `z = 0`

## [0.1.0] — 2026-08-05

First public-shaped release of the GPUI port of
[thinking-orbs](https://orbs.jakubantalik.com/).

### Added

- `ThinkingOrb` widget: nine states, avatar/inline sizes, light/dark/auto theme
- FPS-capped animation timer (default 30), pause when window inactive
- Host visibility gate (`visible` / `set_visible`) for off-screen entities
- Allocation-conscious geometry engine + `paint_layer` paint path
- Power-user path: `draw_mode` / `draw_mode_into`, `resolve_preset`, `ModeOpts`
- `sanitize_mode_opts` / hard ceilings on count knobs at the draw boundary
- Examples: `playground`, `stress`, `readme_usage`
- Docs: performance audit/results, ecosystem research notes

### Performance (measured on this machine)

- ~9 % → ~2 % of one core for one avatar orb @ 30 fps
- ~82 % → ~4.3 % for twelve orbs

See [`docs/PERFORMANCE_RESULTS.md`](docs/PERFORMANCE_RESULTS.md).

[0.1.0]: https://github.com/FrancoEscob/gpui-thinking-orbs/releases/tag/v0.1.0
