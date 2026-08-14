# Performance results

Outcome of the optimization pass described in [`PERFORMANCE_AUDIT.md`](./PERFORMANCE_AUDIT.md).

**Headline:** one avatar-size orb went from **9.25 % → 2.0 %** of a core.
Twelve orbs went from **~82 % → 4.3 %**. The geometry the engine emits is
byte-for-byte unchanged; eight of the nine states render pixel-identical to the
pre-optimization build.

---

## 1. How this was measured

`perf` and flamegraphs are unavailable in this environment (Wayland session, no
`perf_event_paranoid` access), so `examples/stress.rs` self-instruments instead:
a background thread reads `/proc/self/stat` (`utime + stime`) and
`/proc/self/status` (`VmRSS`) every 2 s and prints CPU as a percentage of one
core. It warms up for 3 s so window mapping is excluded from the first sample.

```bash
cargo run --release --example stress -- --count 12 --state working --fps 30
cargo run --release --example stress -- --count 0            # empty-window control
```

### The measurement trap that invalidated the first run

The first post-optimization run reported **0.5 % for every configuration** —
including 12 orbs, and including the `--count 0` control. That is not an
optimization, that is a frozen widget. The cause was `pause_when_inactive`
(§3.2): the harness window never takes focus under this compositor, so every orb
correctly stopped animating and the numbers measured nothing.

The fix is now permanent in the harness. `stress.rs` subscribes to orb #0 and
counts notifications:

```rust
static TICKS: AtomicU64 = AtomicU64::new(0);
let _tick_probe = orbs.first().map(|orb| {
    cx.observe(orb, |_, _, _| { TICKS.fetch_add(1, Ordering::Relaxed); })
});
```

The reporter prints `orb0=NN.N fps` alongside CPU. **A measurement with
`orb0≈0.0 fps` is measuring a frozen orb and must be discarded.** Every number
below was taken with a plausible non-zero tick rate.

---

## 2. Results

Avatar size (64 px), dark theme, release build. CPU is % of one core, sampled
over 2 s windows; the spread across samples is shown where it varied.

| configuration | before  | after @ 30 fps (default) | after @ 60 fps |
| ------------- | ------- | ------------------------ | -------------- |
| empty window  | ~0.3 %  | 0.0–1.0 %                | —              |
| 1× working    | 9.25 %  | **2.0 %**                | 2.5–3.0 %      |
| 1× composing  | 10.25 % | **1.5–2.0 %**            | —              |
| 1× connecting | —       | **2.0–2.5 %**            | —              |
| 4× working    | ~43 %   | **2.5 %**                | —              |
| 12× working   | ~82 %   | **4.0–4.5 %**            | 7.0–7.5 %      |

Net of the empty-window baseline, **one orb costs roughly 1.5 % of a core** and
each additional orb costs about **0.2 %**. The user-reported 14 % case lands
around 2 %.

Geometry generation is not the process-level bottleneck. Every mode still has
orders of magnitude more headroom than the widget's 30 fps ceiling; the follow-up
optimization below makes several painters cheaper without changing their output.

### Follow-up: library concepts + retained-work optimization

The `feat/orb-library-performance-concepts` pass adds three low-density modes and
removes repeat work from the existing engine/widget:

- invariant unit-circle and Fibonacci-sphere topology is cached per thread;
- deterministic Rubik move tables are rebuilt only when their count changes;
- the widget's already-resolved presets skip a second public-boundary sanitize;
- parent renders between orb ticks reuse retained geometry and keep the one timer
  already in flight instead of replacing it.

A five-run median microbenchmark (release, retained `Frame`, 100,000 frames per
sample) measured these existing avatar modes:

| mode | before | after | geometry change |
|------|-------:|------:|----------------:|
| Working | 15.87 µs | 14.11 µs | **−11.1%** |
| Solving | 8.50 µs | 7.31 µs | **−14.0%** |
| Listening | 3.29 µs | 2.66 µs | **−19.3%** |
| Weaving | 5.60 µs | 5.07 µs | **−9.5%** |

The other original modes moved by 0.6–4.4%, near the noise floor. A strict hash
comparison of every emitted dot/line field for all original states × both sizes
× four timestamps matched `master` exactly.

The live process benchmark remains effectively tied: one Working orb is about
1–1.5% of one core and twelve about 2.5–3% on both builds at the same observed
tick rate. GPUI painting/scheduling dominates there, so the geometry savings are
not resolvable by the harness's 0.5% sampling precision. The retained-parent-
render fix targets host UIs that redraw the orb entity between its own ticks; the
standing stress harness does not generate that workload.

---

## 3. What actually changed

### 3.1 `paint_layer` — the whole story, essentially

