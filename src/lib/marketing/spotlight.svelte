<script lang="ts">
	import { hasFinePointer, prefersReducedMotion } from '$lib/motion.svelte';

	/**
	 * A soft light that follows the cursor across a section.
	 *
	 * Purely decorative, so it is skipped entirely on touch (no cursor to follow)
	 * and under reduced motion. Coordinates go into CSS custom properties and are
	 * written at most once per frame.
	 */
	type Props = { class?: string; size?: number };
	let { class: className = '', size = 480 }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let visible = $state(false);
	let x = $state(0);
	let y = $state(0);

	const active = $derived(hasFinePointer.current && !prefersReducedMotion.current);

	$effect(() => {
		if (!active || !host) return;
		const parent = host.parentElement;
		if (!parent) return;

		let frame = 0;
		const move = (event: PointerEvent) => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				const box = parent.getBoundingClientRect();
				x = event.clientX - box.left;
				y = event.clientY - box.top;
				visible = true;
			});
		};
		const leave = () => (visible = false);

		parent.addEventListener('pointermove', move);
		parent.addEventListener('pointerleave', leave);
		return () => {
			cancelAnimationFrame(frame);
			parent.removeEventListener('pointermove', move);
			parent.removeEventListener('pointerleave', leave);
		};
	});
</script>

<div
	bind:this={host}
	class="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 {className}"
	style="opacity: {active && visible ? 1 : 0}"
	aria-hidden="true"
>
	<div
		class="absolute rounded-full will-change-transform"
		style="
			width: {size}px; height: {size}px;
			transform: translate3d({x - size / 2}px, {y - size / 2}px, 0);
			background: radial-gradient(circle, var(--note-accent) 0%, transparent 68%);
			opacity: 0.22;
			filter: blur(28px);
		"
	></div>
</div>
