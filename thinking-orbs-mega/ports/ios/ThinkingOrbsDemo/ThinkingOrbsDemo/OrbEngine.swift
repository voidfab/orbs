//
//  OrbEngine.swift
//  ThinkingOrbsDemo
//
//  Faithful Swift port of the nine thinking-orbs frame painters
//  (src/engine/{orbits,lattice,morph,ribbon,braid,web}.ts). Each ModeDraw
//  draws its dotted field into the SwiftUI GraphicsContext at `size` points.
//

import SwiftUI

private func intOpt(_ o: ModeOpts, _ key: String, _ def: Int) -> Int {
    Int(orbRound(o[key] ?? Double(def)))
}

// MARK: - Dispatch

func orbDrawMode(_ mode: String,
                 _ ctx: inout GraphicsContext,
                 size: Double,
                 t: Double,
                 dark: Bool,
                 opts: ModeOpts) {
    switch mode {
    case "orbits":  orbDrawOrbits(&ctx, size: size, t: t, dark: dark, o: opts)
    case "globe":   orbDrawGlobe(&ctx, size: size, t: t, dark: dark, o: opts)
    case "rubik":   orbDrawRubik(&ctx, size: size, t: t, dark: dark, o: opts)
    case "wave":    orbDrawWave(&ctx, size: size, t: t, dark: dark, o: opts)
    case "web":     orbDrawWeb(&ctx, size: size, t: t, dark: dark, o: opts)
    case "braid":   orbDrawBraid(&ctx, size: size, t: t, dark: dark, o: opts)
    case "ribbon":  orbDrawRibbon(&ctx, size: size, t: t, dark: dark, o: opts)
    case "ring":    orbDrawRibbon(&ctx, size: size, t: t, dark: dark, o: opts)
    case "morph":   orbDrawMorph(&ctx, size: size, t: t, dark: dark, o: opts)
    default:        break
    }
}

// MARK: - Orbits (working)

