enum OrbEngine {
    static func frame(
        mode: OrbMode,
        options: OrbOptions,
        size: Double,
        time: Double
    ) -> OrbFrame {
        switch mode {
        case .orbits:
            OrbOrbitRenderer.frame(size: size, time: time, options: options)
        case .globe:
            OrbLatticeRenderer.globeFrame(size: size, time: time, options: options)
        case .rubik:
            OrbLatticeRenderer.rubikFrame(size: size, time: time, options: options)
        case .wave:
            OrbLatticeRenderer.waveFrame(size: size, time: time, options: options)
        case .web:
            OrbWebRenderer.frame(size: size, time: time, options: options)
        case .braid:
            OrbBraidRenderer.frame(size: size, time: time, options: options)
        case .ribbon, .ring:
            OrbRibbonRenderer.frame(size: size, time: time, options: options)
        case .morph:
            OrbMorphRenderer.frame(size: size, time: time, options: options)
        }
    }
}
