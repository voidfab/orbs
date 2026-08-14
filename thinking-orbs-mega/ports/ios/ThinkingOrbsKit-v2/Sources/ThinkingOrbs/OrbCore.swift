// ThinkingOrbs — Swift port of Jakub Antalik's `thinking-orbs`
// (https://github.com/Jakubantalik/thinking-orbs, MIT — see
// ThirdPartyLicenses/thinking-orbs-LICENSE.txt). Dotted 3D "thought orb"
// progress indicators for AI/agent UIs: nine hand-tuned states, two tuned
// size presets, auto dark/light ink.
//
// Shared primitives. The orbs are honestly 3D — rotated, depth-shaded,
// z-sorted. Depth is carried by dot size and ink weight alone. Plain
// circle fills and line strokes only: no blurs, no filters, so every
// mode renders identically on every platform. All motion is a pure
// function of the clock `t` — there is no simulation state.

import Foundation
import SwiftUI

/// One projected dot. `white` is the ink value: 0 = darkest ink on paper;
/// mirrored (1 - white) on dark substrates so near dots read bright.
struct OrbDot {
    var x: Double
    var y: Double
    var z: Double
    var r: Double
    var white: Double
    var a: Double = 1
}

/// A stroked edge between two projected points (the `connecting` web).
struct OrbLine {
    var x1: Double
    var y1: Double
    var x2: Double
    var y2: Double
    var white: Double
    var a: Double = 1
    var w: Double
}

/// Mode draw options — a flat bag of tuned numbers, mirroring the upstream
/// `ModeOpts`. Kept stringly-typed on purpose: the scaling machinery in
/// OrbProfiles operates over keys, and it keeps the port line-for-line
/// against the reference implementation.
typealias OrbOpts = [String: Double]

typealias OrbProjector = (Double, Double, Double) -> (Double, Double, Double)

/// One frame painter: draws a mode into a graphics context at point `size`.
typealias OrbModeDraw = (GraphicsContext, Double, Double, Bool, OrbOpts) -> Void

@inline(__always)
func orbLerp(_ a: Double, _ b: Double, _ f: Double) -> Double {
    a + (b - a) * f
}

@inline(__always)
func orbFrac(_ x: Double) -> Double {
    x - floor(x)
}

/// Deterministic hash in [0, 1).
@inline(__always)
func orbHash(_ a: Double, _ b: Double) -> Double {
    let h = sin(a * 12.9898 + b * 78.233) * 43758.5453
    return h - floor(h)
}

/// Value noise on a 2D lattice — smooth, deterministic, cheap.
func orbNoise(_ x: Double, _ y: Double) -> Double {
    let xi = floor(x)
    let yi = floor(y)
    var fx = x - xi
    var fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    let a = orbHash(xi, yi)
    let b = orbHash(xi + 1, yi)
    let c = orbHash(xi, yi + 1)
    let d = orbHash(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/// Stable directions on a unit sphere (Fibonacci lattice).
func orbFibDir(_ i: Int, _ n: Int) -> (Double, Double, Double) {
    let golden = Double.pi * (3 - sqrt(5.0))
    let y = 1 - (2 * (Double(i) + 0.5)) / Double(n)
    let rad = sqrt(1 - y * y)
    let a = Double(i) * golden
    return (rad * cos(a), y, rad * sin(a))
}

/// Shortest signed angular distance, wrapped to (-pi, pi].
@inline(__always)
func orbAngleDelta(_ a: Double, _ b: Double) -> Double {
    atan2(sin(a - b), cos(a - b))
}

/// Shared spin + tilt + orthographic projection.
func orbMakeProj(yaw: Double, tilt: Double, cx: Double, cy: Double, scale: Double) -> OrbProjector {
    let st = sin(tilt)
    let ct = cos(tilt)
    let sy = sin(yaw)
    let cyw = cos(yaw)
    return { x, y, z in
        let x1 = x * cyw + z * sy
        let z1 = -x * sy + z * cyw
        let y1 = y * ct - z1 * st
        let z2 = y * st + z1 * ct
        return (cx + x1 * scale, cy - y1 * scale, z2)
    }
}

/// Painter: z-sort far -> near, matte grayscale dots. On dark substrates
/// the ink value is mirrored (1 - white) so near dots read bright — the
/// same depth language on an inverted substrate.
func orbPaint(_ ctx: GraphicsContext, _ dots: inout [OrbDot], dark: Bool, rMin: Double = 0.3) {
    dots.sort { $0.z < $1.z }
    for d in dots {
        if d.a < 0.02 { continue }
        let w = min(1, max(0, d.white))
        let g = dark ? 1 - w : w
        let r = max(rMin, d.r)
        let rect = CGRect(x: d.x - r, y: d.y - r, width: r * 2, height: r * 2)
        ctx.fill(Path(ellipseIn: rect), with: .color(Color(white: g, opacity: d.a)))
    }
}

/// Stroke pass for edge-based modes. Runs before `orbPaint` so nodes sit on top.
func orbPaintLines(_ ctx: GraphicsContext, _ lines: [OrbLine], dark: Bool) {
    for l in lines {
        if l.a < 0.02 { continue }
        let w = min(1, max(0, l.white))
        let g = dark ? 1 - w : w
        var path = Path()
        path.move(to: CGPoint(x: l.x1, y: l.y1))
        path.addLine(to: CGPoint(x: l.x2, y: l.y2))
        ctx.stroke(path, with: .color(Color(white: g, opacity: l.a)), lineWidth: l.w)
    }
}

/// Dot radii were tuned for a 300pt frame; sub-linear scaling keeps small
/// spinners legible. Lower pow = radii shrink less with size.
@inline(__always)
func orbRadiusScale(_ size: Double, _ p: Double) -> Double {
    pow(size / 300, p)
}
