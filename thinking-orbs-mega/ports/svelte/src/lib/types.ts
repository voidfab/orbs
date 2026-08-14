import type { HTMLCanvasAttributes } from "svelte/elements";

export type OrbState =
	| "working"
	| "searching"
	| "solving"
	| "listening"
	| "connecting"
	| "weaving"
	| "composing"
	| "breathing"
	| "shaping";

/** Orb size in CSS pixels. Runtime values are clamped to 12–256. */
export type OrbSize = number;

export type OrbTheme = "auto" | "dark" | "light";

export interface ThinkingOrbProps extends Omit<HTMLCanvasAttributes, "style"> {
	/** Which animation to show. @default "working" */
	state?: OrbState;
	/** Size in CSS px, clamped to 12–256. The 20 and 64px anchors are hand-tuned. @default 64 */
	size?: OrbSize;
	/** Theme mode; auto detects from the host project. @default "auto" */
	theme?: OrbTheme;
	/** CSS ink color. Overrides the color resolved from `theme`. */
	color?: string;
	/** Line-cage treatment of the official nine. */
	variant?: 'classic' | 'contour';
	/** Animation speed multiplier on top of the preset speed. @default 1 */
	speed?: number;
	/** Freeze the animation on the current frame. @default false */
	paused?: boolean;
	/** Render one representative frame without subscribing to the animation clock. @default false */
	static?: boolean;
	/** Native canvas class attribute. */
	class?: string | null;
	/** Native canvas inline styles, appended after the component's dimensions. */
	style?: HTMLCanvasAttributes["style"];
}
