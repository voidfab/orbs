<script lang="ts">
import { highlight } from "sugar-high";
import CopyButton from "./copy-button.svelte";

let { code, label = "Code example" }: { code: string; label?: string } =
	$props();
let highlighted = $derived(highlight(code));
</script>

<div class="relative overflow-hidden rounded-3xl bg-card">
	<pre class="m-0 overflow-x-auto p-5 pr-16 font-mono text-sm leading-6" aria-label={label}><code>{@html highlighted}</code></pre>
	<div class="absolute right-3 top-3">
		<CopyButton text={code} label={`Copy ${label.toLowerCase()}`} />
	</div>
</div>
