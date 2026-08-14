# GPUI ecosystem research (optimization deps)

Research for `gpui-thinking-orbs`: are we missing a crate that works *with*
GPUI to make particle-style canvas painting cheaper?

**Date:** 2026-08-05  
**GPUI target:** 0.2.2  
**Verdict:** **No magic dependency.** Consumers should depend on `gpui` only.
Further gains come from how we use GPUI APIs and from product lifecycle
(visibility, host caching, multi-orb scheduling), not from `cargo add …`.

---

## Executive answer (non-Rust)

GPUI’s ecosystem is rich in **apps and widget kits** (tables, routers, forms)
and almost empty in **middleware that makes custom every-frame painting
cheaper**. For a canvas that draws hundreds of overlapping discs each frame,
the “library” *is* GPUI: `canvas` / `paint_quad` / `paint_path` /
`paint_layer` / timers / window focus.

There is no published crate that provides particle systems, instanced-dot
batching beyond GPUI’s built-in quads, or custom Metal/Vulkan draw passes for
mainline 0.2.x without forking the framework.

---

## Already applied (out of scope for “new discoveries”)

- `paint_layer` — avoids per-primitive `BoundsTree` insert (dominant win)
- 30 fps `BackgroundExecutor::timer` instead of display-rate RAF
- Pause when window inactive; clock subtracts paused time
- Allocation-free steady state (`draw_mode_into`, retained `Frame`, preset cache)

## Already rejected

| Idea | Why |
|------|-----|
| Stroke batching (Connecting web) | Changes blend; visibly brighter; ~0% CPU save |
| Per-frame raster → `paint_image` / atlas | ImageId forces reupload; worse after layer |
| `gpui-animation` / style-transition crates | Wrong problem; fragile private layout hacks |
| Geometry SIMD / rayon | Geometry already single-digit µs/frame |

---

## Candidate crates

| Name | Purpose | For thinking-orbs? | Recommendation |
|------|---------|--------------------|----------------|
| **gpui 0.2.2** | Core UI + paint | Yes — this is the API | **Keep** |
| gpui-macros / gpui_util / gpui_collections | Framework internals | No | Ignore (transitive only) |
| gpui-component (Longbridge) | 60+ desktop widgets | UI chrome only | Ignore for orbs |
| gpui-animation | Element style transitions | Wrong problem | Ignore |
| gpui-d3rs / gpui-px / plotters-gpui / gpui-plot | Charts | Same `paint_*`; no new batching | Reference code only |
| gpui-whiteboard | Infinite canvas ink | Wrong domain / license | Ignore |
| gpui-router / hooks / tea / form / storybook | App structure | No | Ignore |
| gpui-video-player | Video surfaces | No | Ignore |
| **gpui-ce** (community fork) | Extra non-Zed features | Only if abandoning mainline | **Not a small dep** |

Sources: [awesome-gpui](https://github.com/zed-industries/awesome-gpui),
[gpui docs 0.2.2](https://docs.rs/gpui/0.2.2/gpui/),
[Zed rendering blog](https://zed.dev/blog/videogame),
[canvas discussion #41673](https://github.com/zed-industries/zed/discussions/41673),
[overdraw #8043](https://github.com/zed-industries/zed/issues/8043).

---

## Remaining optimization ideas (no new crates)

Ranked for stock gpui 0.2.2 after the measured pass (~2% / orb, ~4.3% / 12):

1. **Pause when not visible / fully clipped** — complement focus-pause; scroll-away orbs → ~0% CPU.
2. **Host embedding docs: `AnyView::cached`** — static chrome while orb ticks (app-level win).
3. **Multi-orb shared clock / single parent canvas** — scales to dozens of orbs.
4. **FPS / density policy** — e.g. 20–24 fps defaults, density LOD for multi-orb dashboards.
5. **Dedicated `Element` instead of per-frame `canvas` closures** — small alloc/indirection save.

**Not worth it:** custom shaders via framework fork unless product decides to leave mainline GPUI.

---

## Links

- https://gpui.rs/
- https://docs.rs/gpui/0.2.2/gpui/
- https://github.com/zed-industries/awesome-gpui
- https://zed.dev/blog/videogame
- https://github.com/zed-industries/zed/discussions/41673
- https://github.com/zed-industries/zed/issues/8043
- https://github.com/gpui-ce/gpui-ce
- Local measurement: [`PERFORMANCE_RESULTS.md`](./PERFORMANCE_RESULTS.md)
