import type { OrbTheme } from "./types.js";

function ancestorTheme(element: Element | null): boolean | null {
	let node = element;
	while (node) {
		const attribute = node.getAttribute("data-theme");
		if (attribute === "dark") return true;
		if (attribute === "light") return false;
		if (node.classList.contains("dark")) return true;
		if (node.classList.contains("light")) return false;
		node = node.parentElement;
	}
	return null;
}

function systemDark(): boolean {
	return (
		typeof matchMedia === "undefined" ||
		matchMedia("(prefers-color-scheme: dark)").matches
	);
}

export function watchResolvedDark(
	theme: OrbTheme,
	host: Element,
	update: (dark: boolean) => void,
): () => void {
	if (theme !== "auto") {
		update(theme === "dark");
		return () => {};
	}

	const resolve = () => update(ancestorTheme(host) ?? systemDark());
	resolve();
	const query =
		typeof matchMedia !== "undefined"
			? matchMedia("(prefers-color-scheme: dark)")
			: null;
	query?.addEventListener("change", resolve);
	const observer =
		typeof MutationObserver !== "undefined"
			? new MutationObserver(resolve)
			: null;
	let ancestor: Element | null = host;
	while (observer && ancestor) {
		observer.observe(ancestor, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		ancestor = ancestor.parentElement;
	}

	return () => {
		query?.removeEventListener("change", resolve);
		observer?.disconnect();
	};
}

export function watchReducedMotion(
	update: (reduced: boolean) => void,
): () => void {
	if (typeof matchMedia === "undefined") return () => {};
	const query = matchMedia("(prefers-reduced-motion: reduce)");
	update(query.matches);
	const onChange = (event: MediaQueryListEvent) => update(event.matches);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}
