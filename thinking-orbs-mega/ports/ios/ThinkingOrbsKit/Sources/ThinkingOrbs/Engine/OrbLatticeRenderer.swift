import Foundation

enum OrbLatticeRenderer {
    private struct Move {
        let axis: Int
        let lower: Double
        let upper: Double
        let angle: Double
    }

    private struct SolveCycle {
        let amount: [Double]
        let active: Int
    }

    static func globeFrame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let spin = 0.5
        let center = size / 2
        let radius = center * 0.82
        let tilt = 0.4 + 0.06 * sin(time * 0.35)
        let projector = OrbProjector(yaw: time * spin, tilt: tilt, centerX: center, centerY: center, scale: radius)
        let scan = time * (spin + (1.7 - spin) * options[.scanMultiplier, default: 1])
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        let dimBase = options[.dimBase, default: 1]
        let latitudeRings = Int(options[.latRings, default: 17].rounded())
        let longitudeDensity = Int(options[.lonDensity, default: 44].rounded())
        var dots: [OrbDot] = []

        for latitudeIndex in 0...latitudeRings {
            let latitude = -.pi / 2 + (Double(latitudeIndex) / Double(latitudeRings)) * .pi
            let cosineLatitude = cos(latitude)
            let sineLatitude = sin(latitude)
            let longitudeCount = max(1, Int((abs(cosineLatitude) * Double(longitudeDensity)).rounded()))
            for longitudeIndex in 0..<longitudeCount {
                let longitude = (Double(longitudeIndex) / Double(longitudeCount)) * 2 * .pi
                let point = projector.project(
                    cosineLatitude * cos(longitude),
                    sineLatitude,
                    cosineLatitude * sin(longitude)
                )
                let depth = (point.z + 1) / 2
                let delta = OrbMath.angleDelta(longitude + time * spin, scan)
                let boost = exp(-(delta * delta) / 0.18) * max(0, point.z)
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.radiusBase, default: 0.6]
                                + options[.radiusDepth, default: 1.7] * depth
                                + options[.radiusBoost, default: 1] * boost
                        ) * radiusScale,
                        ink: options[.inkFar, default: 0.62] - options[.inkSpan, default: 0.54] * depth,
                        alpha: dimBase + (1 - dimBase) * min(1, boost)
                    )
                )
            }
        }
        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.3])
    }

    static func rubikFrame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.82
        let projector = OrbProjector(
            yaw: time * 0.55,
            tilt: 0.35 + 0.1 * sin(time * 0.9),
            centerX: center,
            centerY: center,
            scale: radius
        )
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        let moveCount = Int(options[.moveCount, default: 14].rounded())
        let moves = makeMoves(count: moveCount)
        let cycle = solveCycle(time: time, count: moveCount, slotDuration: 0.42, rest: 1.2)
        let latitudeRings = Int(options[.latRings, default: 15].rounded())
        let longitudeDensity = Int(options[.lonDensity, default: 40].rounded())
        var dots: [OrbDot] = []

        for latitudeIndex in 0...latitudeRings {
            let latitude = -.pi / 2 + (Double(latitudeIndex) / Double(latitudeRings)) * .pi
            let cosineLatitude = cos(latitude)
            let sineLatitude = sin(latitude)
            let longitudeCount = max(1, Int((abs(cosineLatitude) * Double(longitudeDensity)).rounded()))
            for longitudeIndex in 0..<longitudeCount {
                let longitude = (Double(longitudeIndex) / Double(longitudeCount)) * 2 * .pi
                let moved = applyMoves(
                    (cosineLatitude * cos(longitude), sineLatitude, cosineLatitude * sin(longitude)),
                    moves: moves,
                    cycle: cycle
                )
                let point = projector.project(moved.x, moved.y, moved.z)
                let depth = (point.z + 1) / 2
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.radiusBase, default: 0.6]
                                + options[.radiusDepth, default: 1.7] * depth
                                + (moved.active ? options[.radiusActive, default: 0.3] : 0)
                        ) * radiusScale,
                        ink: options[.inkFar, default: 0.62]
                            - options[.inkSpan, default: 0.54] * depth
                            - (moved.active ? 0.14 : 0)
                    )
                )
            }
        }
        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.3])
    }

    static func waveFrame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.874
        let projector = OrbProjector(yaw: time * 0.18, tilt: 0.38, centerX: center, centerY: center, scale: 1)
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        let rings = Int(options[.rings, default: 15].rounded())
        let longitudeDensity = Int(options[.lonDensity, default: 40].rounded())
        var dots: [OrbDot] = []

        for ringIndex in 0...rings {
            let latitude = -.pi / 2 + (Double(ringIndex) / Double(rings)) * .pi
            let cosineLatitude = cos(latitude)
            let sineLatitude = sin(latitude)
            let wave = 0.62 * sin(time * 2.1 - Double(ringIndex) * 0.52)
                + 0.38 * sin(time * 1.27 + Double(ringIndex) * 0.83)
            let ringRadius = radius * (0.88 + 0.105 * wave)
            let longitudeCount = max(1, Int((abs(cosineLatitude) * Double(longitudeDensity)).rounded()))
            for longitudeIndex in 0..<longitudeCount {
                let longitude = (Double(longitudeIndex) / Double(longitudeCount)) * 2 * .pi
                let point = projector.project(
                    cosineLatitude * cos(longitude) * ringRadius,
                    sineLatitude * ringRadius,
                    cosineLatitude * sin(longitude) * ringRadius
                )
                let depth = (point.z / radius + 1) / 2
                let crest = max(0, wave)
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.radiusBase, default: 0.6]
                                + options[.radiusDepth, default: 1.7] * depth
                        ) * (1 + 0.4 * crest) * radiusScale,
                        ink: 0.66 - 0.56 * depth - 0.1 * crest
                    )
                )
            }
        }
        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.3])
    }

    private static func solveCycle(
        time: Double,
        count: Int,
        slotDuration: Double,
        rest: Double
    ) -> SolveCycle {
        let cycleDuration = 2 * Double(count) * slotDuration + rest
        let cycleTime = time.truncatingRemainder(dividingBy: cycleDuration)
        var amount = Array(repeating: 0.0, count: count)
        var active = -1
        if cycleTime >= 0, cycleTime < 2 * Double(count) * slotDuration {
            let slot = Int(floor(cycleTime / slotDuration))
            let progress = (cycleTime - Double(slot) * slotDuration) / slotDuration
            let clamped = min(1, progress / 0.7)
            let eased = 1 - pow(1 - clamped, 3)
            if slot < count {
                for index in 0..<slot { amount[index] = 1 }
                amount[slot] = eased
                active = slot
            } else {
                let undoIndex = 2 * count - 1 - slot
                for index in 0..<undoIndex { amount[index] = 1 }
                amount[undoIndex] = 1 - eased
                active = undoIndex
            }
        }
        return SolveCycle(amount: amount, active: active)
    }

    private static func makeMoves(count: Int) -> [Move] {
        (0..<count).map { index in
            let value = Double(index)
            let axis = min(2, Int(floor(OrbMath.hash(value, 2.3) * 3)))
            let lower = -1 + 0.5 * Double(min(3, Int(floor(OrbMath.hash(value, 5.9) * 4))))
            let direction = OrbMath.hash(value, 7.7) < 0.5 ? 1.0 : -1.0
            return Move(axis: axis, lower: lower, upper: lower + 0.5, angle: direction * .pi / 2)
        }
    }

    private static func applyMoves(
        _ point: (x: Double, y: Double, z: Double),
        moves: [Move],
        cycle: SolveCycle
    ) -> (x: Double, y: Double, z: Double, active: Bool) {
        var x = point.x
        var y = point.y
        var z = point.z
        var isActive = false
        for index in moves.indices where cycle.amount[index] > 0 {
            let move = moves[index]
            let coordinate = move.axis == 0 ? x : move.axis == 1 ? y : z
            guard coordinate >= move.lower, coordinate < move.upper else { continue }
            if index == cycle.active { isActive = true }
            let angle = move.angle * cycle.amount[index]
            let cosine = cos(angle)
            let sine = sin(angle)
            switch move.axis {
            case 0:
                let nextY = y * cosine - z * sine
                z = y * sine + z * cosine
                y = nextY
            case 1:
                let nextX = x * cosine + z * sine
                z = -x * sine + z * cosine
                x = nextX
            default:
                let nextX = x * cosine - y * sine
                y = x * sine + y * cosine
                x = nextX
            }
        }
        return (x, y, z, isActive)
    }
}
