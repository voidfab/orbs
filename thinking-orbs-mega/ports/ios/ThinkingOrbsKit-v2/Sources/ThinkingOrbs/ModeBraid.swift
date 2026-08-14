// Braid: three strands plait around the sphere — the "weaving" state.
// Each strand runs pole to pole on a helix, and a radial breathing term
// makes them trade places, reading as the over/under of a plait.

import Foundation
import SwiftUI

func drawBraid(_ ctx: GraphicsContext, _ size: Double, _ t: Double, _ dark: Bool, _ o: OrbOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.76
    let pt = orbMakeProj(yaw: t * 0.4, tilt: 0.3, cx: cx, cy: cy, scale: 1)
    let rs = orbRadiusScale(size, o["rsPow"] ?? 0.6)

    var dots: [OrbDot] = []
    let ghostN = Int(o["ghostN"] ?? 150)
    for i in 0..<ghostN {
        let d = orbFibDir(i, ghostN)
        let (px, py, z) = pt(d.0 * R, d.1 * R, d.2 * R)
        let depth = (z / R + 1) / 2
        dots.append(OrbDot(x: px, y: py, z: z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth))
    }

    let strandN = Int(o["strandN"] ?? 52)
    let turns = o["turns"] ?? 3
    for s in 0..<3 {
        let phase = (Double(s) / 3) * 2 * .pi
        for i in 0..<strandN {
            // u walks pole to pole; the frac() drift slides the whole strand along
            let u = (orbFrac(Double(i) / Double(strandN) + t * 0.045) * 2 - 1) * 0.96
            let surf = sqrt(max(0, 1 - u * u))
            let endFade = min(1, (1 - abs(u)) / 0.1)
            let a = u * .pi * turns + phase
            // radial breathing: strands trade places — the over/under of a plait
            let weave = 1 + 0.075 * sin(u * .pi * turns * 2 + phase * 2 + t * 0.8)
            let rr = surf * R * weave
            let (px, py, zr) = pt(cos(a) * rr, u * R * weave, sin(a) * rr)
            let depth = (zr / R + 1) / 2
            dots.append(OrbDot(
                x: px, y: py, z: zr,
                r: ((o["rBase"] ?? 1.2) + (o["rDepth"] ?? 1.8) * depth) * rs,
                white: 0.55 - 0.45 * depth,
                a: endFade * (0.45 + 0.55 * depth)
            ))
        }
    }
    orbPaint(ctx, &dots, dark: dark, rMin: o["rMin"] ?? 0.3)
}
