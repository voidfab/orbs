//
//  DemoView.swift
//  ThinkingOrbsDemo
//
//  Gallery + playground for the nine ThinkingOrb states.
//

import SwiftUI

struct DemoView: View {
    @State private var selectedState: OrbState = .working
    @State private var sizePreset: Double = 64      // 64 or 20
    @State private var speed: Double = 1.0
    @State private var paused: Bool = false
    @State private var forceDark: Bool = false

    private let columns = [GridItem(.adaptive(minimum: 92), spacing: 20)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {

                    // Hero — the live-site scale
                    VStack(spacing: 10) {
                        ThinkingOrb(state: selectedState, size: 140, speed: speed, paused: paused, theme: themeMode)
                        ShimmerText(text: selectedState.label, font: .headline)
                    }
                    .padding(.top, 16)

                    // Chat-bubble inline usage (size-20 preset)
                    HStack(spacing: 10) {
                        ThinkingOrb(state: selectedState, size: 20, speed: speed, paused: paused, theme: themeMode)
                        ShimmerText(text: "Assistant is \(selectedState.label.replacingOccurrences(of: "…", with: "").lowercased())…", font: .subheadline)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.thickMaterial, in: Capsule())

                    Divider()

                    // Full gallery — all nine states
                    Text("All states").font(.title3.bold())
                    LazyVGrid(columns: columns, spacing: 22) {
                        ForEach(OrbState.allCases) { s in
                            Button {
                                selectedState = s
                            } label: {
                                VStack(spacing: 8) {
                                    ThinkingOrb(state: s, size: 56, speed: speed, paused: paused, theme: themeMode)
                                    ShimmerText(text: s.rawValue, font: .caption)
                                }
                                .padding(10)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(s == selectedState ? Color.accentColor.opacity(0.12) : .clear)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Divider()

                    // Playground
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Playground").font(.title3.bold())

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Preview size")
                            Picker("Size", selection: $sizePreset) {
                                Text("64 (avatar)").tag(Double(64))
                                Text("20 (inline)").tag(Double(20))
                            }
                            .pickerStyle(.segmented)
                        }

                        ThinkingOrb(state: selectedState,
                                    size: CGFloat(sizePreset),
                                    speed: speed, paused: paused, theme: themeMode)
                            .frame(height: 80, alignment: .center)
                            .frame(maxWidth: .infinity)

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Speed: \(speed, specifier: "%.2f")×")
                            Slider(value: $speed, in: 0.25...3.0)
                        }

                        Toggle("Paused", isOn: $paused)
                        Toggle("Force dark theme", isOn: $forceDark)
                    }
                    .padding()
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                }
                .padding()
            }
            .navigationTitle("Thinking Orbs")
            .preferredColorScheme(forceDark ? .dark : nil)
        }
    }

    private var themeMode: OrbTheme { forceDark ? .dark : .auto }
}

#Preview {
    DemoView()
}
