<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { prefersReducedMotion } from '$lib/motion.svelte';

	/**
	 * A cursor that follows a position, with a name pill attached.
	 *
	 * Used for live collaborators in a shared note, and decoratively on the
	 * marketing page. Positions are absolute pixels within the parent's
	 * positioning context — the caller is responsible for converting whatever
	 * coordinate space it broadcasts into pixels.
	 */
	type Props = {
		x: number;
		y: number;
		name: string;
		color: string;
	};

	let { x, y, name, color }: Props = $props();

	/**
	 * Spring rather than a CSS transition.
	 *
	 * A linear tween makes a remote cursor read as a teleporting sprite; the
	 * settle is what makes it feel like someone else's hand. Tuned soft enough to
	 * smooth network jitter without lagging noticeably behind the real cursor.
	 */
	const position = new Spring({ x: 0, y: 0 }, { stiffness: 0.09, damping: 0.32 });
	let placed = false;

	$effect(() => {
		const next = { x, y };
		// The first position is set instantly: springing from {0,0} would fly the
		// cursor in from the top-left corner when a peer first appears. Under
		// reduced motion every update is instant — the pointer must still be
		// *correct*, it just doesn't glide.
		if (!placed || prefersReducedMotion.current) {
			placed = true;
			position.set(next, { instant: true });
		} else {
			position.target = next;
		}
	});
</script>

<div
	class="pointer-events-none absolute top-0 left-0 z-20 will-change-transform"
	style="transform: translate3d({position.current.x}px, {position.current.y}px, 0)"
	aria-hidden="true"
>
	<svg width="16" height="20" viewBox="0 0 16 20" fill="none" class="drop-shadow-sm">
		<path
			d="M1.5 1.5L13 9.2L7.4 10.6L4.9 16.2L1.5 1.5Z"
			fill={color}
			stroke="white"
			stroke-width="1.4"
			stroke-linejoin="round"
		/>
	</svg>
	<span
		class="absolute top-[18px] left-[14px] rounded-full px-2 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap text-white shadow-sm"
		style="background: {color}"
	>
		{name}
	</span>
</div>
