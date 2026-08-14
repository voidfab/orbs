// Morph: a dotted outline cycling circle -> triangle -> square -> circle —
// the "shaping" state. Each shape is a continuous closed path
// parameterised by arc length (top-centre start, clockwise). Every
// frame the engine blends the two neighbouring paths, then lays the
// dots EVENLY along the blended outline — spacing stays uniform at
// every instant of the morph, holds and transitions alike. Plain
// circle fills only.

import Foundation
import SwiftUI

private typealias MorphPath = (Double) -> (Double, Double)

private func smoothE(_ x: Double) -> Double {
    x * x * (3 - 2 * x)
}

private func polyPath(_ verts: [(Double, Double)]) -> MorphPath {
    let V = verts.count
    var L: [Double] = []
    var total = 0.0
    for i in 0..<V {
        let a = verts[i]
        let b = verts[(i + 1) % V]
        let l = hypot(b.0 - a.0, b.1 - a.1)
        L.append(l)
        total += l
    }
    return { f in
        var target = f * total
        var i = 0
        while target > L[i] && i < V - 1 {
            target -= L[i]
            i += 1
        }
        let a = verts[i]
        let b = verts[(i + 1) % V]
        let ff = L[i] > 0 ? min(1, target / L[i]) : 0
        return (a.0 + (b.0 - a.0) * ff, a.1 + (b.1 - a.1) * ff)
    }
}

private let circlePath: MorphPath = { f in
    let a = -Double.pi / 2 + f * 2 * .pi
    return (cos(a) * 0.24, sin(a) * 0.24)
}
private let trianglePath = polyPath([
    (0.0, -0.26),
    (0.24, 0.16),
    (-0.24, 0.16),
])
// 5-vertex walk so the path STARTS at top-centre like the other shapes
private let squarePath = polyPath([
    (0, -0.2),
    (0.2, -0.2),
    (0.2, 0.2),
    (-0.2, 0.2),
    (-0.2, -0.2),
])
private let shapeCycle: [MorphPath] = [circlePath, trianglePath, squarePath]

// low floor keeps sparse outlines possible while never degenerating
private func morphN(_ d: Double) -> Int {
    max(6, Int((34 * d).rounded()))
}

private let holdDur = 1.4
private let morphDur = 0.9
private let segDur = holdDur + morphDur

// The upstream note: this state was tuned through a blur + threshold "goo"
// filter; plain circles read a touch softer. Don't "correct" for that by
// shrinking the radius: it makes the mark genuinely smaller than the tuning.

func drawMorph(_ ctx: GraphicsContext, _ size: Double, _ t: Double, _ dark: Bool, _ o: OrbOpts) {
    let K = shapeCycle.count
    let tc = t.truncatingRemainder(dividingBy: segDur * Double(K))
    let k = Int(floor(tc / segDur))
    let local = tc - Double(k) * segDur
    let m = local > holdDur ? smoothE((local - holdDur) / morphDur) : 0
    let sprd = o["spread"] ?? 1

    // blend the two shape PATHS at m, then measure the blended outline
    let pA = shapeCycle[k]
    let pB = shapeCycle[(k + 1) % K]
    let M = 160
    var pts: [(Double, Double)] = []
    pts.reserveCapacity(M)
    for i in 0..<M {
        let f = Double(i) / Double(M)
        let a = pA(f)
        let b = pB(f)
        pts.append(((a.0 + (b.0 - a.0) * m) * sprd, (a.1 + (b.1 - a.1) * m) * sprd))
    }
    var L: [Double] = []
    L.reserveCapacity(M)
    var total = 0.0
    for i in 0..<M {
        let a = pts[i]
        let b = pts[(i + 1) % M]
        let l = hypot(b.0 - a.0, b.1 - a.1)
        L.append(l)
        total += l
    }

    // dot radius depends ONLY on rDot (the size knob); the count sets the
    // gaps. Formed shapes breathe a little (uniform pulse).
    let n = morphN(o["iconD"] ?? 1)
    let re = (o["rDot"] ?? 0.021) * 1.35 * sprd
    let pulse = 1 + 0.02 * sin(local * 3.1)

    var dots: [OrbDot] = []
    let c2 = size / 2
    var seg = 0
    var acc = 0.0
    for k2 in 0..<n {
        let target = (Double(k2) / Double(n)) * total
        while acc + L[seg] < target && seg < M - 1 {
            acc += L[seg]
            seg += 1
        }
        let a = pts[seg]
        let b = pts[(seg + 1) % M]
        let f = L[seg] > 0 ? min(1, (target - acc) / L[seg]) : 0
        let x = (a.0 + (b.0 - a.0) * f) * pulse
        let y = (a.1 + (b.1 - a.1) * f) * pulse
        dots.append(OrbDot(
            x: c2 + x * size,
            y: c2 + y * size,
            z: 0,
            r: max(0.35, re * size),
            white: 0.1
        ))
    }
    orbPaint(ctx, &dots, dark: dark, rMin: o["rMin"] ?? 0.3)
}
