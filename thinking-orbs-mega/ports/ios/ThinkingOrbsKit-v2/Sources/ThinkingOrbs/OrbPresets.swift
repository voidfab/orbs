// The shipped tunings: nine states x two sizes, baked from the upstream
// tuning session. `count`/`size` are multipliers over the base fine
// profiles; `speed` multiplies the shared clock. Resolved once at first
// use and cached — the render loop sees plain numbers.

import Foundation

/// The nine shipped states — each a hand-tuned animation.
public enum OrbState: String, CaseIterable, Identifiable, Sendable {
    /// Particles on tilted orbits.
    case working
    /// A scan meridian sweeps a dotted globe.
    case searching
    /// Bands scramble in quarter turns, then click back solved.
    case solving
    /// A waveform rolls through latitude rings.
    case listening
    /// A constellation wires itself, packets running the edges.
    case connecting
    /// Three strands plait around the sphere.
    case weaving
    /// An undulating multi-band sash.
    case composing
    /// A face-on ring slowly morphing.
    case breathing
    /// A dotted outline morphs circle -> triangle -> square.
    case shaping

    public var id: String { rawValue }

    /// Accessibility label matching the upstream defaults.
    public var label: String {
        switch self {
        case .working: return "Working…"
        case .searching: return "Searching…"
        case .solving: return "Solving…"
        case .listening: return "Listening…"
        case .connecting: return "Connecting…"
        case .weaving: return "Weaving…"
        case .composing: return "Composing…"
        case .breathing: return "Thinking…"
        case .shaping: return "Shaping…"
        }
    }
}

/// Tuned size presets. Exactly two ship: 64pt (chat-avatar scale) and
/// 20pt (inline-text scale). Each carries its own dot count, dot size and
/// speed tuning — they are separate designs, not a scale factor.
public enum OrbSizePreset: Int, CaseIterable, Sendable {
    case avatar = 64
    case inline = 20

    public var points: Double { Double(rawValue) }
}

/// Theme mode. `auto` follows the SwiftUI color scheme; `dark`/`light`
/// pin the ink regardless of context. Dark renders light ink on the
/// transparent canvas (for dark backgrounds); light renders dark ink.
public enum OrbTheme: String, CaseIterable, Sendable {
    case auto
    case dark
    case light
}

enum OrbModeKey: String {
    case orbits, globe, rubik, wave, web, braid, ribbon, ring, morph
}

extension OrbState {
    var modeKey: OrbModeKey {
        switch self {
        case .working: return .orbits
        case .searching: return .globe
        case .solving: return .rubik
        case .listening: return .wave
        case .connecting: return .web
        case .weaving: return .braid
        case .composing: return .ribbon
        case .breathing: return .ring
        case .shaping: return .morph
        }
    }
}

func orbModeDraw(for key: OrbModeKey) -> OrbModeDraw {
    switch key {
    case .orbits: return drawOrbits
    case .globe: return drawGlobe
    case .rubik: return drawRubik
    case .wave: return drawWave
    case .web: return drawWeb
    case .braid: return drawBraid
    // ring shares ribbon's painter — the `faceOn` profile flag switches it
    case .ribbon, .ring: return drawRibbon
    case .morph: return drawMorph
    }
}

private struct OrbPresetSpec {
    var speed: Double
    var count: Double
    var size: Double
    var extra: OrbOpts = [:]
}

private let orbPresetTable: [OrbModeKey: [Int: OrbPresetSpec]] = [
    .orbits: [
        64: OrbPresetSpec(speed: 1.885, count: 1, size: 1),
        20: OrbPresetSpec(speed: 3.9, count: 0.238, size: 2.4),
    ],
    .globe: [
        64: OrbPresetSpec(speed: 2.015, count: 0.42, size: 1.15, extra: ["scanMul": 4.08, "dimBase": 0.45]),
        20: OrbPresetSpec(speed: 2.665, count: 0.105, size: 1.75, extra: ["scanMul": 4.335, "dimBase": 0.45]),
    ],
    .rubik: [
        64: OrbPresetSpec(speed: 1.82, count: 0.35, size: 1.05),
        20: OrbPresetSpec(speed: 1.95, count: 0.088, size: 1.9),
    ],
    .wave: [
        64: OrbPresetSpec(speed: 4.388, count: 0.341, size: 1),
        20: OrbPresetSpec(speed: 3.998, count: 0.105, size: 1.6),
    ],
    .web: [
        64: OrbPresetSpec(speed: 3.315, count: 1.35, size: 0.95),
        20: OrbPresetSpec(speed: 6.63, count: 0.25, size: 1.52),
    ],
    .braid: [
        64: OrbPresetSpec(speed: 1.625, count: 0.5, size: 1),
        20: OrbPresetSpec(speed: 2.75, count: 0.1125, size: 1.36),
    ],
    .ribbon: [
        64: OrbPresetSpec(speed: 2.34, count: 0.25, size: 0.85, extra: ["spin": 0, "bandMul": 3.9, "wobMul": 1]),
        20: OrbPresetSpec(speed: 3.12, count: 0.051, size: 1.073, extra: ["spin": 0, "bandMul": 4.94, "wobMul": 1]),
    ],
    .ring: [
        64: OrbPresetSpec(speed: 3.24, count: 0.25, size: 0.956, extra: ["spin": 0, "bandMul": 3.627, "wobMul": 0.368]),
        20: OrbPresetSpec(speed: 3.78, count: 0.028, size: 1.622, extra: ["spin": 0, "bandMul": 3.968, "wobMul": 0.565]),
    ],
    .morph: [
        64: OrbPresetSpec(speed: 2.405, count: 0.702, size: 0.395, extra: ["spread": 1.45]),
        20: OrbPresetSpec(speed: 2.08, count: 0.53, size: 1.011, extra: ["spread": 1.45]),
    ],
]

struct ResolvedOrb {
    var mode: OrbModeKey
    var speed: Double
    var opts: OrbOpts
}

/// All 18 (state, size) combinations, resolved once at first access.
private let orbResolvedCache: [String: ResolvedOrb] = {
    var cache: [String: ResolvedOrb] = [:]
    for state in OrbState.allCases {
        for size in OrbSizePreset.allCases {
            let mode = state.modeKey
            guard let preset = orbPresetTable[mode]?[size.rawValue],
                  var opts = orbBaseProfiles[mode] else { continue }
            if preset.count != 1 { opts = orbScaleCounts(opts, preset.count) }
            if preset.size != 1 { opts = orbScaleRadii(opts, preset.size) }
            opts.merge(preset.extra) { _, new in new }
            cache["\(state.rawValue)-\(size.rawValue)"] = ResolvedOrb(mode: mode, speed: preset.speed, opts: opts)
        }
    }
    return cache
}()

/// Resolve a (state, size) pair to its mode + fully-scaled draw options.
func orbResolvePreset(state: OrbState, size: OrbSizePreset) -> ResolvedOrb {
    orbResolvedCache["\(state.rawValue)-\(size.rawValue)"]!
}
