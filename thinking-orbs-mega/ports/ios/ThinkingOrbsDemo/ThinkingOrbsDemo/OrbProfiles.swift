//
//  OrbProfiles.swift
//  ThinkingOrbsDemo
//
//  Faithful Swift port of thinking-orbs' density profiles + shipped presets
//  (src/engine/profiles.ts + src/presets.ts). `count`/`size` are multipliers
//  over the base `fine` profiles; `speed` multiplies the shared clock.
//  Resolved once per (state, size) pair and cached.
//

import Foundation

/// Mode options — the dynamic bag of tuning knobs each painter reads.
/// Mirrors TS `ModeOpts = { [key: string]: number | undefined }`.
typealias ModeOpts = [String: Double]

extension ModeOpts {
    /// Read with a default, matching TS `o.key ?? def`.
    @inlinable func o(_ key: String, _ def: Double) -> Double {
        self[key] ?? def
    }
}

// MARK: - Scaling

// 2-D lattices (rings × dots-per-ring) come in pairs — each side takes √scale
// so the TOTAL dot count scales by `scale`; flat lists scale linearly.
// `iconD` sets the morph outline's sampling density.
private let COUNT_PAIRS: [(String, String)] = [
    ("latRings", "lonDensity"),
    ("rings", "lonDensity"),
    ("lanes", "segs")
]
private let COUNT_KEYS = ["orbitN", "ghostN", "nodeN", "strandN", "signals"]
private let ICON_DENSITY_KEYS = ["iconD"]

// Every key that sets a dot's rendered radius — scaling all of them keeps a
// dot's near/far falloff intact while shrinking or growing the mark.
private let RADIUS_KEYS = [
    "rBase", "rDepth", "rActive", "rDot", "ghostR", "partR", "partRDepth",
    "nodeR", "nodeRDepth"
]

func orbScaleCounts(_ opts: ModeOpts, scale: Double) -> ModeOpts {
    var out = opts
    var done = Set<String>()
    let rt = sqrt(scale)
    for (a, b) in COUNT_PAIRS {
        if let va = out[a], let vb = out[b], !done.contains(a), !done.contains(b) {
            out[a] = max(2, orbRound(va * rt))
            out[b] = max(2, orbRound(vb * rt))
            done.insert(a)
            done.insert(b)
        }
    }
    for k in COUNT_KEYS {
        if let v = out[k], v != 0, !done.contains(k) {
            // 0 means the mode opted out of that layer (ring has no ghost
            // sphere) — scaling must not resurrect it as a single stray dot.
            out[k] = max(1, orbRound(v * scale))
        }
    }
    for k in ICON_DENSITY_KEYS {
        if let v = out[k] {
            out[k] = max(0.02, v * scale)
        }
    }
    return out
}

func orbScaleRadii(_ opts: ModeOpts, scale: Double) -> ModeOpts {
    var out = opts
    for k in RADIUS_KEYS {
        if let v = out[k] {
            out[k] = v * scale
        }
    }
    // remember the multiplier itself — spacing-derived radii (the morph
    // outline) use it, since they aren't based on any single radius key
    out["rSizeMul"] = (out["rSizeMul"] ?? 1) * scale
    return out
}

// MARK: - Base profiles

/// Base (fine) profiles per mode, before preset multipliers.
let ORB_BASE_PROFILES: [String: ModeOpts] = [
    "globe": [
        "latRings": 17, "lonDensity": 44,
        "rBase": 0.6, "rDepth": 1.7, "rBoost": 1.0,
        "inkFar": 0.62, "inkSpan": 0.54, "rsPow": 0.6, "rMin": 0.3
    ],
    "orbits": [
        "orbitN": 12, "ghostN": 40, "ghostR": 0.9, "ghostA": 0.5,
        "particles": 3, "partR": 1.2, "partRDepth": 1.6, "rsPow": 0.6, "rMin": 0.3
    ],
    "rubik": [
        "latRings": 15, "lonDensity": 40, "moveCount": 14,
        "rBase": 0.6, "rDepth": 1.7, "rActive": 0.3,
        "inkFar": 0.62, "inkSpan": 0.54, "rsPow": 0.6, "rMin": 0.3
    ],
    "wave": [
        "rings": 15, "lonDensity": 40,
        "rBase": 0.6, "rDepth": 1.7, "rsPow": 0.6, "rMin": 0.3
    ],
    "web": [
        "nodeN": 30, "thr": 0.72, "signals": 5,
        "nodeR": 1.4, "nodeRDepth": 1.8, "lineW": 0.8, "rsPow": 0.6, "rMin": 0.3
    ],
    "braid": [
        "strandN": 52, "turns": 3.0, "ghostN": 150,
        "rBase": 1.2, "rDepth": 1.8, "rsPow": 0.6, "rMin": 0.3
    ],
    "ribbon": [
        "lanes": 5, "segs": 88, "ghostN": 150,
        "rBase": 1.1, "rDepth": 1.7, "rsPow": 0.6, "rMin": 0.3
    ],
    // ring shares ribbon's painter; faceOn cancels the camera tilt and moves
    // the undulation onto the radius, and there is no ghost sphere behind it.
    "ring": [
        "lanes": 5, "segs": 88, "ghostN": 0, "faceOn": 1,
        "rBase": 1.1, "rDepth": 1.7, "rsPow": 0.6, "rMin": 0.3
    ],
    "morph": [
        "rDot": 0.021, "iconD": 1, "rMin": 0.25
    ]
]

