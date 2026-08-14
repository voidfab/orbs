<script lang="ts">
import { type OrbState, ThinkingOrb } from "$lib/index.js";
import CodeSnippet from "./code-snippet.svelte";
import Select from "./select.svelte";
import Slider from "./slider.svelte";
import Switch from "./switch.svelte";

let {
	states,
}: {
	states: Array<{ value: OrbState; label: string; description: string }>;
} = $props();

let selectedState = $state<OrbState>("composing");
let selectedSize = $state(64);
let selectedSpeed = $state(1);
let isStatic = $state(false);
let useCustomColor = $state(false);
let selectedColor = $state("#7dd3fc");
let playgroundCode =
	$derived(`import { ThinkingOrb } from "svelte-thinking-orbs";

<ThinkingOrb state="${selectedState}" size={${selectedSize}} speed={${selectedSpeed.toFixed(2)}}${isStatic ? " static" : ""}${useCustomColor ? ` color="${selectedColor}"` : ""} />`);
</script>

<div class="grid gap-4 lg:grid-cols-2">
	<div class="rounded-3xl bg-card p-5 sm:p-6">
		<Select bind:value={selectedState} label="State" options={states} />

		<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
			<Slider bind:value={selectedSize} min={12} max={256} step={1} label="Size" suffix="px" fractionDigits={0} />
			<Slider bind:value={selectedSpeed} />
		</div>

		<div class="mt-4 grid gap-3 pt-4 sm:grid-cols-2">
			<Switch bind:checked={isStatic} label="Static frame" />
			<div class="flex items-center gap-2">
				{#if useCustomColor}
					<input
						class="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
						type="color"
						value={selectedColor}
						oninput={(event) => (selectedColor = event.currentTarget.value)}
						aria-label="Orb color"
					/>
				{:else}
					<span class="size-8 rounded-lg bg-neutral-900 opacity-30" aria-hidden="true"></span>
				{/if}
				<Switch bind:checked={useCustomColor} label="Custom color" />
			</div>
		</div>
	</div>

	<div class="grid min-h-80 place-items-center rounded-3xl bg-card p-6">
		<ThinkingOrb
			state={selectedState}
			size={selectedSize}
			speed={selectedSpeed}
			static={isStatic}
			color={useCustomColor ? selectedColor : undefined}
			aria-label={`${states.find((item) => item.value === selectedState)?.label} orb preview`}
		/>
	</div>
</div>

<div class="mt-4">
	<CodeSnippet code={playgroundCode} label="Playground code" />
</div>
