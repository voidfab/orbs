//
//  ThinkingOrb.swift
//  ThinkingOrbsDemo
//
//  The SwiftUI ThinkingOrb component — a faithful Swift port of the
//  React/Canvas original (https://github.com/Jakubantalik/thinking-orbs).
//  One shared clock (elapsed seconds since first use) keeps every mounted
//  orb in phase; reduced-motion users get a single static frame that still
//  follows the live theme.
//

import SwiftUI

/// Theme mode: `auto` resolves from the environment, `dark`/`light` pin it.
enum OrbTheme { case auto, dark, light }

/// A label with a flowing highlight sweep — a Swift port of the demo's
/// `t-shimmer` (transitions.dev): calm dim base text with a soft bright band
/// that crosses left→right every 2 s, so orb labels feel alive. Ink mirrors on
/// dark (white 50 % base / #fff highlight) and light (black 45 % base / #0d0d0d
/// highlight). Reduced-motion users get the base only, no sweep.
struct ShimmerText: View {
    let text: String
    var font: Font = .subheadline

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Shared launch clock so labels sweep in phase (matches the orbs' epoch).
    private static let epoch = Date.timeIntervalSinceReferenceDate
    private static let duration: Double = 2.0

    private var base: Color {
        colorScheme == .dark ? Color.white.opacity(0.5) : Color.black.opacity(0.45)
    }
    private var highlight: Color {
        colorScheme == .dark ? .white : Color(white: 0.05)
    }

    var body: some View {
        // Driven by the animation timeline (same loop the orbs use). The bright
        // band is a FIXED leading→trailing gradient whose RECTANGLE is offset
        // across the glyphs — offset is a Core Animation transform, so it always
        // repaints (mutating a gradient's UnitPoint inside `.mask` does not, on
        // iOS 26). One 2 s cycle sweeps left→right with overshoot either side.
        TimelineView(.animation(paused: reduceMotion)) { timeline in
            let p = (timeline.date.timeIntervalSinceReferenceDate - Self.epoch)
                .truncatingRemainder(dividingBy: Self.duration) / Self.duration
            Text(text)
                .font(font)
                .foregroundStyle(base)
                .overlay {
                    // the ::before layer: same glyphs filled bright, revealed only
                    // where the moving band is opaque. Stops mirror the CSS
                    // `transparent 0/40 % → highlight 50 % → transparent 60/100 %`.
                    // Reduced motion → no overlay, just the calm base.
                    if !reduceMotion {
                        Text(text)
                            .font(font)
                            .foregroundStyle(highlight)
                            .mask(
                                GeometryReader { geo in
                                    let w = geo.size.width
                                    let bandW = max(8, w * 0.42)
                                    let x = -bandW + (w + 2 * bandW) * p   // left off → right off
                                    LinearGradient(
                                        stops: [
                                            .init(color: .clear, location: 0.00),
                                            .init(color: .clear, location: 0.40),
                                            .init(color: .white, location: 0.50),
                                            .init(color: .clear, location: 0.60),
                                            .init(color: .clear, location: 1.00)
                                        ],
                                        startPoint: .leading, endPoint: .trailing
                                    )
                                    .frame(width: bandW, height: geo.size.height)
                                    .offset(x: x)
                                }
                            )
                    }
                }
        }
    }
}

struct ThinkingOrb: View {
    /// Which animation to show.
    var state: OrbState = .working
    /// Rendered size in points (64 chat-avatar preset, 20 inline-text preset).
    var size: CGFloat = 64
    /// Animation speed multiplier on top of the preset's baked speed.
    var speed: Double = 1.0
    /// Freeze the animation on the current frame.
    var paused: Bool = false
    /// Theme resolution.
    var theme: OrbTheme = .auto
    /// Overrides the per-state default accessibility label.
    var label: String? = nil

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Shared epoch so every instance ticks in phase (mirrors the JS shared
    /// clock) and `t` stays a small elapsed value (no float precision loss).
    private static let epoch = Date.timeIntervalSinceReferenceDate

    private var isDark: Bool {
        switch theme {
        case .auto:  return colorScheme == .dark
        case .dark:  return true
        case .light: return false
        }
    }

    var body: some View {
        TimelineView(.animation(paused: paused || reduceMotion)) { timeline in
            Canvas { ctx, canvasSize in
                let resolved = orbResolvePreset(state, size: Double(size))
                let now = timeline.date.timeIntervalSinceReferenceDate
                // reduced motion → one static, deterministic frame
                let t = reduceMotion ? 0.6 : (now - Self.epoch) * resolved.speed * speed
                let side = Double(min(canvasSize.width, canvasSize.height))
                orbDrawMode(resolved.mode, &ctx, size: side, t: t, dark: isDark, opts: resolved.opts)
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel(label ?? state.label)
        .accessibilityAddTraits(.updatesFrequently)
    }
}
