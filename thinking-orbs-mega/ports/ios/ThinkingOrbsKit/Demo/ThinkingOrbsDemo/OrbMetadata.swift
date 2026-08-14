import ThinkingOrbs

extension OrbState {
    var title: String {
        rawValue.capitalized
    }

    var summary: String {
        switch self {
        case .working:
            "Particles move across tilted orbits."
        case .searching:
            "A scan meridian sweeps a dotted globe."
        case .solving:
            "Bands scramble and return to a solved sphere."
        case .listening:
            "A waveform rolls through the sphere."
        case .connecting:
            "A constellation builds links and sends signals."
        case .weaving:
            "Three strands move around the sphere."
        case .composing:
            "An undulating band crosses the orb."
        case .breathing:
            "A dotted ring slowly changes shape."
        case .shaping:
            "An outline changes between three forms."
        }
    }
}

extension OrbSize {
    var demoPickerTitle: String {
        switch self {
        case .compact: "20 pt"
        case .regular: "64 pt"
        case .large: "128 pt"
        }
    }

    var demoDescription: String {
        switch self {
        case .compact: "20 pt compact"
        case .regular: "64 pt regular"
        case .large: "128 pt large"
        }
    }

    var codeValue: String {
        switch self {
        case .compact: "compact"
        case .regular: "regular"
        case .large: "large"
        }
    }
}
