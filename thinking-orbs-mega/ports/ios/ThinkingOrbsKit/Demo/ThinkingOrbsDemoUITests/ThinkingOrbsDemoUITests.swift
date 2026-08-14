import XCTest

final class ThinkingOrbsDemoUITests: XCTestCase {
    @MainActor
    func testStateSelectionUpdatesSwiftExample() {
        let app = XCUIApplication()
        app.launch()

        let demo = app.scrollViews["orb-demo"]
        XCTAssertTrue(demo.waitForExistence(timeout: 5))

        let sizePicker = app.segmentedControls["size-picker"]
        XCTAssertTrue(sizePicker.waitForExistence(timeout: 3))
        sizePicker.buttons["128 pt"].tap()

        let searching = app.buttons["orb-state-searching"]
        XCTAssertTrue(searching.waitForExistence(timeout: 3))
        searching.tap()

        for _ in 0..<6 {
            demo.swipeUp()
        }

        let code = app.descendants(matching: .any)["swift-example-code"]
        XCTAssertTrue(code.waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '.searching'")).firstMatch.exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'size: .large'")).firstMatch.exists)

        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "Thinking Orbs Swift Example"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
