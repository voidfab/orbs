import Foundation

struct OrbPreset: Equatable, Sendable {
    let mode: OrbMode
    let speed: Double
    let options: OrbOptions

    static func resolve(state: OrbState, size: OrbSize) -> OrbPreset {
        let mode = mode(for: state)
        let tuning = tuning(for: mode, size: size)
        var options = baseOptions(for: mode)
        scaleCounts(&options, by: tuning.count)
        scaleRadii(&options, by: tuning.radius)
        for (key, value) in tuning.extra {
            options.values[key] = value
        }
        return OrbPreset(mode: mode, speed: tuning.speed, options: options)
    }

    private static func mode(for state: OrbState) -> OrbMode {
        switch state {
        case .working: .orbits
        case .searching: .globe
        case .solving: .rubik
        case .listening: .wave
        case .connecting: .web
        case .weaving: .braid
        case .composing: .ribbon
        case .breathing: .ring
        case .shaping: .morph
        }
    }

    private struct Tuning {
        let speed: Double
        let count: Double
        let radius: Double
        var extra: [OrbOption: Double] = [:]
    }

    private static func tuning(for mode: OrbMode, size: OrbSize) -> Tuning {
        switch (mode, size) {
        case (.orbits, .large):
            Tuning(speed: 1.65, count: 1.35, radius: 0.78)
        case (.orbits, .regular):
            Tuning(speed: 1.885, count: 1, radius: 1)
        case (.orbits, .compact):
            Tuning(speed: 3.9, count: 0.238, radius: 2.4)
        case (.globe, .large):
            Tuning(
                speed: 1.85,
                count: 0.68,
                radius: 0.8,
                extra: [.scanMultiplier: 4.08, .dimBase: 0.45]
            )
        case (.globe, .regular):
            Tuning(
                speed: 2.015,
                count: 0.42,
                radius: 1.15,
                extra: [.scanMultiplier: 4.08, .dimBase: 0.45]
            )
        case (.globe, .compact):
            Tuning(
                speed: 2.665,
                count: 0.105,
                radius: 1.75,
                extra: [.scanMultiplier: 4.335, .dimBase: 0.45]
            )
        case (.rubik, .large):
            Tuning(speed: 1.65, count: 0.55, radius: 0.78)
        case (.rubik, .regular):
            Tuning(speed: 1.82, count: 0.35, radius: 1.05)
        case (.rubik, .compact):
            Tuning(speed: 1.95, count: 0.088, radius: 1.9)
        case (.wave, .large):
            Tuning(speed: 4.0, count: 0.55, radius: 0.78)
        case (.wave, .regular):
            Tuning(speed: 4.388, count: 0.341, radius: 1)
        case (.wave, .compact):
            Tuning(speed: 3.998, count: 0.105, radius: 1.6)
        case (.web, .large):
            Tuning(speed: 3.0, count: 1.7, radius: 0.75)
        case (.web, .regular):
            Tuning(speed: 3.315, count: 1.35, radius: 0.95)
        case (.web, .compact):
            Tuning(speed: 6.63, count: 0.25, radius: 1.52)
        case (.braid, .large):
            Tuning(speed: 1.5, count: 0.75, radius: 0.78)
        case (.braid, .regular):
            Tuning(speed: 1.625, count: 0.5, radius: 1)
        case (.braid, .compact):
            Tuning(speed: 2.75, count: 0.1125, radius: 1.36)
        case (.ribbon, .large):
            Tuning(
                speed: 2.15,
                count: 0.4,
                radius: 0.7,
                extra: [.spin: 0, .bandMultiplier: 3.9, .wobbleMultiplier: 1]
            )
        case (.ribbon, .regular):
            Tuning(
                speed: 2.34,
                count: 0.25,
                radius: 0.85,
                extra: [.spin: 0, .bandMultiplier: 3.9, .wobbleMultiplier: 1]
            )
        case (.ribbon, .compact):
            Tuning(
                speed: 3.12,
                count: 0.051,
                radius: 1.073,
                extra: [.spin: 0, .bandMultiplier: 4.94, .wobbleMultiplier: 1]
            )
        case (.ring, .large):
            Tuning(
                speed: 3.0,
                count: 0.4,
                radius: 0.75,
                extra: [.spin: 0, .bandMultiplier: 3.627, .wobbleMultiplier: 0.368]
            )
        case (.ring, .regular):
            Tuning(
                speed: 3.24,
                count: 0.25,
                radius: 0.956,
                extra: [.spin: 0, .bandMultiplier: 3.627, .wobbleMultiplier: 0.368]
            )
        case (.ring, .compact):
            Tuning(
                speed: 3.78,
                count: 0.028,
                radius: 1.622,
                extra: [.spin: 0, .bandMultiplier: 3.968, .wobbleMultiplier: 0.565]
            )
        case (.morph, .large):
            Tuning(speed: 2.2, count: 1.05, radius: 0.28, extra: [.spread: 1.45])
        case (.morph, .regular):
            Tuning(speed: 2.405, count: 0.702, radius: 0.395, extra: [.spread: 1.45])
        case (.morph, .compact):
            Tuning(speed: 2.08, count: 0.53, radius: 1.011, extra: [.spread: 1.45])
        }
    }

