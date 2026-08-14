import Foundation

enum OrbBraidRenderer {
    static func frame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.76
        let projector = OrbProjector(yaw: time * 0.4, tilt: 0.3, centerX: center, centerY: center, scale: 1)
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        let ghostCount = Int(options[.ghostCount, default: 150].rounded())
        var dots: [OrbDot] = []

        for index in 0..<ghostCount {
            let direction = OrbMath.fibonacciDirection(index: index, count: ghostCount)
            let point = projector.project(direction.x * radius, direction.y * radius, direction.z * radius)
            let depth = (point.z / radius + 1) / 2
            dots.append(
                OrbDot(
                    x: point.x,
                    y: point.y,
                    z: point.z,
                    radius: 0.8 * radiusScale,
                    ink: 0.78,
                    alpha: 0.1 + 0.22 * depth
                )
            )
        }

        let strandCount = Int(options[.strandCount, default: 52].rounded())
        let turns = options[.turns, default: 3]
        for strand in 0..<3 {
            let phase = (Double(strand) / 3) * 2 * .pi
            for index in 0..<strandCount {
                let vertical = (OrbMath.fraction(Double(index) / Double(strandCount) + time * 0.045) * 2 - 1) * 0.96
                let surface = sqrt(max(0, 1 - vertical * vertical))
                let endFade = min(1, (1 - abs(vertical)) / 0.1)
                let angle = vertical * .pi * turns + phase
                let weave = 1 + 0.075 * sin(vertical * .pi * turns * 2 + phase * 2 + time * 0.8)
                let radial = surface * radius * weave
                let point = projector.project(
                    cos(angle) * radial,
                    vertical * radius * weave,
                    sin(angle) * radial
                )
                let depth = (point.z / radius + 1) / 2
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.radiusBase, default: 1.2]
                                + options[.radiusDepth, default: 1.8] * depth
                        ) * radiusScale,
                        ink: 0.55 - 0.45 * depth,
                        alpha: endFade * (0.45 + 0.55 * depth)
                    )
                )
            }
        }

        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.3])
    }
}
