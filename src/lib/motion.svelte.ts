import { MediaQuery } from 'svelte/reactivity';

const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

/** Collapses any animation duration to 0 when the user asks for reduced motion. */
export function dur(ms: number): number {
	return reducedMotion.current ? 0 : ms;
}

/** True on viewports below Tailwind's `md` breakpoint — drives the one-pane-at-a-time layout. */
export const isCompact = new MediaQuery('max-width: 767px');

/** Reactive `prefers-reduced-motion`, for effects that must be skipped outright. */
export const prefersReducedMotion = reducedMotion;

/**
 * True where a mouse actually hovers.
 *
 * Collaborator pointers mirror a hovering cursor, so on touch there is nothing
 * to mirror and the layer should not render at all.
 */
export const hasFinePointer = new MediaQuery('(hover: hover) and (pointer: fine)');
