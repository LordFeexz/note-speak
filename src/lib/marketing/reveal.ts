import { prefersReducedMotion } from '$lib/motion.svelte';

type RevealOptions = {
	/** Stagger, in ms. */
	delay?: number;
	/** How much of the element must be visible before it fires. */
	threshold?: number;
};

/**
 * Reveal an element once it scrolls into view.
 *
 * The hidden state lives on `[data-reveal]`, and *this action* adds that
 * attribute. That ordering matters: if the JS never runs — no-JS, a failed
 * chunk, a crawler — the attribute is absent and the content is simply visible.
 * Hiding in CSS and revealing in JS gets that backwards and yields a blank page.
 */
export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	// Under reduced motion the content appears immediately, no observer at all.
	if (prefersReducedMotion.current) return;

	node.dataset.reveal = '';
	if (options.delay) node.style.setProperty('--reveal-delay', `${options.delay}ms`);

	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			node.dataset.revealed = 'true';
			// Once only: re-triggering on scroll-up makes a page feel restless.
			observer.disconnect();
		},
		{ threshold: options.threshold ?? 0.15, rootMargin: '0px 0px -8% 0px' }
	);

	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}
