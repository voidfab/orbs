// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "ThinkingOrbs",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
        .tvOS(.v16),
        .visionOS(.v1),
    ],
    products: [
        .library(name: "ThinkingOrbs", targets: ["ThinkingOrbs"]),
        .executable(name: "ThinkingOrbsExample", targets: ["ThinkingOrbsExample"]),
    ],
    targets: [
        .target(name: "ThinkingOrbs"),
        .executableTarget(name: "ThinkingOrbsExample", dependencies: ["ThinkingOrbs"]),
        .testTarget(name: "ThinkingOrbsTests", dependencies: ["ThinkingOrbs"]),
    ]
)
