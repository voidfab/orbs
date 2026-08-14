import Foundation

struct OrbDot: Equatable, Sendable {
    var x: Double
    var y: Double
    var z: Double
    var radius: Double
    var ink: Double
    var alpha: Double = 1
}

struct OrbLine: Equatable, Sendable {
    var x1: Double
    var y1: Double
    var x2: Double
    var y2: Double
    var ink: Double
    var alpha: Double = 1
    var width: Double
}

struct OrbFrame: Equatable, Sendable {
    var dots: [OrbDot] = []
    var lines: [OrbLine] = []
    var minimumRadius: Double = 0.3
}

enum OrbMode: CaseIterable, Sendable {
    case orbits
    case globe
    case rubik
    case wave
    case web
    case braid
    case ribbon
    case ring
    case morph
}

enum OrbOption: Hashable, Sendable {
    case latRings, lonDensity, rings
    case radiusBase, radiusDepth, radiusBoost, radiusActive
    case inkFar, inkSpan, radiusScalePower, minimumRadius
    case orbitCount, ghostCount, ghostRadius, ghostAlpha, particles, particleRadius, particleRadiusDepth
    case moveCount
    case nodeCount, threshold, signals, nodeRadius, nodeRadiusDepth, lineWidth, spread
    case strandCount, turns
    case lanes, segments, spin, bandMultiplier, wobbleMultiplier, faceOn
    case iconDensity, dotRadius
    case scanMultiplier, dimBase
}

struct OrbOptions: Equatable, Sendable {
    var values: [OrbOption: Double]

    subscript(_ key: OrbOption, default fallback: Double) -> Double {
        values[key] ?? fallback
    }

    mutating func scale(_ key: OrbOption, by multiplier: Double) {
        guard let value = values[key] else { return }
        values[key] = value * multiplier
    }
}
