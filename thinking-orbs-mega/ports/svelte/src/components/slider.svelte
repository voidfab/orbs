<script lang="ts">
let {
	value = $bindable(),
	min = 0.25,
	max = 2,
	step = 0.05,
	label = "Speed",
	suffix = "×",
	fractionDigits = 2,
}: {
	value: number;
	min?: number;
	max?: number;
	step?: number;
	label?: string;
	suffix?: string;
	fractionDigits?: number;
} = $props();

let progress = $derived(((value - min) / (max - min)) * 100);
</script>

<label class="block min-w-0">
	<span class="mb-2 block text-xs text-muted">{label}</span>
	<div class="relative flex h-9 items-center overflow-hidden rounded-lg bg-neutral-900" style={`--position:${progress}%`}>
		<output class="pointer-events-none absolute z-10 grid h-full w-16 place-items-center rounded-lg border border-neutral-700 bg-neutral-700 text-sm tracking-tight text-neutral-200 tabular-nums [left:clamp(0px,calc(var(--position)-2rem),calc(100%-4rem))]">
			{value.toFixed(fractionDigits)}{suffix}
		</output>
		<input
			class="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:w-16 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:w-16 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
			type="range"
			{min}
			{max}
			{step}
			bind:value
			aria-label={label}
		/>
	</div>
</label>
