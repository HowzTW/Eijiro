// swift-tools-version: 5.8
import PackageDescription

let package = Package(
    name: "DramaScraperApp",
    platforms: [
        .macOS(.v13)
    ],
    dependencies: [
        .package(url: "https://github.com/scinfu/SwiftSoup.git", from: "2.6.0"),
    ],
    targets: [
        .executableTarget(
            name: "DramaScraperApp",
            dependencies: [
                "SwiftSoup"
            ],
            path: "Sources/DramaScraperApp"
        )
    ]
)