The audit assumed geometry cost. It was paint cost, and specifically *scene
insertion* cost, not rasterization.

In GPUI, `Scene::insert_primitive` (`scene.rs:77`) calls `BoundsTree::insert`
for **every primitive** to compute its draw order. That insert is a
bounding-volume-hierarchy insertion whose `find_max_ordering` walk recursively
descends every intersecting subtree. With hundreds of heavily-overlapping discs
stacked inside a 64 px box — the pathological input for a BVH — it degenerates.
This is what produced the ~2 µs per quad measured earlier, roughly 200× the cost
of a plain `Vec::push`.

`window.paint_layer(bounds, ...)` pushes one layer, the tree is touched once,
and every primitive inside inherits the layer's order:

```rust
window.paint_layer(bounds, |window| {
    paint_lines(window, bounds.origin, &frame.lines, dark);
    paint_dots(window, bounds.origin, frame, dark, r_min);
});
```

**Ordering is preserved.** These orbs are 3-D and depend on the painter's
algorithm. `Scene::finish` sorts with `sort_by_key`, which is *stable* in Rust's
standard library — so primitives sharing the layer's order keep their insertion
order, and the engine already emits dots back-to-front. This is confirmed
empirically in §5: the eight dot-only states are pixel-identical.

**Ablation** (`ORB_NO_LAYER=1`, everything else kept):

| configuration | with `paint_layer` | without                |
| ------------- | ------------------ | ---------------------- |
| 1× composing  | 2.33 %             | 3.50 %                 |
| 12× working   | 6.00 % @ 46 fps    | **39.33 % @ 27.8 fps** |

At 12 orbs the version without the layer cannot even hit its target frame
rate — it is CPU-bound at 27.8 fps while burning 6.5× the CPU. This one call is
the difference between "scales to a dozen orbs" and "does not scale".

### 3.2 Frame-rate ceiling and lifecycle

- **`request_animation_frame` → timer.** The old path re-notified at the display
  refresh rate with no way to opt down. It is now a `BackgroundExecutor::timer`
  at `target_fps`, defaulting to **30 fps**. The orb is a status indicator with
  slow organic motion; at 30 fps it is indistinguishable from 60 and costs
  roughly 40 % less (measured: 2.0 % vs 2.5–3.0 % at one orb; 4.3 % vs 7.3 % at
  twelve). Configurable per orb via `.target_fps(f32)`, clamped to `1.0..=240.0`.
- **Pause while the window is inactive** (`.pause_when_inactive(bool)`, default
  `true`). A background window's animation is visible to nobody. A paused orb
  drops its pending `Task` entirely, so it costs *nothing* — not a cheaper frame,
  no frame. `cx.observe_window_activation` wakes it when focus returns. Set it to
  `false` for a visible-but-unfocused surface such as a side panel or HUD — as
  `stress.rs` does, which is why measurement requires the flag.
- **Retained geometry buffer.** `draw_mode_into` writes into a `Frame` owned by
  the widget and cleared per frame, instead of allocating fresh `Vec`s of dots
  and lines every tick. The buffer is behind `Rc<RefCell<_>>` because canvas
  paint closures must be `'static` and so cannot borrow `self`.
- **Cached preset resolution.** `resolve_preset` is a pure function of
  `(state, size)`; it now runs only when one of those changes, not per frame.

---

## 4. Tried and reverted: stroke batching

This one is worth recording because the analysis said it was safe and the
pixels said it was not.

Every `Path` primitive costs GPUI a full two-pass render, and a single
`PathBuilder` accepts any number of disjoint subpaths — each `move_to` ends the
previous one. So `paint_lines` was rewritten to group segments by
`(width, ink bucket, alpha bucket)` into shared builders, collapsing the
connecting state's ~89 paths into a handful. Colour was quantised into 32
buckets, and a test asserted the quantisation error stayed within half a bucket
and below five steps of 8-bit colour — i.e. provably imperceptible.

**The test was true and the conclusion was wrong.** Pixel-diffing the golden
grid showed the connecting state's web came out visibly brighter: 125 differing
pixels, peak deviation 101/255, all inside that one orb. The error was not in
the colour arithmetic, it was in assuming colour arithmetic was the only thing
merging changed.

GPUI composites paths in two stages with *different blend modes*: subpaths of
one path are rasterised together into a cleared intermediate texture with
premultiplied-alpha blending, and that texture is then blitted with
`color: OVER, alpha: ADDITIVE` (`blade_renderer.rs:239`). Where strokes overlap,
merging them moves the accumulation from the second stage to the first, and the
two do not agree.

Then the cost side was measured, and it did not justify defending:

