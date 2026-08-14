# Native ports

Three host bindings sit next to the TypeScript engine. The original nine
states are the contract they all share; extra megafork verbs live in TS first.

| Path | Host | Source |
|---|---|---|
| [`react-native/thinking-orbs-native`](./react-native/thinking-orbs-native) | React Native + Skia | Official 0.3.1 — same `thinking-orbs/engine` geometry |
| [`ios/ThinkingOrbsDemo`](./ios/ThinkingOrbsDemo) | SwiftUI `Canvas` + `TimelineView` | [netseye/ThinkingOrbsDemo](https://github.com/netseye) zip — hand-ported engine + Xcode demo |
| [`gpui`](./gpui) | GPUI (Rust) | FrancoEscob crate — original nine plus focusing / gyroscope / recalling |
| [`svelte`](./svelte) | Svelte 5 | Faithful 9-state bind |
| [`solid`](./solid) | SolidJS | 13 states — extras extracted into TS as `hypercube` / `conjuring` / `assembling` / `building` |
| [`universal`](./universal) | Vue 3 + Web Component + vanilla | Engine-decoupled adapters |
| [`svg-morphing`](./svg-morphing) | React SVG | Vector renderer; `renderer="svg"` on the megafork component |
| [`vanilla`](./vanilla) | Custom element | Schoolees — contour variant + `responding` (extracted) |
| [`react-native-views`](./react-native-views) | RN `View` (no Skia) | 6-state bind for hosts that cannot take Skia |
| [`pi`](./pi) | Pi terminal | Kitty/iTerm PNG frames |
| [`ios/ThinkingOrbs`](./ios/ThinkingOrbs) | SwiftUI + AppKit SPM | CGContext engine, two front ends |
| [`ios/ThinkingOrbsKit`](./ios/ThinkingOrbsKit) | Multiplatform SwiftUI SPM | Compact / regular / large sizes |
| [`aesthetics`](./aesthetics) | Playable sidecar demos | WebGL / glow orbs that were **not** extracted |

## React Native

Imports `thinking-orbs/engine` and paints the finished frame with Skia. Golden
vectors in `spec/orbs-golden.json` are the parity check. See that package's
README for the device-verification caveat.

## iOS / SwiftUI

An Xcode 15+ demo (`ThinkingOrbsDemo.xcodeproj`), iOS 16+. The engine is a
line-for-line Swift transcription of the nine painters (`OrbCore`,
`OrbEngine`, `OrbProfiles`) plus `ThinkingOrb` and `ShimmerText` (the web
demo's `t-shimmer`). Shared epoch clock, `accessibilityReduceMotion` static
frame, auto/dark/light.

```bash
open ports/ios/ThinkingOrbsDemo/ThinkingOrbsDemo.xcodeproj
```

This is the working SwiftUI port. `ports/ios/ThinkingOrbsKit` is the
vendored Danko SPM package (compact / regular / large).

## GPUI

Rust crate, GPUI 0.2.2, MSRV 1.85. Geometry is native Rust. Extra states
`Focusing` / `Reasoning` (gyroscope) / `Recalling` were ported back into the
TypeScript megafork as `focusing`, `pondering`, `recalling`.

```bash
cd ports/gpui
cargo run --example playground
```
