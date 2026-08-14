<script lang="ts">
import type { OrbState } from "$lib/index.js";

let {
	value = $bindable(),
	label,
	options,
}: {
	value: OrbState;
	label: string;
	options: Array<{ value: OrbState; label: string }>;
} = $props();

let root: HTMLDivElement;
let open = $state(false);
let activeIndex = $state(0);
let selected = $derived(options.findIndex((option) => option.value === value));

function show() {
	activeIndex = Math.max(0, selected);
	open = true;
}

function choose(index: number) {
	value = options[index].value;
	open = false;
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		open = false;
		return;
	}

	if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		event.preventDefault();
		if (!open) show();
		else
			activeIndex =
				(activeIndex + (event.key === "ArrowDown" ? 1 : options.length - 1)) %
				options.length;
		return;
	}

	if (open && event.key === "Enter") {
		event.preventDefault();
		choose(activeIndex);
	}
}

$effect(() => {
	if (!open) return;
	const close = (event: PointerEvent) => {
		if (!root.contains(event.target as Node)) open = false;
	};
	document.addEventListener("pointerdown", close);
	return () => document.removeEventListener("pointerdown", close);
});
</script>

<div class="relative min-w-0" bind:this={root}>
	<span class="mb-1.5 block text-xs text-muted">{label}</span>
	<button
		class="flex h-10 w-full items-center justify-between rounded-lg bg-neutral-900 px-3 text-left text-xs transition-colors"
		type="button"
		role="combobox"
		aria-label={label}
		aria-controls="orb-state-options"
		aria-expanded={open}
		aria-activedescendant={open ? `orb-state-option-${activeIndex}` : undefined}
		onclick={() => (open ? (open = false) : show())}
		onkeydown={onKeydown}
	>
		<span>{options[selected]?.label}</span>
		<svg
			class="size-3.5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none"
			class:rotate-180={open}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			aria-hidden="true"
		>
			<path d="m6 9 6 6 6-6"></path>
		</svg>
	</button>

	{#if open}
		<ul
			id="orb-state-options"
			class="absolute z-20 mt-2 w-full rounded-2xl bg-neutral-900 p-1 shadow-[0_1px_0_#ffffff20_inset,0_24px_48px_#00000080]"
			role="listbox"
			aria-label={label}
		>
			{#each options as option, index}
				<li>
					<button
						id={`orb-state-option-${index}`}
						class="flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-foreground"
						class:bg-neutral-800={index === activeIndex || option.value === value}
						class:text-foreground={index === activeIndex || option.value === value}
						type="button"
						role="option"
						aria-selected={option.value === value}
						onpointermove={() => (activeIndex = index)}
						onclick={() => choose(index)}
					>
						{option.label}
						{#if option.value === value}
							<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<path d="m5 12 4 4L19 6"></path>
							</svg>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
