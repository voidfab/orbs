// The ThinkingOrbView. One shared clock (a module-wide epoch) keeps every
// mounted orb in phase; SwiftUI's TimelineView drives the frames and
// pauses automatically while offscreen. Reduced-motion users get a static
// representative frame that still follows the live theme.
//
// Every frame is a pure function of the clock — no state, no simulation —
// so pausing, resuming and re-mounting are all trivially correct.

import SwiftUI

/// Shared clock epoch — all orbs measure `t` from the same instant, so
/// same-state orbs render in phase (matching the upstream shared
/// `performance.now()` clock).
private enum ThinkingOrbClock {
    static let epoch = Date()
}

/// An animated dotted "thought orb" progress indicator.
///
/// ```swift
/// ThinkingOrbView(state: .working)                     // 64pt chat-avatar scale
/// ThinkingOrbView(state: .listening, size: .inline)    // 20pt inline-text scale
/// ```
///
/// The two size presets are separate hand-tuned designs, not a scale
/// factor. `renderSize` draws the chosen preset's tuning at a different
/// point size when the layout needs it — prefer the preset's native size.
public struct ThinkingOrbView: View {
    private let state: OrbState
    private let sizePreset: OrbSizePreset
    private let theme: OrbTheme
    private let speed: Double
    private let paused: Bool
    private let renderSize: Double?

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// - Parameters:
    ///   - state: Which animation to show.
    ///   - size: Tuned size preset — 64pt avatar or 20pt inline.
    ///   - theme: Ink theme; `.auto` follows the environment color scheme.
    ///   - speed: Animation speed multiplier on top of the preset's baked speed.
    ///   - paused: Freeze the animation on the current frame.
    ///   - renderSize: Optional point size override; the preset's tuning is
    ///     drawn at this size instead of its native one.
    public init(
        state: OrbState = .working,
        size: OrbSizePreset = .avatar,
        theme: OrbTheme = .auto,
        speed: Double = 1,
        paused: Bool = false,
        renderSize: Double? = nil
    ) {
        self.state = state
        self.sizePreset = size
        self.theme = theme
        self.speed = speed
        self.paused = paused
        self.renderSize = renderSize
    }

    private var side: Double { renderSize ?? sizePreset.points }

    private var isDark: Bool {
        switch theme {
        case .auto: return colorScheme == .dark
        case .dark: return true
        case .light: return false
        }
    }

    public var body: some View {
        let resolved = orbResolvePreset(state: state, size: sizePreset)
        Group {
            if reduceMotion {
                // one static, deterministic representative frame
                orbCanvas(t: 0.6, resolved: resolved)
            } else {
                TimelineView(.animation(minimumInterval: nil, paused: paused)) { timeline in
                    let t = timeline.date.timeIntervalSince(ThinkingOrbClock.epoch) * resolved.speed * speed
                    orbCanvas(t: t, resolved: resolved)
                }
            }
        }
        .frame(width: side, height: side)
        .accessibilityLabel(Text(state.label))
        .accessibilityAddTraits(.isImage)
    }

    private func orbCanvas(t: Double, resolved: ResolvedOrb) -> some View {
        Canvas(opaque: false, rendersAsynchronously: false) { context, canvasSize in
            let s = Double(min(canvasSize.width, canvasSize.height))
            orbModeDraw(for: resolved.mode)(context, s, t, isDark, resolved.opts)
        }
    }
}

#if DEBUG
#Preview("All states — 64pt") {
    Grid(horizontalSpacing: 24, verticalSpacing: 24) {
        GridRow {
            ForEach(Array(OrbState.allCases.prefix(3))) { ThinkingOrbView(state: $0) }
        }
        GridRow {
            ForEach(Array(OrbState.allCases.dropFirst(3).prefix(3))) { ThinkingOrbView(state: $0) }
        }
        GridRow {
            ForEach(Array(OrbState.allCases.dropFirst(6))) { ThinkingOrbView(state: $0) }
        }
    }
    .padding(32)
}

#Preview("Inline 20pt") {
    VStack(alignment: .leading, spacing: 12) {
        ForEach(OrbState.allCases) { state in
            HStack(spacing: 8) {
                ThinkingOrbView(state: state, size: .inline)
                Text(state.label)
            }
        }
    }
    .padding(32)
}
#endif
