import Foundation

enum OrbOrbitRenderer {
    static func frame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.82
        let projector = OrbProjector(yaw: time * 0.12, tilt: 0.3, centerX: center, centerY: center, scale: 1)
        let radiusScale = OrbMath.radiusScale(
            size: size,
            power: options[.radiusScalePower, default: 0.6]
        )
        let orbitCount = Int(options[.orbitCount, default: 12].rounded())
        let ghostCount = Int(options[.ghostCount, default: 40].rounded())
        let particles = Int(options[.particles, default: 3].rounded())
        var dots: [OrbDot] = []
        dots.reserveCapacity(orbitCount * (ghostCount + particles))

        for orbit in 0..<orbitCount {
            let orbitValue = Double(orbit)
            let h1 = OrbMath.hash(orbitValue, 1.7)
            let h2 = OrbMath.hash(orbitValue, 5.2)
            let h3 = OrbMath.hash(orbitValue, 8.9)
            let orbitRadius = radius * (0.45 + 0.52 * h1)
            let theta = h1 * 2 * .pi
            let phi = acos(2 * h2 - 1)
            let normalX = sin(phi) * cos(theta)
            let normalY = cos(phi)
            let normalZ = sin(phi) * sin(theta)
            var basisUX = -normalY
            var basisUY = normalX
            let basisUZ = 0.0
            let basisLength = max(0.000_001, sqrt(basisUX * basisUX + basisUY * basisUY))
            basisUX /= basisLength
            basisUY /= basisLength
            let basisVX = normalY * basisUZ - normalZ * basisUY
            let basisVY = normalZ * basisUX - normalX * basisUZ
            let basisVZ = normalX * basisUY - normalY * basisUX
            let speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1)

            for index in 0..<ghostCount {
                let angle = (Double(index) / Double(ghostCount)) * 2 * .pi
                let point = projector.project(
                    (basisUX * cos(angle) + basisVX * sin(angle)) * orbitRadius,
                    (basisUY * cos(angle) + basisVY * sin(angle)) * orbitRadius,
                    (basisUZ * cos(angle) + basisVZ * sin(angle)) * orbitRadius
                )
                let depth = (point.z / orbitRadius + 1) / 2
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: options[.ghostRadius, default: 0.9] * radiusScale,
                        ink: 0.72,
                        alpha: options[.ghostAlpha, default: 0.5] * (0.4 + 0.6 * depth)
                    )
                )
            }

            for particle in 0..<particles {
                let angle = time * speed + (Double(particle) / Double(particles)) * 2 * .pi + h2 * 6
                let point = projector.project(
                    (basisUX * cos(angle) + basisVX * sin(angle)) * orbitRadius,
                    (basisUY * cos(angle) + basisVY * sin(angle)) * orbitRadius,
                    (basisUZ * cos(angle) + basisVZ * sin(angle)) * orbitRadius
                )
                let depth = (point.z / orbitRadius + 1) / 2
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.particleRadius, default: 1.2]
                                + options[.particleRadiusDepth, default: 1.6] * depth
                        ) * radiusScale,
                        ink: 0.3 - 0.22 * depth
                    )
                )
            }
        }

        return OrbFrame(
            dots: dots,
            minimumRadius: options[.minimumRadius, default: 0.3]
        )
    }
}
