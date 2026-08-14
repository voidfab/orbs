# Performance audit & extreme optimization brief — `gpui-thinking-orbs`

**Audience:** coding agent (Claude / Grok / etc.) tasked with a second-pass re-analysis and **extreme optimization** of this crate.  
**Date of measurements:** 2026-08-04  
**Crate path:** `/home/franescob/Projects/gpui-thinking-orbs`  
**GPUI version:** `0.2.2`  
**Upstream visual source:** [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) / [orbs.jakubantalik.com](https://orbs.jakubantalik.com/) (MIT, Jakub Antalik)  
**Do not break visual fidelity** of the nine hand-tuned states × two sizes unless an optimization is proven pixel-equivalent or the brief explicitly allows a controlled quality tradeoff.

---

## 0. Mission for the implementer agent

1. **Re-read this document + the full source tree.**
2. **Re-measure** (geometry microbench + live playground CPU/RSS) on the target machine; do not trust numbers blindly if hardware differs.
3. **Optimize to the extreme** within constraints:
   - Keep public API stable *or* document breaking changes and migrate the playground.
   - Keep all 9 states + Avatar(64) / Inline(20) presets behaviorally faithful.
   - Prefer correctness + determinism of animation math over micro-hacks that change motion feel.
4. **Prove wins** with before/after: geometry µs/frame, playground `%CPU` + `RSS`, and optional multi-orb stress test.
5. Ship code changes in this repo; update this file or add `docs/PERFORMANCE_RESULTS.md` with new numbers.

### Success criteria (targets)

| Metric | Current (approx) | Target after extreme opt |
|--------|------------------|---------------------------|
| Geometry worst case (composing/64) | ~32 µs/frame | ≤ 15 µs (nice-to-have; not the bottleneck) |
| Playground 1× orb continuous CPU | ~14–17% of one core | **≤ 5%** (ideally ≤ 3%) at 30 fps |
| Multi-orb: 12× Avatar simultaneous | unmeasured / expected bad | **≤ 15%** CPU with offscreen pause + 30 fps |
| Per-frame heap allocs (orb only) | high (new Vec every frame) | **~0** steady-state (reuse buffers) |
| RAM of one orb entity | negligible (~KB) | still negligible |
| Visual | matches presets | still matches (or document intentional 30 fps / reduced-motion) |

---

## 1. What this library is

Native **GPUI** port of web “thinking orbs”: dotted 3D-looking status indicators for AI/agent UIs.

| Layer | Role | GPUI? |
|-------|------|-------|
| `src/engine/*` | Pure math: produce `Frame { dots, lines }` | No |
| `src/presets.rs` | 9 states × 2 sizes speed/count/radius tables | No |
| `src/paint.rs` | `Frame` → GPUI `paint_quad` / `paint_path` | Yes |
| `src/widget.rs` | `ThinkingOrb` view + continuous animation | Yes |
| `examples/playground.rs` | Interactive gallery | Yes |

**Public entry:** `ThinkingOrb` entity implementing `Render`.  
**Power-user entry:** `resolve_preset` + `draw_mode` for custom paint backends.

### States → modes

| `OrbState` | `ModeKey` | Painter |
|------------|-----------|---------|
| Working | Orbits | `orbits.rs` |
| Searching | Globe | `lattice.rs` `draw_globe` |
| Solving | Rubik | `lattice.rs` `draw_rubik` |
| Listening | Wave | `lattice.rs` `draw_wave` |
| Connecting | Web | `web.rs` |
| Weaving | Braid | `braid.rs` |
| Composing | Ribbon | `ribbon.rs` |
| Breathing | Ring | `ribbon.rs` + `face_on` |
| Shaping | Morph | `morph.rs` |

---

## 2. Hot path (read this carefully)

### 2.1 Every animation frame today

```
request_animation_frame
  → notify ThinkingOrb entity
  → Render::render
      → resolve_preset(state, size)     // rebuilds ModeOpts (scale counts/radii)
      → opts.clone()
      → draw_mode(mode, size, t, &opts) // allocates Vec<Dot>, may allocate lines
          → sort_dots (unstable sort by z)
      → canvas paint closure captures Frame
          → for each line: PathBuilder::stroke + build() + paint_path
          → for each dot:  paint_quad (rounded rect as disk)
          → request_animation_frame again if animate
```

**Critical file:** `src/widget.rs` (`impl Render for ThinkingOrb`).  
**Critical file:** `src/paint.rs` (`paint_dots` / `paint_lines`).  
**Critical file:** `src/engine/mod.rs` (`draw_mode` + `sort_dots`).

### 2.2 Why this is expensive for “simple dots”

Geometry cost is **tiny** (see §3). The expensive part is:

1. **Full view invalidation at display refresh rate (~60 Hz)** forever while mounted.
2. **Hundreds of independent GPUI quads** per frame (scene graph / batching overhead on CPU).
3. **Per-frame heap allocation** of the entire dot list (+ path tessellation for web edges).
4. **No offscreen / unfocused pause** (unlike upstream web `IntersectionObserver` + `visibilitychange`).
5. **Preset resolution + clone every frame** even when state/size are constant.

This is a classic “prototype-correct, production-naïve” animation loop.

---

## 3. Measurements (baseline 2026-08-04)

### 3.1 Geometry-only microbench (release, no GPU)

Command used:

```bash
cargo test --release bench_geometry_cost -- --nocapture
```

Test lives in `src/engine/tests.rs` (`bench_geometry_cost`).  
Method: 20 warmup frames + 1000 timed `draw_mode` calls per state×size.

| state | size | avg dots | avg lines | µs/frame | ~geom fps |
|-------|------|----------|-----------|----------|-----------|
| working | 64 | 516 | 0 | **22.1** | ~45k |
| working | 20 | 39 | 0 | 1.8 | ~563k |
| searching | 64 | 204 | 0 | 13.8 | ~73k |
| searching | 20 | 54 | 0 | 3.4 | ~293k |
| solving | 64 | 138 | 0 | 10.0 | ~100k |
| solving | 20 | 30 | 0 | 2.1 | ~473k |
| listening | 64 | 134 | 0 | 4.3 | ~232k |
| listening | 20 | 42 | 0 | 1.3 | ~789k |
| connecting | 64 | 47 | **89** | 9.0 | ~112k |
| connecting | 20 | 9 | 0 | 1.2 | ~831k |
| weaving | 64 | 153 | 0 | 6.6 | ~152k |
| weaving | 20 | 35 | 0 | 1.3 | ~801k |
| **composing** | **64** | **566** | 0 | **32.2** | ~31k |
| composing | 20 | 208 | 0 | 11.2 | ~89k |
| breathing | 64 | 484 | 0 | 26.9 | ~37k |
| breathing | 20 | 120 | 0 | 5.5 | ~182k |
| shaping | 64 | 24 | 0 | 3.2 | ~312k |
| shaping | 20 | 18 | 0 | 3.2 | ~311k |

**Conclusion:** even worst-case geometry is **≪ 1 ms**. At 60 fps budget (16.7 ms), geometry uses **&lt; 0.2%** of the frame. Optimizing only `sin`/`cos` is **not** the mission unless free.

### 3.2 Live playground process (release)

```bash
cargo build --release --example playground
./target/release/examples/playground
# sample with ps /proc
```

| Metric | Value |
|--------|--------|
| RSS | **~125 MB** |
| VSZ | ~1.0 GB |
| CPU (steady, animating) | **~14–17%** |
| Threads | 18 |

**Interpretation:**

- RSS is dominated by **GPUI + Vulkan/GPU stack + window**, not the orb buffer.
- Continuous **~15% CPU for one 64px animation** is **too high** for a status indicator in a real agent app.
- Expect most of that CPU in **window redraw / scene recording / presentation**, driven by per-frame notify.

### 3.3 What was *not* measured (do these)

- [ ] `perf record` / flamegraph of playground (top symbols)
- [ ] GPU busy % (intel_gpu_top / amdgpu_top / nvidia-smi dmon)
- [ ] N orbs in one window (1, 4, 12, 32) CPU vs N
- [ ] Allocations per frame (`dhat`, `heaptrack`, or counting `Vec` with a test hook)
- [ ] CPU when `paused=true` and when window minimized/unfocused
- [ ] Compare 60 fps vs 30 fps vs 15 fps subjectively + CPU

---

## 4. Architectural issues (ordered by impact)

### P0 — Continuous 60 Hz invalidation

**Where:** `widget.rs` → `window.request_animation_frame()` every paint while `animate`.

**Problem:** Couples animation to every display frame; never backs off.

**Fix directions (pick aggressively):**

1. **Frame budget / FPS cap (default 30 for status UI):**  
   track `last_frame: Instant`; only `request_animation_frame` if `elapsed >= 1/target_fps`.  
   Still compute `t` from wall clock so speed feels correct (do **not** advance a discrete step counter that couples motion to FPS unless intentional).
2. **Optional `target_fps: Option<f32>`** on `ThinkingOrb` (default `Some(30.0)`, `None` = uncapped).
3. **Pause when app/window not focused** if GPUI exposes focus/visibility (check `Window` APIs in gpui 0.2.2).
4. **Pause when not visible** (see P0b).

### P0b — No offscreen / hidden pause

**Upstream web:** `IntersectionObserver` + `document.visibilityState`.  
**Us:** animates forever if entity is mounted.

**Fix directions:**

- On paint, if bounds size is zero / clipped fully → stop RAF.
- If GPUI provides visibility or occlusion hooks, use them.
- Public API: `set_visible(bool)` for host list virtualization.
- When paused for visibility, do **not** notify every frame.

### P1 — Per-frame allocations

**Where:**

- `draw_mode` → new `Vec<Dot>` / `Vec<Line>` every call.
- `sort_dots` may allocate.
- `widget`: `resolved.opts.clone()` every render.
- `resolve_preset` rebuilds scaled opts every call (no cache in widget; presets.rs has no runtime cache either after port — original TS cached in a `Map`).

**Fix directions:**

1. Cache `Resolved` on `ThinkingOrb` fields; invalidate only when `state`/`size` change.
2. Store `frame_buf: Frame` (or `Vec<Dot>` + `Vec<Line>`) on the entity; `clear()` + reuse capacity.
3. Change engine API to:

   ```rust
   pub fn draw_mode_into(mode: ModeKey, size: f32, t: f32, opts: &ModeOpts, out: &mut Frame);
   ```

   Keep `draw_mode` as thin wrapper allocating for tests/power users.
4. Precompute capacity: after first frame, `dots.reserve(n)`.
5. Consider **radix / bucket sort** only if sort shows up in profiles (unlikely after paint fixes).

### P1 — One GPUI primitive per dot (scene tax)

**Where:** `paint.rs` `paint_dots` → `window.paint_quad` in a loop (up to ~566 times).

**Problem:** Scene-building CPU scales with dot count; GPU is barely involved.

**Fix directions (increasing aggressiveness):**

| Level | Approach | Fidelity risk | Expected win |
|-------|----------|---------------|--------------|
| A | Keep quads; reduce dots only if needed | low | low |
| B | Batch: fewer larger draws if API allows | med | med |
| C | **CPU rasterize orb to `Image` / Rgba buffer (size×size×dpr), paint one image** | low if careful | **high** |
| D | Custom element + single textured quad updated each frame | low | **high** |
| E | GPU particle shader (if GPUI custom shader path exists) | high effort | highest at scale |

**Recommended extreme path for this crate:** **Level C or D**.

Sketch for C:

1. Allocate `Vec<u8>` buffer `w*h*4` (w=h=ceil(size * dpr), dpr capped at 2 like upstream).
2. Clear transparent.
3. For each z-sorted dot: splat a soft/hard disk with alpha (match current solid disks first).
4. Upload / create GPUI image once; update pixels each frame (or double-buffer).
5. `paint` one image in bounds.

**Must match:** monochrome ink, dark/light mirror (`white` → lightness), alpha, z-order.

Check GPUI 0.2.2 APIs for: `RenderImage`, image elements, `paint_image`, or canvas-to-texture. Inspect:

```
~/.cargo/registry/src/*/gpui-0.2.2/src/elements/img.rs
~/.cargo/registry/src/*/gpui-0.2.2/examples/
```

If image update is expensive, try **dirty skip**: if motion is slow, only update every 2nd frame (pairs with 30 fps).

### P1 — Connecting lines: path per edge

**Where:** `paint_lines` builds + tessellates **one path per line**.

**Fix:** Single `PathBuilder::stroke` with multiple move/line segments if stroke API allows multi-subpath with constant width; or rasterize lines into the same CPU buffer as dots (Level C makes this free).

### P2 — `resolve_preset` / `ModeOpts` weight

`ModeOpts` is a large struct of `Option<f32>`. Cloning and rebuilding is wasteful.

**Fix:**

- Cache `Resolved` on widget.
- Optionally store `ModeOpts` as plain `f32` fields after resolve (no Option) in a `ResolvedOpts` packed struct for draw loops.
- Restore TS-style process-wide cache keyed by `(state, size)` if multiple orbs share presets (they do).

### P2 — Sort every frame

Necessary for correct occlusion with alpha disks. Keep unless rasterizer draws in order without needing a full sort (e.g. painter’s algorithm already from generation order — **verify**, currently dots are **not** guaranteed sorted until `sort_dots`).

### P3 — Playground itself

Playground rebuilds a large UI tree; when only the child orb notifies, parent may not re-render — verify. If full window still clears every frame, that’s compositor behavior. Don’t optimize playground chrome before widget.

### P3 — Math micro-opts (only after profiles)

- `make_proj` boxes a `Projector` every call (`Box<dyn Fn>` in `core.rs`) — **allocates every draw_mode!**  

  ```rust
  pub fn make_proj(...) -> Projector // Box<dyn Fn...>
  ```

  **This is a real engine bug/alloc.** Replace with a stack `struct Proj { st, ct, sy, cyw, cx, cy, scale }` + `fn project(&self, x,y,z) -> (f32,f32,f32)`.  
  **Do this early — free win, zero fidelity risk.**

- Avoid `fib_dir` recompute if ghost lattice static for a mode (cache unit directions per `ghost_n`).
- `draw_web` O(n²) edges: n is small (≤30); fine.
- Rubik `make_moves` every frame: precompute when `move_count` fixed.

---

## 5. Concrete optimization backlog (execute in order)

### Phase A — Quick wins (must ship)

1. **Unbox projector** — `Proj` struct, no `Box<dyn Fn>` (`core.rs` + all call sites).
2. **Cache `Resolved` on `ThinkingOrb`**; invalidate on `set_state` / `set_size`.
3. **`draw_mode_into` + reusable `Frame` on widget.**
4. **FPS cap default 30**; API `target_fps(f32)` / `uncapped()`.
5. **Skip RAF when `paused` or `reduced_motion`** (already mostly true); ensure paused doesn’t still notify.
6. **Single PathBuilder for all web lines** if still using path paint.
7. **Process-wide preset cache** (mutex or `OnceLock<HashMap<...>>`).

### Phase B — Extreme paint path

8. **CPU raster backend** behind feature or automatic:
   - `paint_strategy: Quads | Raster`
   - Default **Raster** for production; keep Quads for debugging.
9. Cap DPR at 2; size buffer to `ceil(size * dpr)`.
10. Optionally regenerate raster at 30 Hz even if window is 60 Hz.

### Phase C — Lifecycle / multi-orb

11. Visibility API + auto-pause.
12. Window focus pause.
13. Shared animation clock (optional): many orbs read the same `t` without each scheduling RAF — **one** animator entity drives N orbs, or a global frame ticker.  
    This is the real multi-orb win: **1 notify/frame for the app region**, not N.

### Phase D — Validation

14. Re-run geometry bench; add `bench_raster_cost` if raster exists.
15. Stress example: `examples/stress.rs` with 1/4/12/32 orbs + CPU print every 2s.
16. Snapshot / golden tests optional: hash raster bytes at fixed `t` for each state×size.
17. Document results in `docs/PERFORMANCE_RESULTS.md`.

---

## 6. Files to touch (checklist)

| File | Likely changes |
|------|----------------|
| `src/engine/core.rs` | `Proj` struct; kill `Box` projector; maybe `Frame::clear` |
| `src/engine/*.rs` | use `Proj`; optional `draw_*_into` |
| `src/engine/mod.rs` | `draw_mode_into` |
| `src/presets.rs` | global cache |
| `src/paint.rs` | batched lines; raster path; strategy enum |
| `src/widget.rs` | cache, FPS, buffer reuse, visibility, strategy |
| `src/types.rs` | maybe `PaintStrategy`, fps helpers |
| `src/lib.rs` | re-exports |
| `examples/playground.rs` | controls for fps / strategy if useful |
| `examples/stress.rs` | **new** |
| `src/engine/tests.rs` | keep benches; add determinism for raster |
| `README.md` | perf notes, defaults (30 fps) |

**Do not** expand scope to re-theme UI or rewrite playground aesthetics.

---

## 7. Constraints & non-goals

### Constraints

- **Visual fidelity:** presets, speeds, dot counts, depth shading, dark/light ink mirror must remain.
- **License:** MIT; keep attribution to thinking-orbs / Jakub Antalik.
- **GPUI 0.2.x:** work with current dependency; don’t require unreleased Zed forks unless unavoidable.
- **Determinism:** same `(state, size, t, dark)` → same geometry (and same raster if applicable).

### Non-goals

- Web/React parity of DOM theme detection (we use `WindowAppearance`).
- Supporting iced/egui in this pass (engine is already backend-agnostic; don’t build extra backends now).
- Changing the nine creative animations’ *character* for performance (reduce dots only if measured necessary and documented).

### Allowed tradeoffs (document if used)

- Default 30 fps instead of 60.
- Hard disks vs slight AA difference when rasterizing.
- Slightly lower DPR on high-DPI if CPU-bound (prefer dpr=2 first).

---

## 8. API suggestions after optimization

Keep builder style; extend rather than break when possible:

```rust
ThinkingOrb::new()
    .state(OrbState::Searching)
    .size(OrbSize::Avatar)
    .theme(OrbTheme::Auto)
    .speed(1.0)
    .target_fps(30.0)          // new; default 30
    .paint_strategy(PaintStrategy::Raster) // new; default Raster
    .paused(false)
    .reduced_motion(false)
```

Power user:

```rust
let mut frame = Frame::new();
draw_mode_into(mode, 64.0, t, &opts, &mut frame);
// paint or rasterize
```

---

## 9. How to re-measure (copy-paste)

### Geometry

```bash
cd /home/franescob/Projects/gpui-thinking-orbs
cargo test --release bench_geometry_cost -- --nocapture
```

### Playground CPU/RSS

```bash
cargo build --release --example playground
./target/release/examples/playground &
PID=$!
sleep 3
ps -o pid,rss,pcpu,pmem,etime,cmd -p $PID
rg "^(VmRSS|Threads)" /proc/$PID/status
# sample again after 5s
sleep 5
ps -o pid,rss,pcpu,etime -p $PID
kill $PID
```

### Optional flamegraph

```bash
# if cargo-flamegraph / perf available
cargo build --release --example playground
perf record -g -- ./target/release/examples/playground
# run ~10s, quit app, then
perf report
```

### Multi-orb stress (after you add it)

```bash
cargo run --release --example stress -- --count 12 --fps 30
```

---

## 10. Known code smells (grep-friendly)

| Smell | Location | Note |
|-------|----------|------|
| `Box<dyn Fn` / `Projector` | `engine/core.rs` `make_proj` | **heap alloc every frame per mode** |
| `request_animation_frame` | `widget.rs` | uncapped loop |
| `resolve_preset` in `render` | `widget.rs` | recompute every frame |
| `opts.clone()` | `widget.rs` | unnecessary if cached |
| `paint_quad` loop | `paint.rs` | N scene nodes |
| `PathBuilder` per line | `paint.rs` | N tessellations |
| `dots.sort_by` | `engine/core.rs` `sort_dots` | every frame |
| No visibility pause | `widget.rs` | multi-orb killer |
| `ModeOpts` all Options | `profiles.rs` | fine for config; pack after resolve |

---

## 11. Reference: upstream web behavior worth porting for perf

From thinking-orbs (TypeScript):

- Shared clock (`performance.now`) so instances stay in phase.
- **Pause when offscreen** (`IntersectionObserver`).
- **Pause when tab hidden**.
- `prefers-reduced-motion` → static frame `t = 0.6`.
- DPR capped at 2.
- Plain 2D canvas fills only (one surface) — **this is why web feels cheap**.

The GPUI port currently matches the **math** more than the **lifecycle/perf discipline**.

---

## 12. Suggested implementation plan for the agent (timeboxed)

1. **Day-0 audit:** confirm flamegraph top stacks (expect paint/scene/RAF, not sin/cos).
2. **Phase A** fully (projector unbox + cache + buffer reuse + 30 fps). Re-measure CPU — expect large drop.
3. If CPU still &gt; 5% for 1 orb: **Phase B raster**.
4. **Phase C** shared clock + visibility for multi-orb.
5. Write `docs/PERFORMANCE_RESULTS.md` with tables.
6. Ensure `cargo test` green; playground still works.

---

## 13. Acceptance checklist (agent must complete)

- [ ] `cargo test` passes (including geometry bench).
- [ ] Playground runs; all 9 states animate and look correct light/dark.
- [ ] Default animation does not spin at uncapped 60 without reason (document default fps).
- [ ] Steady-state animation does not allocate a new `Vec` of dots every frame (verify via code review + optional dhat).
- [ ] `make_proj` no longer boxes a closure each call.
- [ ] Before/after CPU numbers recorded.
- [ ] Multi-orb story documented (even if “pause when offscreen + 30 fps is enough”).
- [ ] README mentions performance defaults and `PaintStrategy` if exposed.

---

## 14. Baseline verdict (for context, not dogma)

| Area | Grade |
|------|--------|
| Animation math fidelity | A |
| Geometry cost | A |
| GPUI integration efficiency | C |
| Lifecycle (offscreen/focus) | D |
| Allocation hygiene | D |
| Multi-orb readiness | D |
| Overall for single status orb | **B−** usable, not excellent |
| Overall for dense agent UIs | **D** without Phase A–C |

**Bottom line for the optimizer:**  
The port is **correct and faithful**, not **perf-engineered**. Extreme optimization = **stop treating 500 dots as 500 UI nodes at 60 Hz**, fix **hidden allocs** (`Box` projector, per-frame `Vec`), **cap FPS**, **pause when invisible**, and ideally **rasterize to one image**.

---

## 15. Contact points in repo

```
gpui-thinking-orbs/
  Cargo.toml
  README.md
  docs/PERFORMANCE_AUDIT.md    ← this file
  src/lib.rs
  src/widget.rs                ← primary animation loop
  src/paint.rs                 ← primary GPU/scene cost
  src/presets.rs
  src/types.rs
  src/engine/
    mod.rs
    core.rs                    ← Proj Box smell
    orbits.rs lattice.rs web.rs braid.rs ribbon.rs morph.rs profiles.rs
    tests.rs                   ← benches
  examples/playground.rs
```

---

*End of brief. Re-analyze with tools, then optimize in Phase order. Prefer measured wins over theoretical micro-opts.*
