import Foundation

enum OrbRibbonRenderer {
    static func frame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.78
        let spin = options[.spin, default: 1]
        let cameraTilt = 0.3
        let projector = OrbProjector(
            yaw: time * 0.1 * spin,
            tilt: cameraTilt,
            centerX: center,
            centerY: center,
            scale: 1
        )
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        var dots: [OrbDot] = []
        let ghostCount = Int(options[.ghostCount, default: 150].rounded())
        if ghostCount > 0 {
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
        }

        let yawAngle = time * 0.24 * spin
        let faceOn = options[.faceOn, default: 0] != 0
        let tiltAngle = faceOn ? -cameraTilt : 0.55 + 0.3 * sin(time * 0.18) * spin
        let basisUX = cos(yawAngle)
        let basisUY = 0.0
        let basisUZ = sin(yawAngle)
        let basisVX = -basisUZ * sin(tiltAngle)
        let basisVY = cos(tiltAngle)
        let basisVZ = basisUX * sin(tiltAngle)
        let normalX = basisUY * basisVZ - basisUZ * basisVY
        let normalY = basisUZ * basisVX - basisUX * basisVZ
        let normalZ = basisUX * basisVY - basisUY * basisVX
        let wobbleMultiplier = options[.wobbleMultiplier, default: 1]
        let wobbleAmplitude = 0.23 * wobbleMultiplier
        let baseRadius = faceOn ? radius / (1 + 0.85 * wobbleAmplitude) : radius
        let baseLanes = Int(options[.lanes, default: 5].rounded())
        let segments = Int(options[.segments, default: 88].rounded())
        let lanes = max(1, Int((Double(baseLanes) * options[.bandMultiplier, default: 1]).rounded()))

        for lane in 0..<lanes {
            let laneOffset = (Double(lane) - Double(lanes - 1) / 2) * 0.075
            let edge = abs(Double(lane) - Double(lanes - 1) / 2) / max(1, Double(lanes - 1) / 2)
            for segment in 0..<segments {
                let angle = (Double(segment) / Double(segments)) * 2 * .pi
                let wobble = (
                    0.16 * sin(angle * 3 - time * 1.7 + Double(lane) * 0.22)
                        + 0.07 * sin(angle * 5 + time * 1.1)
                ) * wobbleMultiplier
                let radialMultiplier = faceOn ? 1 + wobble : 1
                let offset = faceOn ? laneOffset : laneOffset + wobble
                let x = basisUX * cos(angle) + basisVX * sin(angle) + normalX * offset
                let y = basisUY * cos(angle) + basisVY * sin(angle) + normalY * offset
                let z = basisUZ * cos(angle) + basisVZ * sin(angle) + normalZ * offset
                let length = sqrt(x * x + y * y + z * z)
                let renderedRadius = baseRadius * radialMultiplier
                let point = projector.project(
                    x / length * renderedRadius,
                    y / length * renderedRadius,
                    z / length * renderedRadius
                )
                let depth = (point.z / radius + 1) / 2
                dots.append(
                    OrbDot(
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        radius: (
                            options[.radiusBase, default: 1.1]
                                + options[.radiusDepth, default: 1.7] * depth
                        ) * (1 - 0.25 * edge) * radiusScale,
                        ink: 0.52 - 0.44 * depth + 0.18 * edge,
                        alpha: 0.4 + 0.6 * depth
                    )
                )
            }
        }

        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.3])
    }
}
