# react-native-thinking-orbs

Animated dotted thinking states for React Native AI, agent, and voice
interfaces.

[![CI](https://github.com/Shrit1401/react-native-thinking-orbs/actions/workflows/ci.yml/badge.svg)](https://github.com/Shrit1401/react-native-thinking-orbs/actions/workflows/ci.yml)

`react-native-thinking-orbs` provides six carefully tuned animations with no
native linking, canvas, SVG, WebGL, or additional runtime dependencies. It
works on iOS and Android with the standard React Native `View`.

The animation system is adapted from
[thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) by Jakub Antalik
and Alex Brinza. The original project and this adaptation are available under
the MIT License.

## Features

- Six distinct states: working, searching, solving, listening, composing, and
  shaping
- Any positive display size
- Automatic dark and light color schemes
- Adjustable speed, frame rate, and dot density
- Pause and resume without animation jumps
- Automatic pause while the app is backgrounded
- Respects the operating system reduced-motion preference
- Screen-reader labels included by default
- TypeScript types included
- No native linking or extra runtime package required

## Install

Until the first npm release, install directly from GitHub:

```sh
npm install github:Shrit1401/react-native-thinking-orbs
```

After the npm release:

```sh
npm install react-native-thinking-orbs
```

The only required peer dependencies are React and React Native.

## Quick start

```tsx
import { ThinkingOrb } from 'react-native-thinking-orbs';

export function AssistantStatus() {
  return <ThinkingOrb state="working" />;
}
```

Use one of the six exported states:

```tsx
import { ThinkingOrb } from 'react-native-thinking-orbs';

export function AgentStates() {
  return (
    <>
      <ThinkingOrb state="working" />
      <ThinkingOrb state="searching" />
      <ThinkingOrb state="solving" />
      <ThinkingOrb state="listening" />
      <ThinkingOrb state="composing" />
      <ThinkingOrb state="shaping" />
    </>
  );
}
```

## Customized orb

```tsx
<ThinkingOrb
  state="listening"
  size={112}
  theme="dark"
  speed={1.2}
  frameRate={30}
  density={0.9}
  accessibilityLabel="Listening for your request"
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `state` | `OrbState` | `'working'` | Selects one of the six animations. |
| `size` | `number` | `64` | Width and height in density-independent pixels. |
| `theme` | `'auto' \| 'dark' \| 'light'` | `'auto'` | Selects the monochrome palette. |
| `speed` | `number` | `1` | Multiplies the tuned animation speed. |
| `paused` | `boolean` | `false` | Freezes and resumes the current frame. |
| `frameRate` | `number` | `30` | Limits rendering from 1 through 60 frames per second. |
| `density` | `number` | `1` | Adjusts dot density from 0.1 through 2. |
| `initialTime` | `number` | `0.6` | Selects a deterministic initial frame. |
| `accessibilityLabel` | `string` | State label | Overrides the screen-reader label. |
| `style` | `StyleProp<ViewStyle>` | None | Styles the outer native view. |

Standard React Native `ViewProps` are also supported.

## Advanced frame API

Consumers with a custom renderer or animation clock can generate deterministic
frames directly:

```tsx
import { createNativeOrbFrame } from 'react-native-thinking-orbs';

const circles = createNativeOrbFrame({
  state: 'searching',
  size: 96,
  time: 1.5,
  dark: true,
  density: 1,
});
```

Each returned circle contains `x`, `y`, `radius`, and `color`.

## Performance

The component defaults to 30 frames per second and uses state-specific native
dot budgets. For tiny inline indicators, sizes below 40 points use the
upstream 20-pixel tuning. Larger indicators use the 64-pixel tuning and scale
cleanly to the requested size.

For lists containing many simultaneous orbs, lower `density`, lower
`frameRate`, or pause offscreen instances.

## Development

```sh
npm install
npm run check
```

`npm run check` runs TypeScript validation, deterministic frame tests, and the
web compatibility build.

## Publishing

Releases are prepared through the GitHub Actions release workflow. Maintainers
can also validate the exact package contents locally:

```sh
npm pack --dry-run
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution process and
[SECURITY.md](SECURITY.md) for vulnerability reporting.

## License and attribution

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
