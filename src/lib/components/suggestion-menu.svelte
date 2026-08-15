<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The floating list that follows the caret.
	 *
	 * Shared by the `/` block picker and the `[[` link picker. Only the rows
	 * differ between them — the block picker groups by category and shows icons,
	 * the link picker is a flat list of note titles — so the caller renders those
	 * and this owns everything they must agree on: staying on screen, flipping
	 * above the caret near the bottom of a note, and keeping the highlighted row
	 * scrolled into view.
	 *
	 * Two pickers drifting apart on any of that is exactly the bug worth
	 * preventing: they appear in the same place, for the same reason, and should
	 * feel identical.
	 */
	type Props = {
		/** Caret position in viewport coordinates. `null` hides the menu. */
		rect: { left: number; top: number; bottom: number } | null;
		/** Which row is highlighted, so it can be scrolled into view. */
		selected: number;
		label: string;
		width?: number;
		maxHeight?: number;
		children: Snippet;
	};
	let { rect, selected, label, width = 264, maxHeight = 320, children }: Props = $props();

	let menu = $state<HTMLDivElement | null>(null);

	/**
	 * Keep the menu on screen.
	 *
	 * Flipped above the caret when there is not enough room below — near the
	 * bottom of a note, which is exactly where a new block usually gets typed.
	 */
	const position = $derived.by(() => {
		if (!rect) return { left: 0, top: 0 as number | undefined, bottom: undefined };
		const gap = 6;
		const below = window.innerHeight - rect.bottom;
		const flip = below < maxHeight && rect.top > below;
		return {
			left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
			top: flip ? undefined : rect.bottom + gap,
			bottom: flip ? window.innerHeight - rect.top + gap : undefined
		};
	});

	// Keep the highlighted item in view when arrowing past the fold.
	$effect(() => {
		void selected;
		menu?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
	});
</script>

{#if rect}
	<div
		bind:this={menu}
		class="fixed z-50 scroll-slim overflow-y-auto glass-overlay py-1"
		style="
			width: {width}px;
			max-height: {maxHeight}px;
			left: {position.left}px;
			{position.top !== undefined ? `top: ${position.top}px;` : ''}
			{position.bottom !== undefined ? `bottom: ${position.bottom}px;` : ''}
		"
		role="listbox"
		aria-label={label}
	>
		{@render children()}
	</div>
{/if}
