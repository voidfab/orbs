import SwiftUI

/// A dotted, animated activity indicator for AI and agent interfaces.
public struct ThinkingOrb: View {
    private let state: OrbState
    private let size: OrbSize
    private let theme: OrbTheme
    private let speed: Double
    private let paused: Bool
    private let label: String?

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    public init(
        state: OrbState = .working,
        size: OrbSize = .regular,
        theme: OrbTheme = .automatic,
        speed: Double = 1,
        paused: Bool = false,
        accessibilityLabel: String? = nil
    ) {
        self.state = state
        self.size = size
        self.theme = theme
        self.speed = speed
        self.paused = paused
        self.label = accessibilityLabel
    }

    public var body: some View {
        let shouldPause = paused || reduceMotion || scenePhase != .active
        let dark = switch theme {
        case .automatic: colorScheme == .dark
        case .light: false
        case .dark: true
        }

        TimelineView(.animation(minimumInterval: 1 / 60, paused: shouldPause)) { timeline in
            let preset = OrbPreset.resolve(state: state, size: size)
            OrbFrameView(
                state: state,
                size: size,
                dark: dark,
                time: reduceMotion
                    ? 0.6
                    : timeline.date.timeIntervalSinceReferenceDate * preset.speed * speed
            )
        }
        .frame(width: size.points, height: size.points)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(label ?? state.defaultAccessibilityLabel))
    }
}
