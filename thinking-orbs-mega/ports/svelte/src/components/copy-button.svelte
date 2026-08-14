<script lang="ts">
import { onDestroy } from "svelte";

let {
	text,
	label = "Copy code",
	visibleLabel,
}: { text: string; label?: string; visibleLabel?: string } = $props();
let copied = $state(false);
let message = $state("");
let timer: ReturnType<typeof setTimeout>;

async function copy() {
	clearTimeout(timer);
	try {
		await navigator.clipboard.writeText(text);
		copied = true;
		message = "Copied to clipboard";
		timer = setTimeout(() => {
			copied = false;
			message = "";
		}, 1400);
	} catch {
		message = "Copy failed";
	}
}

onDestroy(() => clearTimeout(timer));
</script>

<button
	class="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-muted transition-colors hover:bg-neutral-800 hover:text-foreground active:scale-96"
	class:w-10={!visibleLabel}
	class:px-3={visibleLabel}
	type="button"
	data-state={copied ? "b" : "a"}
	onclick={copy}
	aria-label={copied ? "Copied" : label}
>
	<span class="grid" aria-hidden="true">
		<span class="t-icon" data-icon="a">
			<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
				<rect x="8" y="8" width="11" height="11" rx="2"></rect>
				<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
			</svg>
		</span>
		<span class="t-icon" data-icon="b">
			<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m5 12 4 4L19 6"></path>
			</svg>
		</span>
	</span>
	{#if visibleLabel}<span class="text-xs">{copied ? "Copied" : visibleLabel}</span>{/if}
</button>

<span class="sr-only" aria-live="polite">{message}</span>
