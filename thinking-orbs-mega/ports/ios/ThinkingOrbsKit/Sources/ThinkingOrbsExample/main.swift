import SwiftUI
import ThinkingOrbs

@main
struct ThinkingOrbsExampleApp: App {
    var body: some Scene {
        WindowGroup {
            OrbGallery()
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 720, height: 680)
    }
}

private struct OrbGallery: View {
    @State private var speed = 1.0
    @State private var paused = false
    @State private var darkBackground = false

    private let columns = [GridItem(.adaptive(minimum: 180), spacing: 16)]

    var body: some View {
        VStack(spacing: 0) {
            controls
            ScrollView {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(OrbState.allCases, id: \.self) { state in
                        card(for: state)
                    }
                }
                .padding(24)
            }
        }
        .background(darkBackground ? Color.black : Color.white)
        .preferredColorScheme(darkBackground ? .dark : .light)
    }

    private var controls: some View {
        HStack(spacing: 16) {
            Text("Thinking Orbs")
                .font(.headline)
            Spacer()
            HStack(spacing: 8) {
                Text("Speed")
                    .foregroundStyle(.secondary)
                Slider(value: $speed, in: 0.25...2, step: 0.25)
                    .frame(width: 120)
                Text(speed, format: .number.precision(.fractionLength(2)))
                    .monospacedDigit()
                    .frame(width: 36, alignment: .trailing)
            }
            Toggle("Pause", isOn: $paused)
            Toggle("Dark", isOn: $darkBackground)
        }
        .padding(.horizontal, 24)
        .frame(height: 56)
        .background(.thinMaterial)
    }

    private func card(for state: OrbState) -> some View {
        VStack(spacing: 12) {
            ThinkingOrb(
                state: state,
                size: .large,
                speed: speed,
                paused: paused
            )
            HStack(spacing: 8) {
                ThinkingOrb(
                    state: state,
                    size: .regular,
                    speed: speed,
                    paused: paused
                )
                ThinkingOrb(
                    state: state,
                    size: .compact,
                    speed: speed,
                    paused: paused
                )
                Text(state.rawValue.capitalized)
                    .font(.callout.weight(.medium))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.primary.opacity(0.08))
        }
    }
}

#Preview {
    OrbGallery()
        .frame(width: 720, height: 680)
}
