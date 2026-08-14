import XCTest
@testable import ThinkingOrbs

final class ThinkingOrbsTests: XCTestCase {
    func testEveryStateAndSizeProducesFiniteGeometry() {
        for state in OrbState.allCases {
            for size in OrbSize.allCases {
                let preset = OrbPreset.resolve(state: state, size: size)
                let frame = OrbEngine.frame(
                    mode: preset.mode,
                    options: preset.options,
                    size: size.rawValue,
                    time: 0.6 * preset.speed
                )

                XCTAssertFalse(frame.dots.isEmpty, "\(state) at \(size) produced no dots")
                XCTAssertTrue(frame.minimumRadius.isFinite)
                for dot in frame.dots {
                    XCTAssertTrue(dot.x.isFinite)
                    XCTAssertTrue(dot.y.isFinite)
                    XCTAssertTrue(dot.z.isFinite)
                    XCTAssertTrue(dot.radius.isFinite)
                    XCTAssertTrue(dot.ink.isFinite)
                    XCTAssertTrue(dot.alpha.isFinite)
                    XCTAssertGreaterThan(dot.radius, 0)
                }
                for line in frame.lines {
                    XCTAssertTrue(line.x1.isFinite)
                    XCTAssertTrue(line.y1.isFinite)
                    XCTAssertTrue(line.x2.isFinite)
                    XCTAssertTrue(line.y2.isFinite)
                    XCTAssertTrue(line.ink.isFinite)
                    XCTAssertTrue(line.alpha.isFinite)
                    XCTAssertTrue(line.width.isFinite)
                    XCTAssertGreaterThan(line.width, 0)
                }
            }
        }
    }

    func testFramesAreDeterministic() {
        for state in OrbState.allCases {
            let preset = OrbPreset.resolve(state: state, size: .regular)
            let first = OrbEngine.frame(
                mode: preset.mode,
                options: preset.options,
                size: OrbSize.regular.rawValue,
                time: 12.345
            )
            let second = OrbEngine.frame(
                mode: preset.mode,
                options: preset.options,
                size: OrbSize.regular.rawValue,
                time: 12.345
            )
            XCTAssertEqual(first, second, "\(state) is not deterministic")
        }
    }

    func testPurposeTunedSizesUseDifferentGeometryCounts() {
        for state in OrbState.allCases {
            let largePreset = OrbPreset.resolve(state: state, size: .large)
            let regularPreset = OrbPreset.resolve(state: state, size: .regular)
            let compactPreset = OrbPreset.resolve(state: state, size: .compact)
            let large = OrbEngine.frame(
                mode: largePreset.mode,
                options: largePreset.options,
                size: OrbSize.large.rawValue,
                time: 0.6
            )
            let regular = OrbEngine.frame(
                mode: regularPreset.mode,
                options: regularPreset.options,
                size: OrbSize.regular.rawValue,
                time: 0.6
            )
            let compact = OrbEngine.frame(
                mode: compactPreset.mode,
                options: compactPreset.options,
                size: OrbSize.compact.rawValue,
                time: 0.6
            )
            XCTAssertNotEqual(
                regular.dots.count,
                compact.dots.count,
                "\(state) sizes should use separate density tuning"
            )
            XCTAssertNotEqual(
                large.dots.count,
                regular.dots.count,
                "\(state) sizes should use separate density tuning"
            )
        }
    }

    func testStateMappingCoversEveryRenderer() {
        let modes = Set(OrbState.allCases.map { OrbPreset.resolve(state: $0, size: .regular).mode })
        XCTAssertEqual(modes, Set(OrbMode.allCases))
    }

    func testPublishedSizesRemainStable() {
        XCTAssertEqual(OrbSize.compact.points, 20)
        XCTAssertEqual(OrbSize.regular.points, 64)
        XCTAssertEqual(OrbSize.large.points, 128)
    }
}
