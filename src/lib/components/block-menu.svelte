<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { BlockDef, BlockGroup } from '$lib/editor/blocks';
	import { blockTitle, groupLabel } from '$lib/editor/blocks-i18n';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{ insertBlock: string }> = {
		en: { insertBlock: 'Insert block' },
		id: { insertBlock: 'Sisipkan blok' }
	};
	const t = $derived(DICT[locale.current]);
	import type { SlashState } from '$lib/editor/slash';

	/**
	 * The `/` block picker's menu.
	 *
	 * Grouped under Basic and Advanced headings, unlike a flat picker: with a
	 * dozen entries the split is what makes "change this block" and "insert
	 * something" scannable at a glance.
	 */
	// Named `slash`, never `state`: a binding called `state` shadows the `$state`
	// rune in this module and silently strips reactivity from everything below it.
	type Props = {
		slash: SlashState | null;
		selected: number;
		/** Routed through the controller so Image can prompt for a URL first. */
		onselect: (block: BlockDef) => void;
	};
	let { slash, selected, onselect }: Props = $props();

	let menu = $state<HTMLDivElement | null>(null);

	const groups = $derived.by(() => {
		if (!slash) return [] as { group: BlockGroup; items: { block: BlockDef; index: number }[] }[];
		const out: { group: BlockGroup; items: { block: BlockDef; index: number }[] }[] = [];
		slash.items.forEach((block, index) => {
			let bucket = out.find((entry) => entry.group === block.group);
			if (!bucket) out.push((bucket = { group: block.group, items: [] }));
			bucket.items.push({ block, index });
		});
		return out;
	});

	const MENU_WIDTH = 264;
	const MENU_MAX_HEIGHT = 320;

	/**
	 * Keep the menu on screen.
	 *
	 * Flipped above the caret when there is not enough room below — near the
	 * bottom of a note, which is exactly where a new block usually gets typed.
	 */
	const position = $derived.by(() => {
		if (!slash) return { left: 0, top: 0 };
		const gap = 6;
		const below = window.innerHeight - slash.rect.bottom;
		const flip = below < MENU_MAX_HEIGHT && slash.rect.top > below;
		return {
			left: Math.min(Math.max(8, slash.rect.left), window.innerWidth - MENU_WIDTH - 8),
			top: flip ? undefined : slash.rect.bottom + gap,
			bottom: flip ? window.innerHeight - slash.rect.top + gap : undefined
		};
	});

	// Keep the highlighted item in view when arrowing past the fold.
	$effect(() => {
		void selected;
		menu?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
	});
</script>

{#if slash && slash.items.length}
	<div
		bind:this={menu}
		class="fixed z-50 scroll-slim overflow-y-auto glass-overlay py-1"
		style="
			width: {MENU_WIDTH}px;
			max-height: {MENU_MAX_HEIGHT}px;
			left: {position.left}px;
			{position.top !== undefined ? `top: ${position.top}px;` : ''}
			{position.bottom !== undefined ? `bottom: ${position.bottom}px;` : ''}
		"
		role="listbox"
		aria-label={t.insertBlock}
	>
		{#each groups as group (group.group)}
			<p
				class="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
			>
				{groupLabel(group.group)}
			</p>
			{#each group.items as entry (entry.block.id)}
				<button
					type="button"
					role="option"
					aria-selected={entry.index === selected}
					data-selected={entry.index === selected}
					class="flex min-h-9 w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors {entry.index ===
					selected
						? 'bg-note-accent/15 text-foreground'
						: 'text-muted-foreground hover:bg-muted/60'}"
					onclick={() => onselect(entry.block)}
				>
					<HugeiconsIcon icon={entry.block.icon} strokeWidth={2} class="size-4 shrink-0" />
					{blockTitle(entry.block)}
				</button>
			{/each}
		{/each}
	</div>
{/if}
