# svelte-thinking-orbs

Use `svelte-thinking-orbs` to render dotted thought-orb indicators for AI and agent UIs in Svelte 5. It provides nine tuned states through a transparent canvas component that can be placed inside assistants, editors, inputs, buttons, or loading surfaces without adding its own background.

## Install

```bash
npm install svelte-thinking-orbs
# or
pnpm add svelte-thinking-orbs
# or
yarn add svelte-thinking-orbs
```

## Basic usage

```svelte
<script lang="ts">
	import { ThinkingOrb } from "svelte-thinking-orbs";
</script>

<ThinkingOrb state="composing" size={48} />
```

## Choose a state

- `working`: general processing or active work.
- `searching`: retrieval, browsing, or discovery.
- `solving`: reasoning through a complex problem.
- `listening`: waiting for voice or user input.
- `connecting`: linking tools, agents, and data sources.
- `weaving`: combining multiple threads into one result.
- `composing`: generating a response or artifact.
- `breathing`: quietly thinking or waiting between steps.
- `shaping`: structuring or transforming content.

Choose the state that describes the current task. Do not use a random state only for visual variety.

## Props

- `state`: one of the nine states above. Defaults to `working`.
- `size`: numeric canvas size. Defaults to `64`.
- `theme`: `auto`, `dark`, or `light`. Defaults to `auto` and detects the surrounding theme.
- `color`: any CSS color. Overrides the theme color.
- `speed`: animation speed multiplier. Defaults to `1`.
- `paused`: freezes the animation at its current frame.
- `static`: renders one representative frame without joining the animation loop.
- `class`, `style`, ARIA attributes, and native canvas attributes are forwarded to the canvas.

## Common patterns

Custom color:

```svelte
<ThinkingOrb state="searching" color="#7dd3fc" />
```

Non-animated output:

```svelte
<ThinkingOrb state="solving" static />
```

Accessible contextual label:

```svelte
<ThinkingOrb state="working" aria-label="Generating report" />
```

## Implementation notes

- The component already respects `prefers-reduced-motion`.
- Animated instances share one animation clock and pause while offscreen or when the page is hidden.
- Prefer `static` for documentation, email captures, tests, and other contexts that do not need motion.
- Keep the orb next to text that explains what the system is doing when the state may be ambiguous.