| configuration      | batched         | one path per segment |
| ------------------ | --------------- | -------------------- |
| 1× connecting      | 2.0–2.5 %       | 2.0–2.5 %            |
| 12× connecting     | 4.0–4.5 %       | 5.0–5.5 %            |

Zero benefit at one orb, about one point of a core at twelve — for a visible
change to the artwork. Reverted. Strokes are painted one `Path` per segment at
their exact colour, and `paint.rs` carries the reasoning so nobody re-derives
the idea and re-lands the bug.

### Also considered and rejected

**Rasterize the orb to an image, blit one sprite per frame.** GPUI's
`BladeAtlas` keys sprites by `ImageId`, so an animated orb would need a fresh
`RenderImage` every frame plus a ~64 KB texture upload — trading a few hundred
cheap quads for a per-frame allocation and a PCIe round trip. Strictly worse
once `paint_layer` removed the scene-insertion cost that motivated it.

**`gpui-animation` / `gpui_transitions`.** Both interpolate *style property
values* (colour, position, opacity) for element-level transitions. The orb is a
single `canvas()` element with no style tree to re-clone per frame, so neither
touches this bottleneck. `gpui-animation` additionally reaches into private GPUI
types via `#[repr(C)]` layout assumptions, which would break silently on a GPUI
version bump — not something to depend on from a reusable library.

**Quad culling by contribution.** Dots below α 0.02 are already skipped. Beyond
that the remaining dots are visually load-bearing, and the per-quad cost inside
a layer is now small enough that culling would risk fidelity for little gain.

**Shared animation clock across N orbs.** Each orb owns its timer, so 12 orbs
mean 12 timer wakeups per tick. A shared clock would coalesce them. Skipped
because 12 orbs land at 4.3 % — the coalescing would save a fraction of an
already-small number, at the cost of a global that complicates the API. This is
the right next step *if* someone needs dozens of simultaneous orbs.

---

## 5. Visual fidelity verification

The audit's hard constraint was preserving the artwork across nine states × two
sizes. This is checked by pixel diff, not by argument —
[`scripts/golden-diff.sh`](../scripts/golden-diff.sh).

`stress.rs --golden` renders a frozen grid of every state × size at the
deterministic `reduced_motion` timestamp. The script captures that window under
`ORB_NO_LAYER=1` (pre-optimization) and as shipped, and compares them.

Critically, it also captures a **control**: the reference configuration run a
second time. That establishes the noise floor of the whole method.

| variant                    | differing px | share      | peak Δ | bounding box       |
| -------------------------- | ------------ | ---------- | ------ | ------------------ |
| control (identical rebuild)| **0**        | 0.0000 %   | 0      | —                  |
| shipped (`paint_layer`)    | 37           | 0.0049 %   | 84/255 | 51×50 at (486, 23) |

The control is **exactly zero** — two identical runs are byte-identical, so the
method has no noise and every difference below is real.

The shipped build's 37 differing pixels are confined to a single 51×50 box: the
`Connecting` orb, the only state that emits strokes. **The other eight states —
every dot-only orb, both sizes — are pixel-identical.** The residual is
anti-aliased edge pixels on a handful of strokes, from the same path-compositing
asymmetry described in §4, and is not distinguishable at 1× magnification.

That is the trade being made explicitly: `paint_layer` is worth 39 % → 6 % of a
core at twelve orbs, and costs 37 sub-pixel-level edge samples in one of eighteen
rendered orbs.

### On method

Screenshot verification was attempted twice before it worked, and both failures
are worth recording:

1. A first attempt captured the session lockscreen instead of the app window.
2. A later attempt pinned the capture region to hardcoded screen coordinates
   after issuing a move. The move did not land where assumed, and `grim`
   captured unrelated desktop content.

`golden-diff.sh` now reads the capture rectangle back from `hyprctl clients`
*after* the move, and refuses to capture unless the app window is the focused
one. Do not reintroduce hardcoded coordinates.

---

## 6. Correctness fixes found along the way

### 6.1 Index-out-of-bounds panic in `solve_cycle` (solving state)

`lattice.rs:solve_cycle` guarded with `tc < 2.0 * count * slot_dur` and then
computed `(tc / slot_dur).floor() as usize`. Those are two independent float
operations, so rounding lets the division reach `2 * count` even when the guard
passed. `2*count-1-slot` then wraps to `usize::MAX` and the next loop indexes
out of bounds.

Reachable through the **public** `ModeOpts::move_count` knob: `count = 9`,
`slot_dur = 0.42`, `tc = 7.559999466` panics. Affected counts for the shipped
slot duration are 9, 17, 18 and 34..=37. Fixed with `.min(2 * count - 1)`.