/// Particles on tilted orbits — the "working" state. No nucleus: just ghost
/// paths and the particles doing the work.
func orbDrawOrbits(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.82
    let pt = orbMakeProj(yaw: t * 0.12, tilt: 0.3, cx: cx, cy: cy, scale: 1)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))

    var dots: [OrbDot] = []
    let orbitN = intOpt(o, "orbitN", 12)
    let ghostN = intOpt(o, "ghostN", 40)
    let particles = intOpt(o, "particles", 3)

    for orb in 0..<orbitN {
        let h1 = orbHashD(Double(orb), 1.7)
        let h2 = orbHashD(Double(orb), 5.2)
        let h3 = orbHashD(Double(orb), 8.9)
        let ro = R * (0.45 + 0.52 * h1)
        let th = h1 * 2 * .pi
        let phi = acos(2 * h2 - 1)
        let nx = sin(phi) * cos(th), ny = cos(phi), nz = sin(phi) * sin(th)
        var ux = -ny, uy = nx
        let uz = 0.0
        let ul = max(1e-6, sqrt(ux * ux + uy * uy))
        ux /= ul; uy /= ul
        let vx = ny * uz - nz * uy
        let vy = nz * ux - nx * uz
        let vz = nx * uy - ny * ux
        let speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1)

        // ghost path
        for k in 0..<ghostN {
            let a = (Double(k) / Double(ghostN)) * 2 * .pi
            let ca = cos(a), sa = sin(a)
            let (px, py, z) = pt((ux * ca + vx * sa) * ro,
                                 (uy * ca + vy * sa) * ro,
                                 (uz * ca + vz * sa) * ro)
            let depth = (z / ro + 1) / 2
            dots.append(OrbDot(x: px, y: py, z: z,
                               r: o.o("ghostR", 0.9) * rs,
                               white: 0.72,
                               a: o.o("ghostA", 0.5) * (0.4 + 0.6 * depth)))
        }
        // the particles doing the work
        for m in 0..<particles {
            let a = t * speed + (Double(m) / Double(particles)) * 2 * .pi + h2 * 6
            let ca = cos(a), sa = sin(a)
            let (px, py, z) = pt((ux * ca + vx * sa) * ro,
                                 (uy * ca + vy * sa) * ro,
                                 (uz * ca + vz * sa) * ro)
            let depth = (z / ro + 1) / 2
            dots.append(OrbDot(x: px, y: py, z: z,
                               r: (o.o("partR", 1.2) + o.o("partRDepth", 1.6) * depth) * rs,
                               white: 0.3 - 0.22 * depth))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

// MARK: - Lattice: globe (searching), rubik (solving), wave (listening)

private struct RubikMove {
    let axis: Int       // 0 | 1 | 2
    let lo: Double
    let hi: Double
    let ang: Double
}

private struct RubikCycle {
    let amount: [Double]
    let active: Int
}

/// Rapid eased moves scramble, then replay in reverse (palindrome) so
/// everything clicks back to solved, rests, repeats.
private func solveCycle(time: Double, count: Int, slotDur: Double, rest: Double) -> RubikCycle {
    let cyc = 2 * Double(count) * slotDur + rest
    let tc = time.truncatingRemainder(dividingBy: cyc)
    var amount = Array(repeating: 0.0, count: count)
    var active = -1
    if tc < 2 * Double(count) * slotDur {
        let slot = Int(floor(tc / slotDur))
        let p = (tc - Double(slot) * slotDur) / slotDur
        let cl = min(1, p / 0.7)
        let ep = 1 - pow(1 - cl, 3) // machine ease-out
        if slot < count {
            for i in 0..<slot { amount[i] = 1 }
            amount[slot] = ep
            active = slot
        } else {
            let u = 2 * count - 1 - slot
            for i in 0..<u { amount[i] = 1 }
            amount[u] = 1 - ep
            active = u
        }
    }
    return RubikCycle(amount: amount, active: active)
}

private func makeMoves(_ count: Int) -> [RubikMove] {
    var moves: [RubikMove] = []
    for i in 0..<count {
        let axis = min(2, Int(floor(orbHashD(Double(i), 2.3) * 3)))
        let lo = -1.0 + 0.5 * Double(min(3, Int(floor(orbHashD(Double(i), 5.9) * 4))))
        let dir: Double = orbHashD(Double(i), 7.7) < 0.5 ? 1 : -1
        moves.append(RubikMove(axis: axis, lo: lo, hi: lo + 0.5, ang: dir * .pi / 2))
    }
    return moves
}

private func applyMoves(_ pt3: (Double, Double, Double), _ moves: [RubikMove], _ sc: RubikCycle) -> (Double, Double, Double, Bool) {
    var (x, y, z) = pt3
    var inActive = false
    for i in 0..<moves.count {
        if sc.amount[i] <= 0 { continue }
        let mv = moves[i]
        let coord = mv.axis == 0 ? x : mv.axis == 1 ? y : z
        if coord < mv.lo || coord >= mv.hi { continue }
        if i == sc.active { inActive = true }
        let a = mv.ang * sc.amount[i]
        let ca = cos(a), sa = sin(a)
        if mv.axis == 0 {
            let y2 = y * ca - z * sa
            z = y * sa + z * ca
            y = y2
        } else if mv.axis == 1 {
            let x2 = x * ca + z * sa
            z = -x * sa + z * ca
            x = x2
        } else {
            let x2 = x * ca - y * sa
            y = x * sa + y * ca
            x = x2
        }
    }
    return (x, y, z, inActive)
}

/// Globe: lat/long field, a scan meridian sweeps — searching.
func orbDrawGlobe(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let spin = 0.5
    let cx = size / 2
    let cy = size / 2
    let radius = (size / 2) * 0.82
    let tilt = 0.4 + 0.06 * sin(t * 0.35)
    let pt = orbMakeProj(yaw: t * spin, tilt: tilt, cx: cx, cy: cy, scale: radius)
    let scan = t * (spin + (1.7 - spin) * o.o("scanMul", 1))
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))
    let dimBase = o.o("dimBase", 1)

    var dots: [OrbDot] = []
    let latRings = intOpt(o, "latRings", 17)
    let lonDensity = o.o("lonDensity", 44)
    for li in 0...latRings {
        let lat = -.pi / 2 + (Double(li) / Double(latRings)) * .pi
        let cosLat = cos(lat), sinLat = sin(lat)
        let lonCount = max(1, Int(orbRound(abs(cosLat) * lonDensity)))
        for lj in 0..<lonCount {
            let lon = (Double(lj) / Double(lonCount)) * 2 * .pi
            let (px, py, z) = pt(cosLat * cos(lon), sinLat, cosLat * sin(lon))
            let depth = (z + 1) / 2
            let d = orbAngleDelta(lon + t * spin, scan)
            let boost = exp(-(d * d) / 0.18) * max(0, z)
            dots.append(OrbDot(x: px, y: py, z: z,
                               r: (o.o("rBase", 0.6) + o.o("rDepth", 1.7) * depth + o.o("rBoost", 1) * boost) * rs,
                               white: o.o("inkFar", 0.62) - o.o("inkSpan", 0.54) * depth,
                               a: dimBase + (1 - dimBase) * min(1, boost)))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

/// Rubik: bands twist in quarter turns, scramble → solve — solving.
func orbDrawRubik(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.82
    let pt = orbMakeProj(yaw: t * 0.55, tilt: 0.35 + 0.1 * sin(t * 0.9), cx: cx, cy: cy, scale: R)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))
    let moveCount = intOpt(o, "moveCount", 14)
    let moves = makeMoves(moveCount)
    let sc = solveCycle(time: t, count: moveCount, slotDur: 0.42, rest: 1.2)

    var dots: [OrbDot] = []
    let latRings = intOpt(o, "latRings", 15)
    let lonDensity = o.o("lonDensity", 40)
    for li in 0...latRings {
        let lat = -.pi / 2 + (Double(li) / Double(latRings)) * .pi
        let cosLat = cos(lat), sinLat = sin(lat)
        let lonCount = max(1, Int(orbRound(abs(cosLat) * lonDensity)))
        for lj in 0..<lonCount {
            let lon = (Double(lj) / Double(lonCount)) * 2 * .pi
            let (x, y, z, inActive) = applyMoves((cosLat * cos(lon), sinLat, cosLat * sin(lon)), moves, sc)
            let (px, py, zr) = pt(x, y, z)
            let depth = (zr + 1) / 2
            dots.append(OrbDot(x: px, y: py, z: zr,
                               r: (o.o("rBase", 0.6) + o.o("rDepth", 1.7) * depth + (inActive ? o.o("rActive", 0.3) : 0)) * rs,
                               white: o.o("inkFar", 0.62) - o.o("inkSpan", 0.54) * depth - (inActive ? 0.14 : 0)))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

/// Wave: a waveform rolls through the rings — listening.
func orbDrawWave(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    // 0.76 base × 1.15 — the undulation pulls inward; scaled up to match
    let R = (size / 2) * 0.874
    let pt = orbMakeProj(yaw: t * 0.18, tilt: 0.38, cx: cx, cy: cy, scale: 1)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))

    var dots: [OrbDot] = []
    let rings = intOpt(o, "rings", 15)
    let lonDensity = o.o("lonDensity", 40)
    for ri in 0...rings {
        let lat = -.pi / 2 + (Double(ri) / Double(rings)) * .pi
        let cosLat = cos(lat), sinLat = sin(lat)
        // two waves, different tempi — organic, never quite repeating
        let w = 0.62 * sin(t * 2.1 - Double(ri) * 0.52) + 0.38 * sin(t * 1.27 + Double(ri) * 0.83)
        let rr = R * (0.88 + 0.105 * w)
        let lonCount = max(1, Int(orbRound(abs(cosLat) * lonDensity)))
        for lj in 0..<lonCount {
            let lon = (Double(lj) / Double(lonCount)) * 2 * .pi
            let (px, py, z) = pt(cosLat * cos(lon) * rr, sinLat * rr, cosLat * sin(lon) * rr)
            let depth = (z / R + 1) / 2
            let crest = max(0, w)
            dots.append(OrbDot(x: px, y: py, z: z,
                               r: (o.o("rBase", 0.6) + o.o("rDepth", 1.7) * depth) * (1 + 0.4 * crest) * rs,
                               white: 0.66 - 0.56 * depth - 0.1 * crest))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

// MARK: - Morph (shaping)

private func smoothE(_ x: Double) -> Double { x * x * (3 - 2 * x) }

private typealias OrbPath = (Double) -> (Double, Double)

private func polyPath(_ verts: [(Double, Double)]) -> OrbPath {
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
        let ff = L[i] != 0 ? min(1, target / L[i]) : 0
        return (a.0 + (b.0 - a.0) * ff, a.1 + (b.1 - a.1) * ff)
    }
}

private let morphCircle: OrbPath = { f in
    let a = -.pi / 2 + f * 2 * .pi
    return (cos(a) * 0.24, sin(a) * 0.24)
}
private let morphTriangle: OrbPath = polyPath([
    (0.0, -0.26), (0.24, 0.16), (-0.24, 0.16)
])
// 5-vertex walk so the path STARTS at top-centre like the other shapes
private let morphSquare: OrbPath = polyPath([
    (0, -0.2), (0.2, -0.2), (0.2, 0.2), (-0.2, 0.2), (-0.2, -0.2)
])
private let morphCycle: [OrbPath] = [morphCircle, morphTriangle, morphSquare]

// low floor keeps sparse outlines possible while never degenerating
private func morphN(_ d: Double) -> Int { max(6, Int(orbRound(34 * d))) }

private let MORPH_HOLD = 1.4
private let MORPH_MORPH = 0.9
private let MORPH_SEG = MORPH_HOLD + MORPH_MORPH

/// Dotted outline cycling circle → triangle → square — the "shaping" state.
func orbDrawMorph(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let K = morphCycle.count
    let tc = t.truncatingRemainder(dividingBy: MORPH_SEG * Double(K))
    let k = Int(floor(tc / MORPH_SEG))
    let local = tc - Double(k) * MORPH_SEG
    let m = local > MORPH_HOLD ? smoothE((local - MORPH_HOLD) / MORPH_MORPH) : 0
    let sprd = o.o("spread", 1)

    let pA = morphCycle[k]
    let pB = morphCycle[(k + 1) % K]
    let M = 160
    var pts: [(Double, Double)] = []
    for i in 0..<M {
        let f = Double(i) / Double(M)
        let a = pA(f)
        let b = pB(f)
        pts.append(((a.0 + (b.0 - a.0) * m) * sprd, (a.1 + (b.1 - a.1) * m) * sprd))
    }
    var L: [Double] = []
    var total = 0.0
    for i in 0..<M {
        let a = pts[i]
        let b = pts[(i + 1) % M]
        let l = hypot(b.0 - a.0, b.1 - a.1)
        L.append(l)
        total += l
    }

    let n = morphN(o.o("iconD", 1))
    let re = o.o("rDot", 0.021) * 1.35 * sprd
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
        let f = L[seg] != 0 ? min(1, (target - acc) / L[seg]) : 0
        let x = (a.0 + (b.0 - a.0) * f) * pulse
        let y = (a.1 + (b.1 - a.1) * f) * pulse
        dots.append(OrbDot(x: c2 + x * size, y: c2 + y * size, z: 0,
                           r: max(0.35, re * size), white: 0.1))
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.25))
}

// MARK: - Ribbon / Ring (composing / breathing)

/// Ribbon: an undulating sash of parallel strands rides a great circle —
/// composing. The same painter drives "breathing" (ring) via the `faceOn` flag.
func orbDrawRibbon(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.78
    let spin = o.o("spin", 1)
    let camTilt = 0.3
    let pt = orbMakeProj(yaw: t * 0.1 * spin, tilt: camTilt, cx: cx, cy: cy, scale: 1)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))
    let faceOn = o["faceOn"] != nil

    var dots: [OrbDot] = []
    let ghostN = intOpt(o, "ghostN", 150)
    for i in 0..<ghostN {
        let d = orbFibDir(Double(i), Double(ghostN))
        let (px, py, z) = pt(d.0 * R, d.1 * R, d.2 * R)
        let depth = (z / R + 1) / 2
        dots.append(OrbDot(x: px, y: py, z: z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth))
    }

    let ya = t * 0.24 * spin
    let ta = faceOn ? -camTilt : 0.55 + 0.3 * sin(t * 0.18) * spin
    let ux = cos(ya), uy = 0.0, uz = sin(ya)
    let vx = -uz * sin(ta), vy = cos(ta), vz = ux * sin(ta)
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx

    let wobAmp = 0.23 * o.o("wobMul", 1)
    let baseR = faceOn ? R / (1 + 0.85 * wobAmp) : R

    let baseLanes = o.o("lanes", 5)
    let segs = intOpt(o, "segs", 88)
    let lanes = max(1, Int(orbRound(baseLanes * o.o("bandMul", 1))))
    for w in 0..<lanes {
        let laneOff = (Double(w) - Double(lanes - 1) / 2) * 0.075
        let edge = abs(Double(w) - Double(lanes - 1) / 2) / max(1, Double(lanes - 1) / 2)
        for k in 0..<segs {
            let a = (Double(k) / Double(segs)) * 2 * .pi
            let wob = (0.16 * sin(a * 3 - t * 1.7 + Double(w) * 0.22) + 0.07 * sin(a * 5 + t * 1.1)) * o.o("wobMul", 1)
            let radial = faceOn ? 1 + wob : 1
            let off = faceOn ? laneOff : laneOff + wob
            let x = ux * cos(a) + vx * sin(a) + nx * off
            let y = uy * cos(a) + vy * sin(a) + ny * off
            let z = uz * cos(a) + vz * sin(a) + nz * off
            let l = sqrt(x * x + y * y + z * z)
            let rr = baseR * radial
            let (px, py, zr) = pt((x / l) * rr, (y / l) * rr, (z / l) * rr)
            let depth = (zr / R + 1) / 2
            dots.append(OrbDot(x: px, y: py, z: zr,
                               r: (o.o("rBase", 1.1) + o.o("rDepth", 1.7) * depth) * (1 - 0.25 * edge) * rs,
                               white: 0.52 - 0.44 * depth + 0.18 * edge,
                               a: 0.4 + 0.6 * depth))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

// MARK: - Braid (weaving)

/// Three strands plait around the sphere — the "weaving" state.
func orbDrawBraid(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.76
    let pt = orbMakeProj(yaw: t * 0.4, tilt: 0.3, cx: cx, cy: cy, scale: 1)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))

    var dots: [OrbDot] = []
    let ghostN = intOpt(o, "ghostN", 150)
    for i in 0..<ghostN {
        let d = orbFibDir(Double(i), Double(ghostN))
        let (px, py, z) = pt(d.0 * R, d.1 * R, d.2 * R)
        let depth = (z / R + 1) / 2
        dots.append(OrbDot(x: px, y: py, z: z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth))
    }

    let strandN = intOpt(o, "strandN", 52)
    let turns = o.o("turns", 3)
    for s in 0..<3 {
        let phase = (Double(s) / 3) * 2 * .pi
        for i in 0..<strandN {
            let u = (orbFrac(Double(i) / Double(strandN) + t * 0.045) * 2 - 1) * 0.96
            let surf = sqrt(max(0, 1 - u * u))
            let endFade = min(1, (1 - abs(u)) / 0.1)
            let a = u * .pi * turns + phase
            let weave = 1 + 0.075 * sin(u * .pi * turns * 2 + phase * 2 + t * 0.8)
            let rr = surf * R * weave
            let (px, py, zr) = pt(cos(a) * rr, u * R * weave, sin(a) * rr)
            let depth = (zr / R + 1) / 2
            dots.append(OrbDot(x: px, y: py, z: zr,
                               r: (o.o("rBase", 1.2) + o.o("rDepth", 1.8) * depth) * rs,
                               white: 0.55 - 0.45 * depth,
                               a: endFade * (0.45 + 0.55 * depth)))
        }
    }
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}

