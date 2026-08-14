import ThinkingOrbs
import SwiftUI
import UIKit

struct ContentView: View {
    @State private var selectedState: OrbState = .working
    @State private var speed = 1.0
    @State private var paused = false
    @State private var selectedTheme: DemoTheme = .system
    @State private var selectedSize: OrbSize = .regular
    @State private var copied = false

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.indigo.opacity(0.13),
                    Color.cyan.opacity(0.09),
                    Color(.systemBackground),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    controls
                    focusedPreview
                    stateGallery
                    swiftExample
                    packageBehavior
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 24)
            }
            .accessibilityIdentifier("orb-demo")
        }
        .preferredColorScheme(selectedTheme.colorScheme)
    }

    private var header: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [.indigo, .cyan],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                ThinkingOrb(state: .working, size: .regular, theme: .dark)
            }
            .frame(width: 84, height: 84)
            .shadow(color: .indigo.opacity(0.24), radius: 16, y: 8)

            VStack(alignment: .leading, spacing: 4) {
                Text("Thinking Orbs")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                Text("Native activity indicators for SwiftUI")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Thinking Orbs. Native activity indicators for SwiftUI.")
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Controls")
                .font(.title2.bold())

            VStack(alignment: .leading, spacing: 8) {
                Text("Appearance")
                    .font(.subheadline.weight(.semibold))
                Picker("Appearance", selection: $selectedTheme) {
                    ForEach(DemoTheme.allCases) { theme in
                        Text(theme.title).tag(theme)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("theme-picker")
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Size")
                    .font(.subheadline.weight(.semibold))
                Picker("Size", selection: $selectedSize) {
                    ForEach(OrbSize.allCases, id: \.self) { size in
                        Text(size.demoPickerTitle).tag(size)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("size-picker")
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Speed")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(speed, format: .number.precision(.fractionLength(2)))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Slider(value: $speed, in: 0.25...2, step: 0.25)
                    .tint(.indigo)
                    .accessibilityIdentifier("speed-slider")
            }

            Toggle(isOn: $paused) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pause animation")
                        .font(.headline)
                    Text("Keep every orb on its current frame")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .tint(.indigo)
            .accessibilityIdentifier("pause-toggle")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var focusedPreview: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Selected state")
                    .font(.title2.bold())
                Text(selectedState.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 24) {
                ThinkingOrb(
                    state: selectedState,
                    size: selectedSize,
                    theme: selectedTheme.orbTheme,
                    speed: speed,
                    paused: paused
                )
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 10) {
                    Text(selectedState.title)
                        .font(.title.bold())
                    Label(selectedSize.demoDescription, systemImage: "circle.grid.3x3.fill")
                    HStack(spacing: 8) {
                        ThinkingOrb(
                            state: selectedState,
                            size: .compact,
                            theme: selectedTheme.orbTheme,
                            speed: speed,
                            paused: paused
                        )
                        Text("20 pt compact")
                    }
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 120)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityIdentifier("selected-state")
    }

    private var stateGallery: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Nine states")
                    .font(.title2.bold())
                Text("Tap a state to update the focused preview and Swift example.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(OrbState.allCases, id: \.self) { state in
                    StateCard(
                        state: state,
                        selected: selectedState == state,
                        theme: selectedTheme.orbTheme,
                        speed: speed,
                        paused: paused
                    ) {
                        selectedState = state
                    }
                }
            }
        }
        .accessibilityIdentifier("state-gallery")
    }

    private var swiftExample: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Swift example")
                    .font(.title2.bold())
                Spacer()
                Button {
                    UIPasteboard.general.string = "import ThinkingOrbs\nimport SwiftUI\n\n\(exampleCode)"
                    copied = true
                    Task {
                        try? await Task.sleep(for: .seconds(1.5))
                        copied = false
                    }
                } label: {
                    Label(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc")
                        .font(.caption.weight(.semibold))
                }
                .buttonStyle(.borderless)
                .accessibilityIdentifier("copy-example")
            }

            Text(exampleCode)
                .font(.system(.footnote, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                .accessibilityIdentifier("swift-example-code")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var packageBehavior: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Package behavior")
                .font(.title2.bold())
            Label("Follows system light and dark appearance", systemImage: "circle.lefthalf.filled")
            Label("Shows a static frame when Reduce Motion is enabled", systemImage: "figure.walk.motion")
            Label("Pauses when the app scene becomes inactive", systemImage: "pause.circle")
            Label("Provides a default accessibility label for every state", systemImage: "accessibility")
            Text("ThinkingOrbs is visual-only. The host app owns optional sounds and haptics for meaningful state transitions.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.top, 4)
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var exampleCode: String {
        """
        ThinkingOrb(
            state: .\(selectedState.rawValue),
            size: .\(selectedSize.codeValue),
            theme: .\(selectedTheme.orbThemeCode),
            speed: \(speed.formatted(.number.precision(.fractionLength(2)))),
            paused: \(paused)
        )
        """
    }
}

private enum DemoTheme: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: Self { self }
    var title: String { rawValue.capitalized }

    var orbTheme: OrbTheme {
        switch self {
        case .system: .automatic
        case .light: .light
        case .dark: .dark
        }
    }

    var orbThemeCode: String {
        switch self {
        case .system: "automatic"
        case .light: "light"
        case .dark: "dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

private struct StateCard: View {
    let state: OrbState
    let selected: Bool
    let theme: OrbTheme
    let speed: Double
    let paused: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    ThinkingOrb(
                        state: state,
                        size: .regular,
                        theme: theme,
                        speed: speed,
                        paused: paused
                    )
                    Spacer()
                    Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(selected ? .indigo : .secondary.opacity(0.4))
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 7) {
                        ThinkingOrb(
                            state: state,
                            size: .compact,
                            theme: theme,
                            speed: speed,
                            paused: paused
                        )
                        Text(state.title)
                            .font(.headline)
                    }
                    Text(state.summary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 150, alignment: .leading)
            .padding(14)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(selected ? Color.indigo : Color.primary.opacity(0.08), lineWidth: selected ? 2 : 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Select \(state.title). \(state.summary)")
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("orb-state-\(state.rawValue)")
    }
}

#Preview {
    ContentView()
}
