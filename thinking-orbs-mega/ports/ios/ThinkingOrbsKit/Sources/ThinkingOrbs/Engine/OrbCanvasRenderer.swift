import SwiftUI

enum OrbCanvasRenderer {
    static func render(_ frame: OrbFrame, in context: inout GraphicsContext, dark: Bool) {
        for line in frame.lines where line.alpha >= 0.02 {
            let gray = resolvedGray(line.ink, dark: dark)
            var path = Path()
            path.move(to: CGPoint(x: line.x1, y: line.y1))
            path.addLine(to: CGPoint(x: line.x2, y: line.y2))
            context.stroke(
                path,
                with: .color(Color(white: gray).opacity(OrbMath.clamped(line.alpha))),
                lineWidth: max(0, line.width)
            )
        }

        for dot in frame.dots.sorted(by: { $0.z < $1.z }) where dot.alpha >= 0.02 {
            let gray = resolvedGray(dot.ink, dark: dark)
            let radius = max(frame.minimumRadius, dot.radius)
            let rect = CGRect(
                x: dot.x - radius,
                y: dot.y - radius,
                width: radius * 2,
                height: radius * 2
            )
            context.fill(
                Path(ellipseIn: rect),
                with: .color(Color(white: gray).opacity(OrbMath.clamped(dot.alpha)))
            )
        }
    }

    private static func resolvedGray(_ ink: Double, dark: Bool) -> Double {
        let value = OrbMath.clamped(ink)
        return dark ? 1 - value : value
    }
}
