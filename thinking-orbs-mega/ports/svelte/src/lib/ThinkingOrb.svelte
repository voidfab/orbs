<script lang="ts">
	import { CONTOUR_DRAWS, getLut, MODE_FRAMES, paintFrame, resolvePreset, setContourTint } from 'thinking-orbs';
	import { subscribeFrame } from './animation.js';
	import { watchReducedMotion, watchResolvedDark } from './theme.js';
	import type { ThinkingOrbProps } from './types.js';

	const LABELS = {
		working: 'Working…',
		searching: 'Searching…',
		solving: 'Solving…',
		listening: 'Listening…',
		connecting: 'Connecting…',
		weaving: 'Weaving…',
		composing: 'Composing…',
		breathing: 'Thinking…',
		shaping: 'Shaping…'
	} as const;

	let {
		state: orbState = 'working',
		size = 64,
		theme = 'auto',
		color,
		variant = 'classic',
		speed = 1,
		paused = false,
		static: isStatic = false,
		style,
		'aria-label': ariaLabel,
		...rest
	}: ThinkingOrbProps = $props();

	let canvas: HTMLCanvasElement;
	let dark = $state(true);
	let reduced = $state(false);

	function clamp(n: number) {
		return Math.round(Math.max(12, Math.min(256, n)));
	}

	function sample(ctx: CanvasRenderingContext2D, value: string | undefined) {
		if (!value) {
			setContourTint(null);
			return undefined;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = value;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		setContourTint([r, g, b]);
		return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
	}

	$effect(() => watchResolvedDark(theme, canvas, (value) => (dark = value)));
	$effect(() => watchReducedMotion((value) => (reduced = value)));

	$effect(() => {
		const target = canvas;
		const currentState = orbState;
		const currentSize = clamp(size);
		const currentDark = dark;
		const currentColor = color;
		const currentVariant = variant;
		const currentSpeed = speed;
		const isPaused = paused;
		const isStaticFrame = isStatic;
		const reduceMotion = reduced;
		if (!target) return;

		const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
		target.width = Math.round(currentSize * dpr);
		target.height = Math.round(currentSize * dpr);
		const context = target.getContext('2d');
		if (!context) return;

		const { mode, speed: baseSpeed, opts } = resolvePreset(currentState, currentSize);
		const frameFn = MODE_FRAMES[mode];
		const contour = CONTOUR_DRAWS[mode];
		const effectiveSpeed = baseSpeed * currentSpeed;

		const frame = (time: number) => {
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			const tint = sample(context, currentColor);
			context.clearRect(0, 0, currentSize, currentSize);
			const lut = getLut(tint ?? 'mono', currentDark);
			if (currentVariant === 'contour' && contour) {
				contour(context, currentSize, time, currentDark, opts);
				return;
			}
			paintFrame(context, frameFn(currentSize, time, opts), currentDark, lut);
		};

		if (reduceMotion || isStaticFrame) {
			frame(0.6);
			return;
		}
		if (effectiveSpeed === 0) {
			frame(0);
			return;
		}

		let unsubscribe: (() => void) | null = null;
		const start = () => {
			if (unsubscribe || isPaused) return;
			unsubscribe = subscribeFrame((time) => frame(time * effectiveSpeed));
		};
		const stop = () => {
			unsubscribe?.();
			unsubscribe = null;
		};

		frame((performance.now() / 1000) * effectiveSpeed);
		let visible = true;
		const observer =
			typeof IntersectionObserver !== 'undefined'
				? new IntersectionObserver(([entry]) => {
						visible = entry.isIntersecting;
						if (visible && document.visibilityState !== 'hidden') start();
						else stop();
					})
				: null;
		observer?.observe(target);
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') stop();
			else if (visible) start();
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		if (!observer) start();

		return () => {
			stop();
			observer?.disconnect();
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<canvas
	bind:this={canvas}
	role="img"
	aria-label={ariaLabel ?? LABELS[orbState]}
	style={`width:${clamp(size)}px;height:${clamp(size)}px;display:block;${style ?? ''}`}
	{...rest}
></canvas>
