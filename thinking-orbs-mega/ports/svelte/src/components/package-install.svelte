<script lang="ts">
import CopyButton from "./copy-button.svelte";

const commands = {
	pnpm: "pnpm add svelte-thinking-orbs",
	npm: "npm install svelte-thinking-orbs",
	yarn: "yarn add svelte-thinking-orbs",
	bun: "bun add svelte-thinking-orbs",
};
type Manager = keyof typeof commands;
const managers = Object.keys(commands) as Manager[];

let manager = $state<Manager>("pnpm");
</script>

<div class="overflow-hidden rounded-3xl bg-card">
	<div class="relative grid grid-cols-4 p-2" role="tablist" aria-label="Package manager">
		<span
			class="absolute inset-y-2 left-2 w-[calc((100%-1rem)/4)] rounded-lg bg-neutral-800 [transition:transform_220ms_var(--ease-out)] will-change-transform motion-reduce:[transition:none]"
			style={`transform: translateX(${managers.indexOf(manager) * 100}%);`}
			aria-hidden="true"
		></span>
		{#each managers as item}
			<button
				class="relative z-10 h-10 min-w-0 rounded-lg px-2 text-xs transition-colors active:scale-96 sm:px-4 sm:text-sm"
				class:text-foreground={manager === item}
				class:text-muted={manager !== item}
				type="button"
				role="tab"
				aria-selected={manager === item}
				aria-controls="install-command"
				onclick={() => (manager = item as Manager)}
			>
				{item}
			</button>
		{/each}
	</div>
	<div class="flex min-h-20 items-center gap-3 px-5">
		<span class="font-mono text-muted" aria-hidden="true">$</span>
		<code id="install-command" class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs sm:text-sm">{commands[manager]}</code>
		<CopyButton text={commands[manager]} label="Copy installation command" />
	</div>
</div>
