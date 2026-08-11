import { MediaQuery } from 'svelte/reactivity';

const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

/** Collapses any animation duration to 0 when the user asks for reduced motion. */
export function dur(ms: number): number {
	return reducedMotion.current ? 0 : ms;
}

/** True on viewports below Tailwind's `md` breakpoint — drives the one-pane-at-a-time layout. */
export const isCompact = new MediaQuery('max-width: 767px');
