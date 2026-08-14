<script lang="ts">
import { type OrbState, ThinkingOrb } from "$lib/index.js";
import llmDocumentation from "../../LLM.md?raw";
import CodeSnippet from "../components/code-snippet.svelte";
import CopyButton from "../components/copy-button.svelte";
import OrbExample from "../components/orb-example.svelte";
import PackageInstall from "../components/package-install.svelte";
import Playground from "../components/playground.svelte";
import SiteFooter from "../components/site-footer.svelte";

const states: Array<{ value: OrbState; label: string; description: string }> = [
	{
		value: "working",
		label: "Working",
		description: "General processing and active work.",
	},
	{
		value: "searching",
		label: "Searching",
		description: "Retrieval, browsing and discovery.",
	},
	{
		value: "solving",
		label: "Solving",
		description: "Reasoning through a complex problem.",
	},
	{
		value: "listening",
		label: "Listening",
		description: "Waiting for voice or user input.",
	},
	{
		value: "connecting",
		label: "Connecting",
		description: "Linking tools, agents, and data sources.",
	},
	{
		value: "weaving",
		label: "Weaving",
		description: "Combining multiple threads into one result.",
	},
	{
		value: "composing",
		label: "Composing",
		description: "Generating a response or artifact.",
	},
	{
		value: "breathing",
		label: "Breathing",
		description: "Quietly thinking or waiting between steps.",
	},
	{
		value: "shaping",
		label: "Shaping",
		description: "Structuring or transforming content.",
	},
];

const props = [
	["state", "One of nine thinking states. Defaults to working."],
	["size", "A number from 12 to 256 CSS pixels."],
	["theme", "auto, dark, or light."],
	["color", "CSS ink color that overrides the theme."],
	["speed", "Animation speed multiplier. Defaults to 1."],
	["paused", "Pauses the current animation until resumed."],
	["static", "Draws one frame without joining the animation clock."],
	["class / style", "Forwarded directly to the canvas."],
];

const usageCode = `<script lang="ts">
  import { ThinkingOrb } from "svelte-thinking-orbs";
<\/script>

<ThinkingOrb state="listening" size={48} />`;
</script>

<main class="mx-auto max-w-4xl px-6 sm:px-8">
	<section class="pb-10 pt-16 text-center sm:pt-20">
		<div class="hero-orb mx-auto w-fit" aria-hidden="true">
			<ThinkingOrb state="composing" size={48} />
		</div>
		<div class="hero-copy">
			<h1 class="mt-8 text-3xl font-medium leading-none tracking-tight sm:text-4xl">Svelte thinking orbs</h1>
			<p class="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
				Dotted thought-orb indicators for AI and agent UIs, tuned for Svelte 5.
			</p>
			<a
				class="mt-6 inline-flex items-center gap-2 text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
				href="https://github.com/alexisgvrcia/svelte-thinking-orbs"
				target="_blank"
				rel="noreferrer"
			>
				<svg class="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.1 1.2a10.7 10.7 0 0 1 5.7 0C14.6 5.3 15.6 5.6 15.6 5.6c.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.4.4.8 1.1.8 2.1v2.8c0 .4.2.7.8.6A11.4 11.4 0 0 0 12 .8Z" />
				</svg>
				GitHub
			</a>
		</div>
	</section>

	<section class="landing-section landing-install pb-10" aria-labelledby="install-title">
		<div class="mb-6">
			<h2 id="install-title" class="text-xl font-medium tracking-tight sm:text-2xl">Installation</h2>
			<p class="mt-2 text-sm text-muted">Add the component with your package manager.</p>
		</div>
		<PackageInstall />
	</section>

	<section class="landing-section landing-usage py-10" aria-labelledby="usage-title">
		<div class="mb-6 flex items-end justify-between gap-4">
			<div>
				<h2 id="usage-title" class="text-xl font-medium tracking-tight sm:text-2xl">Use a thinking orb</h2>
				<p class="mt-2 text-sm text-muted">Import the Svelte 5 canvas component and place it in your interface.</p>
			</div>
			<CopyButton text={llmDocumentation} label="Copy documentation for LLMs" visibleLabel="Copy for LLMs" />
		</div>
		<CodeSnippet code={usageCode} label="Usage example" />
	</section>

	<section class="landing-section landing-examples py-10" aria-labelledby="examples-title">
		<div class="mb-6 max-w-xl">
			<h2 id="examples-title" class="text-xl font-medium tracking-tight sm:text-2xl">AI and agent UI states</h2>
			<p class="mt-2 text-sm leading-6 text-muted">Nine tuned states communicate what an AI assistant or agent is doing.</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each states as item}
				<OrbExample state={item.value} label={item.label} description={item.description} />
			{/each}
		</div>
	</section>

	<section class="landing-section landing-playground py-10" aria-labelledby="playground-title">
		<div class="mb-6 max-w-xl">
			<h2 id="playground-title" class="text-xl font-medium tracking-tight sm:text-2xl">Playground</h2>
			<p class="mt-2 text-sm leading-6 text-muted">Preview each AI UI state, adjust its motion, and copy the component code.</p>
		</div>
		<Playground {states} />
	</section>

	<section class="landing-section landing-reference py-10" aria-labelledby="reference-title">
		<div class="mb-10 max-w-xl">
			<h2 id="reference-title" class="text-xl font-medium tracking-tight sm:text-2xl">Documentation</h2>
			<p class="mt-2 text-sm leading-6 text-muted">Reference for ThinkingOrb props, states, and configuration.</p>
		</div>

		<div class="grid gap-16 lg:grid-cols-2">
			<div>
				<h3 class="mb-4 text-base font-medium">Props</h3>
				<dl class="space-y-6">
					{#each props as prop}
						<div class="grid gap-2 sm:grid-cols-3">
							<dt><code class="font-mono text-sm text-neutral-200">{prop[0]}</code></dt>
							<dd class="m-0 text-sm leading-6 text-muted sm:col-span-2">{prop[1]}</dd>
						</div>
					{/each}
				</dl>
			</div>

			<div>
				<h3 class="mb-4 text-base font-medium">States</h3>
				<ul class="m-0 list-none space-y-6 p-0">
					{#each states as item}
						<li class="flex items-start gap-4">
							<span class="mt-1" aria-hidden="true"><ThinkingOrb state={item.value} size={20} /></span>
							<div>
								<code class="font-mono text-sm text-neutral-200">{item.value}</code>
								<p class="mt-1 text-sm leading-6 text-muted">{item.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>
</main>

<SiteFooter />
