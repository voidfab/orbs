import SwiftUI

struct OrbFrameView: View {
    let state: OrbState
    let size: OrbSize
    let dark: Bool
    let time: Double

    var body: some View {
        Canvas { context, canvasSize in
            let side = min(canvasSize.width, canvasSize.height)
            let preset = OrbPreset.resolve(state: state, size: size)
            let frame = OrbEngine.frame(
                mode: preset.mode,
                options: preset.options,
                size: Double(side),
                time: time
            )
            OrbCanvasRenderer.render(frame, in: &context, dark: dark)
        }
        .frame(width: size.points, height: size.points)
    }
}
