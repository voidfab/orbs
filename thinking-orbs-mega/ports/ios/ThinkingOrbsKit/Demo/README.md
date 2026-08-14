# Thinking Orbs for iOS

A focused SwiftUI companion app for previewing every ThinkingOrbs state, all
three purpose-tuned sizes, animation speeds, pause behavior, appearance
overrides, and copyable Swift integration code.

The demo uses the package at the repository root. This local dependency keeps
the app on the exact package source checked out with the demo.

## Run on an iPhone or simulator

1. Open `Demo/ThinkingOrbsDemo.xcodeproj` in Xcode.
2. Select the `ThinkingOrbsDemo` scheme and an iPhone destination.
3. Select a development team if Xcode requests one.
4. Press **Run**.

The app does not request accounts, network access, analytics, tracking, sound,
or haptic access. It demonstrates the visual package only. A host application
can separately use CuePulse for meaningful state transitions.

## Regenerate the project

From the `Demo` directory, regenerate the checked-in Xcode project from
`project.yml`:

```sh
xcodegen generate
```

## Validate

```sh
xcodebuild \
  -project ThinkingOrbsDemo.xcodeproj \
  -scheme ThinkingOrbsDemo \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

The UI test selects the 128-point size and a different orb state, scrolls to the
Swift example, and checks that the generated code reflects both selections.

## Attribution

The demo uses the independently maintained ThinkingOrbs Swift package. That
package derives its visual design, states, geometry, animation formulas, and
tuning from [thinking-orbs by Jakub Antalik](https://github.com/Jakubantalik/thinking-orbs),
available under the MIT License.
