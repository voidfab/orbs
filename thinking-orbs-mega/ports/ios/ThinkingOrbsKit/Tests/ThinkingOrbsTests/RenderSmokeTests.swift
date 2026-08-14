import ImageIO
import SwiftUI
import UniformTypeIdentifiers
import XCTest
@testable import ThinkingOrbs

@MainActor
final class RenderSmokeTests: XCTestCase {
    func testContactSheetsRenderWhenOutputDirectoryIsConfigured() throws {
        guard let outputPath = ProcessInfo.processInfo.environment["THINKING_ORBS_RENDER_OUTPUT_DIR"] else {
            throw XCTSkip("Set THINKING_ORBS_RENDER_OUTPUT_DIR to create contact sheets.")
        }

        let outputDirectory = URL(fileURLWithPath: outputPath, isDirectory: true)
        try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
        try render(theme: .light, darkBackground: false, to: outputDirectory.appendingPathComponent("thinking-orbs-light.png"))
        try render(theme: .dark, darkBackground: true, to: outputDirectory.appendingPathComponent("thinking-orbs-dark.png"))
    }

    private func render(theme: OrbTheme, darkBackground: Bool, to url: URL) throws {
        let content = ContactSheet(theme: theme, darkBackground: darkBackground)
        let renderer = ImageRenderer(content: content)
        renderer.scale = 2
        renderer.proposedSize = ProposedViewSize(width: 816, height: 816)
        guard let image = renderer.cgImage else {
            XCTFail("ImageRenderer did not produce a CGImage")
            return
        }
        guard let destination = CGImageDestinationCreateWithURL(
            url as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
        ) else {
            XCTFail("Could not create the PNG destination")
            return
        }
        CGImageDestinationAddImage(destination, image, nil)
        XCTAssertTrue(CGImageDestinationFinalize(destination))
    }
}

private struct ContactSheet: View {
    let theme: OrbTheme
    let darkBackground: Bool

    var body: some View {
        Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            ForEach(0..<3, id: \.self) { row in
                ContactSheetRow(
                    states: Array(OrbState.allCases[(row * 3)..<(row * 3 + 3)]),
                    theme: theme,
                    darkBackground: darkBackground
                )
            }
        }
        .padding(24)
        .frame(width: 816, height: 816)
        .foregroundStyle(darkBackground ? Color.white : Color.black)
        .background(darkBackground ? Color.black : Color.white)
    }
}

private struct ContactSheetRow: View {
    let states: [OrbState]
    let theme: OrbTheme
    let darkBackground: Bool

    var body: some View {
        GridRow {
            ForEach(states, id: \.self) { state in
                ContactSheetCard(state: state, theme: theme, darkBackground: darkBackground)
            }
        }
    }
}

private struct ContactSheetCard: View {
    let state: OrbState
    let theme: OrbTheme
    let darkBackground: Bool

    var body: some View {
        VStack(spacing: 8) {
            OrbFrameView(state: state, size: .large, dark: darkBackground, time: 0.6)
            HStack(spacing: 6) {
                OrbFrameView(state: state, size: .regular, dark: darkBackground, time: 0.6)
                OrbFrameView(state: state, size: .compact, dark: darkBackground, time: 0.6)
                Text(state.rawValue.capitalized)
                    .font(.system(size: 12, weight: .medium))
            }
        }
        .frame(width: 240, height: 240)
        .background(cardBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var cardBackground: Color {
        darkBackground ? Color.white.opacity(0.08) : Color.black.opacity(0.05)
    }
}
