<script lang="ts">
	import { prefersReducedMotion } from '$lib/motion.svelte';

	/**
	 * Headline that resolves word by word.
	 *
	 * The full text is always in the DOM as real words — only opacity and blur
	 * are animated — so it is selectable, readable by a screen reader, and
	 * indexable regardless of whether the animation runs.
	 */
	type Props = {
		text: string;
		/** Per-word stagger, ms. */
		step?: number;
		class?: string;
	};

	let { text, step = 70, class: className = '' }: Props = $props();

	const words = $derived(text.split(' '));
	let started = $state(false);

	function start(node: HTMLElement) {
		if (prefersReducedMotion.current) {
			started = true;
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				started = true;
				observer.disconnect();
			},
			{ threshold: 0.2 }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<!--
	The trailing space lives *inside* each word as a non-breaking space. Whitespace
	between two `inline-block` boxes collapses to nothing, which ran the headline
	together as one word. Lines still wrap, because the browser breaks between the
	boxes rather than inside them.
-->
<span use:start class={className}>
	{#each words as word, index (index)}<span
			class="inline-block transition-[opacity,filter] duration-500 ease-out"
			style="transition-delay: {started ? index * step : 0}ms; opacity: {started
				? 1
				: 0}; filter: blur({started ? 0 : 6}px)">{word}{index < words.length - 1 ? ' ' : ''}</span
		>{/each}
</span>
