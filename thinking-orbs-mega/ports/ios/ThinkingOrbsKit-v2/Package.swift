// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "thinking-orbs-swift",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "ThinkingOrbs", targets: ["ThinkingOrbs"]),
    ],
    targets: [
        .target(name: "ThinkingOrbs"),
        .testTarget(
            name: "ThinkingOrbsTests",
            dependencies: ["ThinkingOrbs"]
        ),
    ]
)