// MARK: - Presets

/// The nine shipped states — each maps to one animation mode.
enum OrbState: String, CaseIterable, Identifiable {
    case working, searching, solving, listening
    case connecting, weaving, composing, breathing, shaping

    var id: String { rawValue }

    /// Per-state default aria label, matching the JS LABELS map.
    var label: String {
        switch self {
        case .working:    return "Working…"
        case .searching:  return "Searching…"
        case .solving:    return "Solving…"
        case .listening:  return "Listening…"
        case .connecting: return "Connecting…"
        case .weaving:    return "Weaving…"
        case .composing:  return "Composing…"
        case .breathing:  return "Thinking…"
        case .shaping:    return "Shaping…"
        }
    }
}

/// state → mode, matching presets.ts STATE_TO_MODE.
let STATE_TO_MODE: [OrbState: String] = [
    .working: "orbits", .searching: "globe", .solving: "rubik", .listening: "wave",
    .connecting: "web", .weaving: "braid", .composing: "ribbon",
    .breathing: "ring", .shaping: "morph"
]

/// The two tuned sizes (CSS points). Each is a separate design, not a scale.
enum OrbSize {
    static let large: Double = 64
    static let small: Double = 20
}

private struct Preset {
    let speed: Double
    let count: Double
    let size: Double
    let extra: ModeOpts?
}

private let PRESETS: [String: [Double: Preset]] = [
    "orbits": [
        64: Preset(speed: 1.885, count: 1, size: 1, extra: nil),
        20: Preset(speed: 3.9, count: 0.238, size: 2.4, extra: nil)
    ],
    "globe": [
        64: Preset(speed: 2.015, count: 0.42, size: 1.15, extra: ["scanMul": 4.08, "dimBase": 0.45]),
        20: Preset(speed: 2.665, count: 0.105, size: 1.75, extra: ["scanMul": 4.335, "dimBase": 0.45])
    ],
    "rubik": [
        64: Preset(speed: 1.82, count: 0.35, size: 1.05, extra: nil),
        20: Preset(speed: 1.95, count: 0.088, size: 1.9, extra: nil)
    ],
    "wave": [
        64: Preset(speed: 4.388, count: 0.341, size: 1, extra: nil),
        20: Preset(speed: 3.998, count: 0.105, size: 1.6, extra: nil)
    ],
    "web": [
        64: Preset(speed: 3.315, count: 1.35, size: 0.95, extra: nil),
        20: Preset(speed: 6.63, count: 0.25, size: 1.52, extra: nil)
    ],
    "braid": [
        64: Preset(speed: 1.625, count: 0.5, size: 1, extra: nil),
        20: Preset(speed: 2.75, count: 0.1125, size: 1.36, extra: nil)
    ],
    "ribbon": [
        64: Preset(speed: 2.34, count: 0.25, size: 0.85, extra: ["spin": 0, "bandMul": 3.9, "wobMul": 1]),
        20: Preset(speed: 3.12, count: 0.051, size: 1.073, extra: ["spin": 0, "bandMul": 4.94, "wobMul": 1])
    ],
    "ring": [
        64: Preset(speed: 3.24, count: 0.25, size: 0.956, extra: ["spin": 0, "bandMul": 3.627, "wobMul": 0.368]),
        20: Preset(speed: 3.78, count: 0.028, size: 1.622, extra: ["spin": 0, "bandMul": 3.968, "wobMul": 0.565])
    ],
    "morph": [
        64: Preset(speed: 2.405, count: 0.702, size: 0.395, extra: ["spread": 1.45]),
        20: Preset(speed: 2.08, count: 0.53, size: 1.011, extra: ["spread": 1.45])
    ]
]

/// Pick the nearest tuned preset size for an arbitrary request size.
private func presetSize(for size: Double) -> Double {
    abs(size - OrbSize.large) <= abs(size - OrbSize.small) ? OrbSize.large : OrbSize.small
}

struct OrbResolved {
    let mode: String
    let speed: Double
    let opts: ModeOpts
}

private var resolveCache: [String: OrbResolved] = [:]

/// Resolve a (state, size) pair to its mode + fully-scaled draw options.
func orbResolvePreset(_ state: OrbState, size: Double) -> OrbResolved {
    let key = "\(state.rawValue)-\(size)"
    if let hit = resolveCache[key] { return hit }

    let mode = STATE_TO_MODE[state] ?? "orbits"
    let pSize = presetSize(for: size)
    guard let base = ORB_BASE_PROFILES[mode], let preset = PRESETS[mode]?[pSize] else {
        let r = OrbResolved(mode: mode, speed: 1, opts: [:])
        resolveCache[key] = r
        return r
    }
    var opts = base
    if preset.count != 1 { opts = orbScaleCounts(opts, scale: preset.count) }
    if preset.size != 1 { opts = orbScaleRadii(opts, scale: preset.size) }
    if let extra = preset.extra {
        for (k, v) in extra { opts[k] = v }
    }
    let resolved = OrbResolved(mode: mode, speed: preset.speed, opts: opts)
    resolveCache[key] = resolved
    return resolved
}