    private static func baseOptions(for mode: OrbMode) -> OrbOptions {
        let values: [OrbOption: Double] = switch mode {
        case .globe:
            [
                .latRings: 17, .lonDensity: 44,
                .radiusBase: 0.6, .radiusDepth: 1.7, .radiusBoost: 1,
                .inkFar: 0.62, .inkSpan: 0.54,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .orbits:
            [
                .orbitCount: 12, .ghostCount: 40,
                .ghostRadius: 0.9, .ghostAlpha: 0.5, .particles: 3,
                .particleRadius: 1.2, .particleRadiusDepth: 1.6,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .rubik:
            [
                .latRings: 15, .lonDensity: 40, .moveCount: 14,
                .radiusBase: 0.6, .radiusDepth: 1.7, .radiusActive: 0.3,
                .inkFar: 0.62, .inkSpan: 0.54,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .wave:
            [
                .rings: 15, .lonDensity: 40,
                .radiusBase: 0.6, .radiusDepth: 1.7,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .web:
            [
                .nodeCount: 30, .threshold: 0.72, .signals: 5,
                .nodeRadius: 1.4, .nodeRadiusDepth: 1.8, .lineWidth: 0.8,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .braid:
            [
                .strandCount: 52, .turns: 3, .ghostCount: 150,
                .radiusBase: 1.2, .radiusDepth: 1.8,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .ribbon:
            [
                .lanes: 5, .segments: 88, .ghostCount: 150,
                .radiusBase: 1.1, .radiusDepth: 1.7,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .ring:
            [
                .lanes: 5, .segments: 88, .ghostCount: 0, .faceOn: 1,
                .radiusBase: 1.1, .radiusDepth: 1.7,
                .radiusScalePower: 0.6, .minimumRadius: 0.3,
            ]
        case .morph:
            [.dotRadius: 0.021, .iconDensity: 1, .minimumRadius: 0.25]
        }
        return OrbOptions(values: values)
    }

    private static func scaleCounts(_ options: inout OrbOptions, by scale: Double) {
        guard scale != 1 else { return }
        let pairScale = sqrt(scale)
        let pairs: [(OrbOption, OrbOption)] = [
            (.latRings, .lonDensity),
            (.rings, .lonDensity),
            (.lanes, .segments),
        ]
        var scaled = Set<OrbOption>()
        for (first, second) in pairs {
            guard let firstValue = options.values[first], let secondValue = options.values[second] else {
                continue
            }
            options.values[first] = max(2, (firstValue * pairScale).rounded())
            options.values[second] = max(2, (secondValue * pairScale).rounded())
            scaled.insert(first)
            scaled.insert(second)
        }

        let countKeys: [OrbOption] = [
            .orbitCount, .ghostCount, .nodeCount, .strandCount, .signals,
        ]
        for key in countKeys where !scaled.contains(key) {
            guard let value = options.values[key], value != 0 else { continue }
            options.values[key] = max(1, (value * scale).rounded())
        }
        if let density = options.values[.iconDensity] {
            options.values[.iconDensity] = max(0.02, density * scale)
        }
    }

    private static func scaleRadii(_ options: inout OrbOptions, by scale: Double) {
        guard scale != 1 else { return }
        let keys: [OrbOption] = [
            .radiusBase, .radiusDepth, .radiusActive, .dotRadius,
            .ghostRadius, .particleRadius, .particleRadiusDepth,
            .nodeRadius, .nodeRadiusDepth,
        ]
        for key in keys {
            options.scale(key, by: scale)
        }
    }
}
