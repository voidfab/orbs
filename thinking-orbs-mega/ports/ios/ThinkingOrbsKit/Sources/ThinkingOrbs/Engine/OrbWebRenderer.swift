import Foundation

enum OrbWebRenderer {
    private struct Node {
        var x: Double
        var y: Double
        var z: Double
    }

    static func frame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let center = size / 2
        let radius = center * 0.8 * options[.spread, default: 1]
        let projector = OrbProjector(yaw: time * 0.12, tilt: 0.32, centerX: center, centerY: center, scale: radius)
        let radiusScale = OrbMath.radiusScale(size: size, power: options[.radiusScalePower, default: 0.6])
        let nodeCount = Int(options[.nodeCount, default: 30].rounded())
        let threshold = options[.threshold, default: 0.72]
        let nodeRadius = options[.nodeRadius, default: 1.4]
        let nodeRadiusDepth = options[.nodeRadiusDepth, default: 1.8]
        var nodes: [Node] = []
        nodes.reserveCapacity(nodeCount)

        for index in 0..<nodeCount {
            let direction = OrbMath.fibonacciDirection(index: index, count: nodeCount)
            let value = Double(index)
            let x = direction.x + 0.3 * (OrbMath.valueNoise(value * 0.31 + 9, time * 0.24) - 0.5) * 2
            let y = direction.y + 0.3 * (OrbMath.valueNoise(value * 0.53 + 27, time * 0.21) - 0.5) * 2
            let z = direction.z + 0.3 * (OrbMath.valueNoise(value * 0.77 + 55, time * 0.27) - 0.5) * 2
            let length = sqrt(x * x + y * y + z * z)
            nodes.append(Node(x: x / length, y: y / length, z: z / length))
        }

        var lines: [OrbLine] = []
        var dots: [OrbDot] = []
        for firstIndex in nodes.indices {
            guard firstIndex + 1 < nodes.count else { continue }
            for secondIndex in (firstIndex + 1)..<nodes.count {
                let first = nodes[firstIndex]
                let second = nodes[secondIndex]
                let dx = first.x - second.x
                let dy = first.y - second.y
                let dz = first.z - second.z
                let distance = sqrt(dx * dx + dy * dy + dz * dz)
                guard distance < threshold else { continue }
                let firstPoint = projector.project(first.x, first.y, first.z)
                let secondPoint = projector.project(second.x, second.y, second.z)
                let depth = ((firstPoint.z + secondPoint.z) / 2 + 1) / 2
                lines.append(
                    OrbLine(
                        x1: firstPoint.x,
                        y1: firstPoint.y,
                        x2: secondPoint.x,
                        y2: secondPoint.y,
                        ink: 0.42,
                        alpha: (1 - distance / threshold) * (0.3 + 0.55 * depth),
                        width: max(0.6, options[.lineWidth, default: 0.8] * radiusScale)
                    )
                )
            }
        }

        for (index, node) in nodes.enumerated() {
            let point = projector.project(node.x, node.y, node.z)
            let depth = (point.z + 1) / 2
            let pulse = 1 + 0.25 * sin(time * 1.4 + Double(index) * 2.7)
            dots.append(
                OrbDot(
                    x: point.x,
                    y: point.y,
                    z: point.z,
                    radius: (nodeRadius + nodeRadiusDepth * depth) * pulse * radiusScale,
                    ink: 0.55 - 0.45 * depth
                )
            )
        }

        let signalCount = Int(options[.signals, default: 5].rounded())
        for signal in 0..<signalCount {
            let signalValue = Double(signal)
            let segment = floor(time * 0.55 + signalValue * 7.31)
            let firstIndex = Int(floor(OrbMath.hash(segment, signalValue * 3.1 + 1.7) * Double(nodeCount)))
            let secondIndex = Int(floor(OrbMath.hash(segment, signalValue * 5.7 + 4.2) * Double(nodeCount)))
            guard firstIndex != secondIndex else { continue }
            let fraction = OrbMath.fraction(time * 0.55 + signalValue * 7.31)
            let first = nodes[firstIndex]
            let second = nodes[secondIndex]
            let x = OrbMath.lerp(first.x, second.x, fraction)
            let y = OrbMath.lerp(first.y, second.y, fraction)
            let z = OrbMath.lerp(first.z, second.z, fraction)
            let length = max(0.000_001, sqrt(x * x + y * y + z * z))
            let point = projector.project(x / length, y / length, z / length)
            let depth = (point.z + 1) / 2
            dots.append(
                OrbDot(
                    x: point.x,
                    y: point.y,
                    z: point.z,
                    radius: (nodeRadius * 1.5 + nodeRadiusDepth * depth) * radiusScale,
                    ink: 0.05,
                    alpha: 0.5 + 0.5 * depth
                )
            )
        }

        return OrbFrame(
            dots: dots,
            lines: lines,
            minimumRadius: options[.minimumRadius, default: 0.3]
        )
    }
}
