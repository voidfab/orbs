import SwiftUI
import XCTest

@testable import ThinkingOrbs

final class ThinkingOrbsRenderTests: XCTestCase {
    /// Every state must resolve a preset at both tuned sizes.
    func testAllPresetsResolve() {
        for state in OrbState.allCases {
            for size in OrbSizePreset.allCases {
                let resolved = orbResolvePreset(state: state, size: size)
                XCTAssertGreaterThan(resolved.speed, 0, "\(state)/\(size)")
                XCTAssertFalse(resolved.opts.isEmpty, "\(state)/\(size)")
            }
        }
    }

    /// Render each state once and check that actual ink lands on the bitmap.
    @MainActor
    func testAllStatesRenderInk() throws {
        for state in OrbState.allCases {
            let renderer = ImageRenderer(content: ThinkingOrbView(state: state, theme: .light))
            renderer.scale = 2
            let cg = try XCTUnwrap(renderer.cgImage, "no image for \(state)")
            XCTAssertGreaterThan(inkedPixels(cg), 50, "state \(state) rendered no ink")
        }
    }

    /// Opt-in visual dump: `THINKING_ORBS_DUMP=/some/dir swift test ...`
    /// writes one PNG per state for eyeballing against the reference demo.
    @MainActor
    func testDumpFrames() throws {
        guard let dir = ProcessInfo.processInfo.environment["THINKING_ORBS_DUMP"] else {
            throw XCTSkip("set THINKING_ORBS_DUMP to a directory to dump frames")
        }
        for state in OrbState.allCases {
            let renderer = ImageRenderer(content: ThinkingOrbView(state: state, theme: .light)
                .padding(8)
                .background(Color.white))
            renderer.scale = 4
            let cg = try XCTUnwrap(renderer.cgImage, "no image for \(state)")
            let url = URL(fileURLWithPath: dir).appendingPathComponent("orb-\(state.rawValue).png")
            guard let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
                XCTFail("no destination for \(state)")
                continue
            }
            CGImageDestinationAddImage(dest, cg, nil)
            XCTAssertTrue(CGImageDestinationFinalize(dest))
        }
    }

    private func inkedPixels(_ image: CGImage) -> Int {
        let w = image.width
        let h = image.height
        var pixels = [UInt8](repeating: 0, count: w * h * 4)
        guard let ctx = CGContext(
            data: &pixels,
            width: w,
            height: h,
            bitsPerComponent: 8,
            bytesPerRow: w * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return 0 }
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        var count = 0
        for i in stride(from: 3, to: pixels.count, by: 4) where pixels[i] > 8 {
            count += 1
        }
        return count
    }
}