// MARK: - Web (connecting)

/// A constellation wires itself — the "connecting" state. Nodes drift on the
/// sphere under slow value noise; close pairs grow an edge, bright packets run.
func orbDrawWeb(_ ctx: inout GraphicsContext, size: Double, t: Double, dark: Bool, o: ModeOpts) {
    let cx = size / 2
    let cy = size / 2
    let R = (size / 2) * 0.8 * o.o("spread", 1)
    // the projector carries the radius as its scale, so node vectors stay
    // unit-length and distances below are in unit-sphere space
    let pt = orbMakeProj(yaw: t * 0.12, tilt: 0.32, cx: cx, cy: cy, scale: R)
    let rs = orbRadiusScale(size, rsPow: o.o("rsPow", 0.6))

    let nodeN = intOpt(o, "nodeN", 30)
    let thr = o.o("thr", 0.72)
    let nodeR = o.o("nodeR", 1.4)
    let nodeRDepth = o.o("nodeRDepth", 1.8)

    var nodes: [(Double, Double, Double)] = []
    for i in 0..<nodeN {
        let d = orbFibDir(Double(i), Double(nodeN))
        let x = d.0 + 0.3 * (orbVNoise(Double(i) * 0.31 + 9, t * 0.24) - 0.5) * 2
        let y = d.1 + 0.3 * (orbVNoise(Double(i) * 0.53 + 27, t * 0.21) - 0.5) * 2
        let z = d.2 + 0.3 * (orbVNoise(Double(i) * 0.77 + 55, t * 0.27) - 0.5) * 2
        let l = sqrt(x * x + y * y + z * z)
        nodes.append((x / l, y / l, z / l))
    }

    var lines: [OrbLine] = []
    var dots: [OrbDot] = []

    for i in 0..<nodeN {
        for j in (i + 1)..<nodeN {
            let dx = nodes[i].0 - nodes[j].0
            let dy = nodes[i].1 - nodes[j].1
            let dz = nodes[i].2 - nodes[j].2
            let dist = sqrt(dx * dx + dy * dy + dz * dz)
            if dist >= thr { continue }
            let (x1, y1, z1) = pt(nodes[i].0, nodes[i].1, nodes[i].2)
            let (x2, y2, z2) = pt(nodes[j].0, nodes[j].1, nodes[j].2)
            let depth = ((z1 + z2) / 2 + 1) / 2
            lines.append(OrbLine(x1: x1, y1: y1, x2: x2, y2: y2,
                                 white: 0.42,
                                 a: (1 - dist / thr) * (0.3 + 0.55 * depth),
                                 w: max(0.6, o.o("lineW", 0.8) * rs)))
        }
    }

    for i in 0..<nodeN {
        let (px, py, z) = pt(nodes[i].0, nodes[i].1, nodes[i].2)
        let depth = (z + 1) / 2
        let pulse = 1 + 0.25 * sin(t * 1.4 + Double(i) * 2.7)
        dots.append(OrbDot(x: px, y: py, z: z,
                           r: (nodeR + nodeRDepth * depth) * pulse * rs,
                           white: 0.55 - 0.45 * depth))
    }

    let signals = intOpt(o, "signals", 5)
    for s in 0..<signals {
        let seg = floor(t * 0.55 + Double(s) * 7.31)
        let a = Int(floor(orbHashD(seg, Double(s) * 3.1 + 1.7) * Double(nodeN)))
        let b = Int(floor(orbHashD(seg, Double(s) * 5.7 + 4.2) * Double(nodeN)))
        if a == b { continue }
        let f = orbFrac(t * 0.55 + Double(s) * 7.31)
        let x = orbLerp(nodes[a].0, nodes[b].0, f)
        let y = orbLerp(nodes[a].1, nodes[b].1, f)
        let z = orbLerp(nodes[a].2, nodes[b].2, f)
        let l = max(1e-6, sqrt(x * x + y * y + z * z))
        let (px, py, zr) = pt(x / l, y / l, z / l)
        let depth = (zr + 1) / 2
        dots.append(OrbDot(x: px, y: py, z: zr,
                           r: (nodeR * 1.5 + nodeRDepth * depth) * rs,
                           white: 0.05,
                           a: 0.5 + 0.5 * depth))
    }

    orbPaintLines(&ctx, lines: lines, dark: dark)
    orbPaint(&ctx, dots: dots, dark: dark, rMin: o.o("rMin", 0.3))
}
