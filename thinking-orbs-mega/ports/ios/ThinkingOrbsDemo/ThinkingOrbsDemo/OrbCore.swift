//
//  OrbCore.swift
//  ThinkingOrbsDemo
//
//  A faithful Swift port of the thinking-orbs engine core
//  (https://github.com/Jakubantalik/thinking-orbs, src/engine/core.ts).
//  Honestly-3D dotted thought-orbs: rotated, depth-shaded, z-sorted.
//  Depth is carried by dot size and ink weight alone — plain canvas
//  fills only, so every mode renders identically.
//

import SwiftUI

// MARK: - Primitives

/// A projected, depth-shaded dot.
/// `white` is the ink value: 0 = darkest ink on paper. Mirrored on dark themes.
struct OrbDot {
    var x: Double
    var y: Double
    var z: Double
    var r: Double
    /// Ink value: 0 = darkest ink on paper. Mirrored on dark themes.
    var white: Double
    var a: Double = 1.0
}

/// A stroked edge between two projected points (the `connecting` web).
struct OrbLine {
    var x1: Double
    var y1: Double
    var x2: Double
    var y2: Double
    var white: Double
    var a: Double = 1.0
    var w: Double
}

/// yaw + tilt orthographic projection. Captures its transform constants.
struct OrbProjector {
    let apply: (Double, Double, Double) -> (Double, Double, Double)

    func callAsFunction(_ x: Double, _ y: Double, _ z: Double) -> (Double, Double, Double) {
        apply(x, y, z)
    }
}

// MARK: - Math helpers

@inlinable func orbLerp(_ a: Double, _ b: Double, _ f: Double) -> Double {
    a + (b - a) * f
}

@inlinable func orbFrac(_ x: Double) -> Double {
    x - floor(x)
}

/// JS `Math.round` — round half toward +infinity — for the count math that
/// must match the TS engine bit-for-bit. Swift's `.rounded()` is half-to-even.
@inlinable func orbRound(_ x: Double) -> Double {
    floor(x + 0.5)
}

/// Deterministic hash in [0, 1). Mirrors core.ts hashD exactly.
@inlinable func orbHashD(_ a: Double, _ b: Double) -> Double {
    let h = sin(a * 12.9898 + b * 78.233) * 43758.5453
    return h - floor(h)
}

/// Value noise on a 2D lattice — smooth, deterministic, cheap.
@inlinable func orbVNoise(_ x: Double, _ y: Double) -> Double {
    let xi = floor(x)
    let yi = floor(y)
    var fx = x - xi
    var fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    let a = orbHashD(xi, yi)
    let b = orbHashD(xi + 1, yi)
    let c = orbHashD(xi, yi + 1)
    let d = orbHashD(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/// Stable directions on a unit sphere (Fibonacci lattice).
@inlinable func orbFibDir(_ i: Double, _ n: Double) -> (Double, Double, Double) {
    let golden = .pi * (3 - sqrt(5))
    let y = 1 - (2 * (i + 0.5)) / n
    let rad = sqrt(max(0, 1 - y * y))
    let a = i * golden
    return (rad * cos(a), y, rad * sin(a))
}

/// Shortest signed angular distance, wrapped to (-π, π].
@inlinable func orbAngleDelta(_ a: Double, _ b: Double) -> Double {
    atan2(sin(a - b), cos(a - b))
}

/// Shared spin + tilt + orthographic projection.
func orbMakeProj(yaw: Double, tilt: Double, cx: Double, cy: Double, scale: Double) -> OrbProjector {
    let st = sin(tilt)
    let ct = cos(tilt)
    let sy = sin(yaw)
    let cyw = cos(yaw)
    return OrbProjector { x, y, z in
        let x1 = x * cyw + z * sy
        let z1 = -x * sy + z * cyw
        let y1 = y * ct - z1 * st
        let z2 = y * st + z1 * ct
        return (cx + x1 * scale, cy - y1 * scale, z2)
    }
}

/// Dot radii were tuned for a 300pt frame; sub-linear scaling keeps small
/// spinners legible. Lower pow = radii shrink less with size.
@inlinable func orbRadiusScale(_ size: Double, rsPow power: Double) -> Double {
    Foundation.pow(size / 300, power)
}

// MARK: - Painters

/// z-sort far→near, matte grayscale dots. On dark substrates the ink value is
/// mirrored (1 - white) so near dots read bright — the same depth language on
/// an inverted substrate.
func orbPaint(_ ctx: inout GraphicsContext, dots: [OrbDot], dark: Bool, rMin: Double = 0.3) {
    let sorted = dots.sorted { $0.z < $1.z }
    for d in sorted {
        let alpha = d.a
        if alpha < 0.02 { continue }
        let w = min(1, max(0, d.white))
        let v = dark ? (1 - w) : w
        let radius = max(rMin, d.r)
        guard radius > 0 else { continue }
        let rect = CGRect(x: d.x - radius, y: d.y - radius, width: radius * 2, height: radius * 2)
        ctx.fill(Path(ellipseIn: rect),
                 with: .color(Color(.sRGB, red: v, green: v, blue: v, opacity: alpha)))
    }
}

/// Stroke pass for edge-based modes. Runs before `orbPaint` so nodes sit on top.
func orbPaintLines(_ ctx: inout GraphicsContext, lines: [OrbLine], dark: Bool) {
    for l in lines {
        let alpha = l.a
        if alpha < 0.02 { continue }
        let w = min(1, max(0, l.white))
        let v = dark ? (1 - w) : w
        var path = Path()
        path.move(to: CGPoint(x: l.x1, y: l.y1))
        path.addLine(to: CGPoint(x: l.x2, y: l.y2))
        ctx.stroke(path,
                   with: .color(Color(.sRGB, red: v, green: v, blue: v, opacity: alpha)),
                   lineWidth: max(0.6, l.w))
    }
}
