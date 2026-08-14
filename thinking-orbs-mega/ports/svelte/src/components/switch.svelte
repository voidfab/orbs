<script lang="ts">
let {
	checked = $bindable(false),
	label,
	disabled = false,
}: {
	checked?: boolean;
	label: string;
	disabled?: boolean;
} = $props();
</script>

<button
	class="flex h-11 w-full items-center justify-between gap-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
	type="button"
	role="switch"
	aria-checked={checked}
	{disabled}
	onclick={() => (checked = !checked)}
>
	<span>{label}</span>
	<span class="flex items-center gap-3">
		<span class="font-mono text-xs" class:text-foreground={checked} class:text-muted={!checked}>{checked ? "On" : "Off"}</span>
		<span
			class="flex h-6 w-11 shrink-0 items-center rounded-full bg-neutral-800 p-1 transition-colors"
			class:bg-foreground={checked}
			aria-hidden="true"
		>
			<span
				class="size-4 rounded-full bg-neutral-500 transition-transform"
				class:translate-x-5={checked}
				class:bg-background={checked}
			></span>
		</span>
	</span>
</button>
