import Foundation

struct OrbProjector {
    let yaw: Double
    let tilt: Double
    let centerX: Double
    let centerY: Double
    let scale: Double

    func project(_ x: Double, _ y: Double, _ z: Double) -> (x: Double, y: Double, z: Double) {
        let sinTilt = sin(tilt)
        let cosTilt = cos(tilt)
        let sinYaw = sin(yaw)
        let cosYaw = cos(yaw)
        let x1 = x * cosYaw + z * sinYaw
        let z1 = -x * sinYaw + z * cosYaw
        let y1 = y * cosTilt - z1 * sinTilt
        let z2 = y * sinTilt + z1 * cosTilt
        return (centerX + x1 * scale, centerY - y1 * scale, z2)
    }
}

enum OrbMath {
    static func lerp(_ a: Double, _ b: Double, _ fraction: Double) -> Double {
        a + (b - a) * fraction
    }

    static func fraction(_ value: Double) -> Double {
        value - floor(value)
    }

    static func hash(_ a: Double, _ b: Double) -> Double {
        let value = sin(a * 12.9898 + b * 78.233) * 43_758.5453
        return value - floor(value)
    }

    static func valueNoise(_ x: Double, _ y: Double) -> Double {
        let xi = floor(x)
        let yi = floor(y)
        var fx = x - xi
        var fy = y - yi
        fx = fx * fx * (3 - 2 * fx)
        fy = fy * fy * (3 - 2 * fy)
        let a = hash(xi, yi)
        let b = hash(xi + 1, yi)
        let c = hash(xi, yi + 1)
        let d = hash(xi + 1, yi + 1)
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
    }

    static func fibonacciDirection(index: Int, count: Int) -> (x: Double, y: Double, z: Double) {
        let golden = Double.pi * (3 - sqrt(5))
        let y = 1 - (2 * (Double(index) + 0.5)) / Double(count)
        let radius = sqrt(1 - y * y)
        let angle = Double(index) * golden
        return (radius * cos(angle), y, radius * sin(angle))
    }

    static func angleDelta(_ a: Double, _ b: Double) -> Double {
        atan2(sin(a - b), cos(a - b))
    }

    static func radiusScale(size: Double, power: Double) -> Double {
        pow(size / 300, power)
    }

    static func clamped(_ value: Double, lower: Double = 0, upper: Double = 1) -> Double {
        min(upper, max(lower, value))
    }
}
