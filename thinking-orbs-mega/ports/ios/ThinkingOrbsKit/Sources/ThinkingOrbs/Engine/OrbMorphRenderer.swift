import Foundation

enum OrbMorphRenderer {
    private typealias Point = (x: Double, y: Double)
    private typealias ShapePath = (Double) -> Point

    private static let holdDuration = 1.4
    private static let morphDuration = 0.9

    static func frame(size: Double, time: Double, options: OrbOptions) -> OrbFrame {
        let paths: [ShapePath] = [circle, polygonPath(vertices: triangleVertices), polygonPath(vertices: squareVertices)]
        let segmentDuration = holdDuration + morphDuration
        let cycleDuration = segmentDuration * Double(paths.count)
        let normalizedTime = positiveRemainder(time, divisor: cycleDuration)
        let shapeIndex = min(paths.count - 1, Int(floor(normalizedTime / segmentDuration)))
        let localTime = normalizedTime - Double(shapeIndex) * segmentDuration
        let morph = localTime > holdDuration
            ? smooth((localTime - holdDuration) / morphDuration)
            : 0
        let spread = options[.spread, default: 1]
        let currentPath = paths[shapeIndex]
        let nextPath = paths[(shapeIndex + 1) % paths.count]
        let measurementCount = 160
        var points: [Point] = []
        points.reserveCapacity(measurementCount)
        for index in 0..<measurementCount {
            let fraction = Double(index) / Double(measurementCount)
            let current = currentPath(fraction)
            let next = nextPath(fraction)
            points.append(
                (
                    OrbMath.lerp(current.x, next.x, morph) * spread,
                    OrbMath.lerp(current.y, next.y, morph) * spread
                )
            )
        }

        var lengths: [Double] = []
        lengths.reserveCapacity(measurementCount)
        var totalLength = 0.0
        for index in 0..<measurementCount {
            let current = points[index]
            let next = points[(index + 1) % measurementCount]
            let length = hypot(next.x - current.x, next.y - current.y)
            lengths.append(length)
            totalLength += length
        }

        let dotCount = max(6, Int((34 * options[.iconDensity, default: 1]).rounded()))
        let renderedRadius = options[.dotRadius, default: 0.021] * 1.35 * spread
        let pulse = 1 + 0.02 * sin(localTime * 3.1)
        let center = size / 2
        var dots: [OrbDot] = []
        dots.reserveCapacity(dotCount)
        var segment = 0
        var accumulatedLength = 0.0
        for index in 0..<dotCount {
            let target = (Double(index) / Double(dotCount)) * totalLength
            while segment < measurementCount - 1, accumulatedLength + lengths[segment] < target {
                accumulatedLength += lengths[segment]
                segment += 1
            }
            let current = points[segment]
            let next = points[(segment + 1) % measurementCount]
            let fraction = lengths[segment] > 0
                ? min(1, (target - accumulatedLength) / lengths[segment])
                : 0
            let x = OrbMath.lerp(current.x, next.x, fraction) * pulse
            let y = OrbMath.lerp(current.y, next.y, fraction) * pulse
            dots.append(
                OrbDot(
                    x: center + x * size,
                    y: center + y * size,
                    z: 0,
                    radius: max(0.35, renderedRadius * size),
                    ink: 0.1
                )
            )
        }

        return OrbFrame(dots: dots, minimumRadius: options[.minimumRadius, default: 0.25])
    }

    private static func smooth(_ value: Double) -> Double {
        value * value * (3 - 2 * value)
    }

    private static func positiveRemainder(_ value: Double, divisor: Double) -> Double {
        let remainder = value.truncatingRemainder(dividingBy: divisor)
        return remainder >= 0 ? remainder : remainder + divisor
    }

    private static func circle(_ fraction: Double) -> Point {
        let angle = -.pi / 2 + fraction * 2 * .pi
        return (cos(angle) * 0.24, sin(angle) * 0.24)
    }

    private static let triangleVertices: [Point] = [
        (0, -0.26),
        (0.24, 0.16),
        (-0.24, 0.16),
    ]

    private static let squareVertices: [Point] = [
        (0, -0.2),
        (0.2, -0.2),
        (0.2, 0.2),
        (-0.2, 0.2),
        (-0.2, -0.2),
    ]

    private static func polygonPath(vertices: [Point]) -> ShapePath {
        var lengths: [Double] = []
        var totalLength = 0.0
        for index in vertices.indices {
            let current = vertices[index]
            let next = vertices[(index + 1) % vertices.count]
            let length = hypot(next.x - current.x, next.y - current.y)
            lengths.append(length)
            totalLength += length
        }

        return { fraction in
            var target = fraction * totalLength
            var index = 0
            while index < vertices.count - 1, target > lengths[index] {
                target -= lengths[index]
                index += 1
            }
            let current = vertices[index]
            let next = vertices[(index + 1) % vertices.count]
            let segmentFraction = lengths[index] > 0 ? min(1, target / lengths[index]) : 0
            return (
                OrbMath.lerp(current.x, next.x, segmentFraction),
                OrbMath.lerp(current.y, next.y, segmentFraction)
            )
        }
    }
}
