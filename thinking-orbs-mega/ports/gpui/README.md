# gpui-thinking-orbs

https://github.com/user-attachments/assets/a855216d-f07a-47de-804d-f096a80d9d7a

Dotted thought-orb loading indicators for AI & agent UIs — a native
**[GPUI](https://www.gpui.rs/)** library port of
[thinking-orbs](https://orbs.jakubantalik.com/)
([Jakub Antalik](https://github.com/Jakubantalik/thinking-orbs), MIT).

Twelve hand-tuned animated states, four size presets, monochrome light/dark ink.
Geometry is pure Rust; painting uses GPUI `canvas` + rounded quads / stroked paths.
No WebGL, no browser, no React.

| | |
|--|--|
| **Crate** | `gpui-thinking-orbs` **0.1.0** |
| **MSRV** | Rust **1.85** |
| **License** | MIT |
| **Depends on** | [`gpui`](https://crates.io/crates/gpui) `0.2.2` only |

### Status / roadmap

This is early **0.x**. There is still **a lot to improve**: motion polish, density
tuning per size, new states, and host-integration ergonomics. New orbs will keep
landing, and existing ones will keep getting refined — expect visible iteration
rather than a frozen gallery.

---

## Install

Until the crate is on crates.io, use a path or git dependency:

```toml
[dependencies]
gpui = "0.2.2"
gpui-thinking-orbs = { git = "https://github.com/FrancoEscob/gpui-thinking-orbs" }
# or: gpui-thinking-orbs = { path = "../gpui-thinking-orbs" }
```

## Usage

```rust
use gpui_thinking_orbs::{OrbState, OrbSize, OrbTheme, ThinkingOrb};

// As a window root, or nested via Entity:
cx.new(|_| {
    ThinkingOrb::new()
        .state(OrbState::Searching)
        .size(OrbSize::Avatar)
        .theme(OrbTheme::Auto)
        .speed(1.0)
})
```

### States

| State | Animation |
|-------|-----------|
| `Working` | particles on tilted orbits |
| `Searching` | scan meridian sweeps a dotted globe |
| `Solving` | bands scramble, then click back solved |
| `Listening` | waveform rolls through latitude rings |
| `Connecting` | constellation wires itself + packets |
| `Weaving` | three strands plait around the sphere |
| `Composing` | undulating multi-band sash |
| `Breathing` | face-on ring slowly morphing |
| `Shaping` | dotted outline: circle → triangle → square |
| `Focusing` | particle iris converges on a focal core |
| `Reasoning` | counter-rotating gyroscope loops |
| `Recalling` | memory echoes expand from a steady core |

### Sizes

Four tuned designs:

- `OrbSize::Inline` — 20 px (inline text)
- `OrbSize::Avatar` — 64 px (chat avatar)
- `OrbSize::Large` — 96 px (prominent card/status)
- `OrbSize::Hero` — 128 px (hero or empty state)

Large and Hero preserve the Avatar design while progressively increasing dot
density and radius; they are not merely a stretched 64 px canvas. Iterate all
available sizes with `OrbSize::ALL_SIZES`.

### Theme

| Value | Meaning |
|-------|---------|
| `OrbTheme::Auto` | Follow `WindowAppearance` (updates on OS light/dark change) |
| `OrbTheme::Dark` | Light ink (for dark backgrounds) |
| `OrbTheme::Light` | Dark ink (for light backgrounds) |

### Reduced motion & visibility

```rust
ThinkingOrb::new()
    .reduced_motion(true)  // static frame at t = 0.6, no timer
    .visible(true)         // set false when the entity is mounted but off-screen
```

GPUI has no intersection observer. If a list row recycles an orb that scrolled
away, call `set_visible(false)` or unmount the entity so it stops ticking.

---

## API surface (what is stable?)

This crate is **0.x**. Under [SemVer](https://semver.org/) that means we may
still refine APIs before **1.0**. We still try not to break you casually.
Here is the contract:

### Stable for app authors (use this)

Treat these as the **supported product API** — we avoid breaking them without
a clear reason and a `CHANGELOG` entry:

| Item | Role |
|------|------|
| `ThinkingOrb` | Widget: builders + `set_*` mutators |
| `OrbState`, `OrbSize`, `OrbTheme` | Public enums |
| `thinking_orb`, `DEFAULT_TARGET_FPS` | Helpers / defaults |
| `resolve_preset`, `Resolved` | Map state×size → mode + tuned opts |

Typical app code only needs the first three rows. Iterate the full gallery with
`OrbState::ALL_STATES`; the deprecated `OrbState::ALL` remains the original
nine-element array for source compatibility.

### Advanced / power-user (may move more in 0.x)

| Item | Role |
|------|------|
| `draw_mode`, `draw_mode_into` | Geometry without the widget |
| `ModeOpts`, `ModeKey`, `Frame`, `Dot`, `Line` | Raw engine types |
| `sanitize_mode_opts`, `MAX_*` caps | Safety knobs for custom opts |
| `base_profile`, `scale_counts`, `scale_radii` | Profile helpers |
| `Proj`, `make_proj`, `sort_dots` | Low-level projection |

`ModeOpts` is `#[non_exhaustive]`: we can add fields in a minor 0.x release
without breaking your `..Default::default()` / `..base_profile(..)` patterns.
Count-like fields are always clamped by `sanitize_mode_opts` inside
`draw_mode*`.

### Version numbers after 1.0

When we ship **1.0.0**:

- **major** (`2.0.0`) — breaking changes to the stable surface above  
- **minor** (`1.1.0`) — new features, backward-compatible  
- **patch** (`1.0.1`) — bugfixes only  

Until then, **0.y.z**: `y` may still include careful breaks to advanced APIs;
the widget surface is still the priority not to thrash.

See [`CHANGELOG.md`](CHANGELOG.md) for every release.

---

## Performance

Built to stay cheap in real agent UIs — chat sidebars, status chips, many orbs
on screen — not as a full-screen particle toy.

### Numbers

One 64 px orb costs about **2 % of one core**; twelve cost about **4.5 %**.
That is down from roughly **9 % → 2 %** (one orb) and **~82 % → ~4.5 %**
(twelve orbs) after the optimization pass. Measured with `examples/stress.rs` —
details in [`docs/PERFORMANCE_RESULTS.md`](docs/PERFORMANCE_RESULTS.md).

### How it was optimized

The geometry engine is pure Rust and independent of GPUI. The expensive part in
practice was **redraw / paint scheduling**, not the math, so the library was
tuned around doing less host work:

- **FPS-capped timer** (default **30 fps**) instead of unbounded
  `request_animation_frame` churn
- **Pause when the window is inactive** so background windows cost ~nothing
- **`visible` / `reduced_motion`** so off-screen or accessibility-static orbs
  stop ticking entirely
- **Retained `Frame` buffers** — rebuild dots/lines into reused storage; parent
  re-renders between ticks keep geometry instead of reallocating
- **One animation timer in flight** — do not replace the timer on every parent
  notify
- **Cached topology** — unit-circle samples, Fibonacci sphere dirs, and similar
  invariants live in thread-local tables instead of being rebuilt every frame
- **Cheap hot paths in painters** — squared-distance rejects, project-once edge
  scans, rebuild Rubik move tables only when count changes
- **Single `paint_layer`** per frame (quads + paths), no WebGL / extra crates

There is **no magic dependency** to bolt on for faster particles — use GPUI’s
paint APIs well. Background notes:
[`docs/GPUI_ECOSYSTEM_RESEARCH.md`](docs/GPUI_ECOSYSTEM_RESEARCH.md).

Defaults are already the cheap configuration:

```rust
ThinkingOrb::new()
    .target_fps(30.0)            // default; cost scales with this
    .pause_when_inactive(true)   // default; freeze when the window is unfocused
    .visible(true)
```

```bash
cargo run --release --example stress -- --count 12 --state working --fps 30
```

### Power-user paint loop

```rust
use gpui_thinking_orbs::{draw_mode, resolve_preset, OrbState, OrbSize};

let resolved = resolve_preset(OrbState::Working, OrbSize::Avatar);
let frame = draw_mode(resolved.mode, 64.0, t_seconds, &resolved.opts);
// frame.dots / frame.lines — paint however you like
```

---

## Examples

| Example | Command | What it is |
|---------|---------|------------|
| **playground** | `cargo run --example playground` | Interactive gallery of all states |
| **stress** | `cargo run --release --example stress -- --count 12` | CPU self-measurement harness |
| **readme_usage** | `cargo build --example readme_usage` | Compile-check of the README API |

---

## Repository layout

```
gpui-thinking-orbs/
├── assets/             # README demo video (not in crates.io tarball)
├── src/
│   ├── lib.rs          # crate root + re-exports
│   ├── widget.rs       # ThinkingOrb (public widget)
│   ├── paint.rs        # Frame → GPUI primitives
│   ├── presets.rs      # state × size tuning
│   ├── types.rs        # OrbState, OrbSize, OrbTheme, ModeKey
│   └── engine/         # pure geometry (no GPUI)
├── examples/           # playground, stress, readme_usage
├── docs/               # performance + research notes (not in crates.io tarball)
├── scripts/            # golden-diff, measure helpers (dev only)
├── CHANGELOG.md
├── LICENSE
├── README.md
└── Cargo.toml
```

How a frame flows:

```
ThinkingOrb::render
    → resolve_preset(state, size)     # once per state/size change
    → draw_mode_into(..., &mut Frame) # math, reuses buffers
    → paint_frame (GPUI paint_layer)  # quads + paths
    → schedule timer @ target_fps     # if animating
```

### Cargo.lock

This repo **keeps** `Cargo.lock` committed even though it is a library. That
makes CI and the examples reproduce the same dependency graph on every machine.
Apps that depend on this crate still resolve their **own** lockfile; publishing
to crates.io does not force our lock on consumers.

---

## Development

```bash
cargo test --lib
cargo clippy --lib -- -D warnings
cargo fmt --all
cargo package --allow-dirty --no-verify   # what crates.io would ship
```

CI (GitHub Actions): fmt + clippy + lib tests + package dry-run on every push/PR.

---

## License

MIT. The original nine animation designs and tuning are © Jakub Antalik
(thinking-orbs). `Focusing`, `Reasoning`, and `Recalling` are original concepts
for this GPUI library. This port reimplements the engine for native Rust apps.
