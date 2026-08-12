<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { hasFinePointer, prefersReducedMotion } from '$lib/motion.svelte';

	/**
	 * Card that tilts toward the cursor.
	 *
	 * Skipped on touch and under reduced motion, where it renders as a plain
	 * card — the tilt is decoration, never the thing carrying meaning.
	 */
	type Props = { class?: string; max?: number; children: Snippet };
	let { class: className = '', max = 7, children }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	const tilt = new Spring({ x: 0, y: 0 }, { stiffness: 0.12, damping: 0.5 });

	const active = $derived(hasFinePointer.current && !prefersReducedMotion.current);

	// Listeners are attached imperatively rather than as `onpointermove`
	// attributes: this is decoration on a non-interactive container, and marking
	// it up as interactive would promise keyboard users something that isn't there.
	$effect(() => {
		if (!active || !host) return;
		const node = host;

		const onMove = (event: PointerEvent) => {
			const box = node.getBoundingClientRect();
			// -1..1 from centre, so the card leans toward the cursor.
			const px = (event.clientX - box.left) / box.width - 0.5;
			const py = (event.clientY - box.top) / box.height - 0.5;
			tilt.target = { x: -py * max * 2, y: px * max * 2 };
		};
		const onLeave = () => (tilt.target = { x: 0, y: 0 });

		node.addEventListener('pointermove', onMove);
		node.addEventListener('pointerleave', onLeave);
		return () => {
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
		};
	});
</script>

<div
	bind:this={host}
	class="glass-panel will-change-transform [transform-style:preserve-3d] {className}"
	style={active
		? `transform: perspective(900px) rotateX(${tilt.current.x}deg) rotateY(${tilt.current.y}deg)`
		: undefined}
>
	{@render children()}
</div>
