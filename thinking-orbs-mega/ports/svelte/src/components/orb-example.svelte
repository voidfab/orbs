<script lang="ts">
import { type OrbState, ThinkingOrb } from "$lib/index.js";

let {
	state,
	label,
	description,
}: { state: OrbState; label: string; description: string } = $props();
let shimmerText = $derived(`${label}...`);
</script>

	<article class="flex min-h-56 flex-col justify-center rounded-3xl bg-card p-8">
	<div>
		<h3 class="font-mono text-xs font-normal text-muted"><code>{state}</code></h3>
		<p class="mt-2 text-sm text-muted">{description}</p>
	</div>
	<div class="mt-6 flex h-14 items-center gap-4 rounded-full bg-neutral-900 px-5">
		<ThinkingOrb {state} size={20} aria-hidden="true" />
		<span class="t-shimmer text-base" data-text={shimmerText}>{shimmerText}</span>
	</div>
</article>
