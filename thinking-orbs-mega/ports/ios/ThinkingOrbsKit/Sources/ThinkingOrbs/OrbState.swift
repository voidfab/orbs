import CoreGraphics

/// The activity represented by a ``ThinkingOrb``.
public enum OrbState: String, CaseIterable, Sendable {
    case working
    case searching
    case solving
    case listening
    case connecting
    case weaving
    case composing
    case breathing
    case shaping

    var defaultAccessibilityLabel: String {
        switch self {
        case .working: "Working"
        case .searching: "Searching"
        case .solving: "Solving"
        case .listening: "Listening"
        case .connecting: "Connecting"
        case .weaving: "Weaving"
        case .composing: "Composing"
        case .breathing: "Thinking"
        case .shaping: "Shaping"
        }
    }
}

/// A purpose-tuned orb size.
///
/// Compact, regular, and large are separate designs. They are not scaled copies.
public enum OrbSize: Double, CaseIterable, Sendable {
    case compact = 20
    case regular = 64
    case large = 128

    public var points: CGFloat { CGFloat(rawValue) }
}

/// Controls how an orb selects its monochrome ink colors.
public enum OrbTheme: Sendable {
    /// Follow the SwiftUI color-scheme environment.
    case automatic
    /// Use dark ink for a light background.
    case light
    /// Use light ink for a dark background.
    case dark
}