A brute-force search for this timed out; a boundary probe
(`f32::from_bits(boundary.to_bits() - 1)`) found it immediately.
`solve_cycle_survives_float_boundary_move_counts` now sweeps counts 1..40 across
all three floats adjacent to every slot boundary.

### 6.2 Pause did not pause

Both branches of the old pause check were byte-identical, so pausing stopped
redraws but left the clock running on wall time — an orb resumed by jumping
forward by however long it had been paused. The clock now tracks paused time
explicitly and subtracts it:

```rust
let paused = match self.paused_at {
    Some(at) => self.paused_total + at.elapsed(),
    None => self.paused_total,
};
let live = self.started.elapsed().saturating_sub(paused);
```

### 6.3 Clock precision

Time accumulates in `f64` and narrows to `f32` only at the boundary with the
engine. `f32` has a 24-bit mantissa, so a clock driven straight off wall time
quantises visibly after several hours of uptime. Subtracting paused time helps
further: an orb idle for most of a session barely advances its clock.

**Known limit, deliberately not fixed:** the engine takes `t: f32`, so very long
*continuous* animation still loses step resolution. There is no seamless wrap
point — the modes mix incommensurate frequencies, so folding the clock would
trade slow degradation for a visible jump. Left documented rather than papered
over.

### 6.4 Input sanitization

`speed` is clamped to `0.0..=100.0` and `target_fps` to `1.0..=240.0`, with
non-finite input falling back to the default. A `NaN` fps previously produced a
`Duration::from_secs_f32` panic.

---

## 7. Library-usability changes

- `mod engine` is private, so `lib.rs` now re-exports the engine surface
  (`draw_mode`, `draw_mode_into`, `Frame`, `Dot`, `Line`, `ModeOpts`, `Proj`,
  `make_proj`, `base_profile`, `scale_counts`, `scale_radii`, `sort_dots`)
  alongside `ThinkingOrb`, `thinking_orb` and `DEFAULT_TARGET_FPS`. This also
  removed an `unused import: Proj` warning at its root cause rather than with an
  `#[allow]`.
- `OrbState`, `OrbSize` and `ModeKey` are `#[non_exhaustive]`, so shipping a
  tenth state later is not a breaking change. `OrbTheme` is deliberately left
  exhaustive — `Auto`/`Dark`/`Light` is a closed set, and forcing downstream
  wildcards on it would cost users without buying anything.
- `Cargo.toml` declares `rust-version = "1.85"` (async closures in `cx.spawn`)
  and excludes `docs/`, `scripts/` and `target/` from the package.

**Still missing before publishing:** the crate has no `repository` / `homepage`
/ `authors` metadata, because the working copy has no configured git remote.
crates.io does not require them, but they should be filled in before a release.

---

## 8. Guidance for users

Defaults are already the cheap configuration; these are the knobs if you need
more.

```rust
ThinkingOrb::new()
    .state(OrbState::Working)
    .size(OrbSize::Avatar)
    .target_fps(30.0)            // default; lower is proportionally cheaper
    .pause_when_inactive(true)   // default; false for unfocused-but-visible surfaces
```

- **Cost scales with `target_fps`.** 20 fps is still smooth for these slow
  motions and costs a third less than 30.
- **`OrbSize::Inline` (20 px) is much cheaper than `Avatar` (64 px)** — it is a
  separate tuned design with fewer dots, not a scale factor.
- **`Large` (96 px) and `Hero` (128 px) intentionally add detail.** They cost
  more than Avatar; reserve them for prominent, usually singular status UI.
- **Respect the user's motion preference.** `.reduced_motion(true)` freezes on a
  deterministic representative frame (`t = 0.6`) and cancels the timer entirely:
  zero ongoing cost.
- **Hide, don't pause, when the orb is off-screen.** A paused orb costs nothing,
  but not rendering it at all costs less than nothing.

---

## 9. Test suite

`cargo test --release` — 6 passing:

| test                                             | what it pins                                     |
| ------------------------------------------------ | ------------------------------------------------ |
| `all_states_emit_geometry`                       | every state × size emits finite, in-range dots    |
| `connecting_emits_lines`                         | the web state actually wires edges                |
| `reduced_motion_frame_is_deterministic`          | the frozen frame is reproducible                  |
| `stroke_colours_are_paintable`                   | stroke alpha/ink/width stay finite and in range   |
| `solve_cycle_survives_float_boundary_move_counts`| §6.1 panic stays fixed                            |
| `bench_geometry_cost`                            | geometry cost per mode (reports, does not assert) |

Visual regressions are covered by `scripts/golden-diff.sh` (§5) rather than by
the unit tests, since they need a live compositor.
