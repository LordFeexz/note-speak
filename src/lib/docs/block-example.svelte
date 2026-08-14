<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { BlockDef } from '$lib/editor/blocks';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';
	import { blockName, type BlockDoc } from './blocks-content';
	import Prose from './prose.svelte';

	/**
	 * One block: what to type, and what you get.
	 *
	 * Takes the real `BlockDef` rather than re-declaring the name and icon, so the
	 * heading here is literally what the slash menu shows.
	 */
	type Props = { block: BlockDef; doc: BlockDoc; lang: Lang; preview: Snippet };
	let { block, doc, lang, preview }: Props = $props();

	const DICT: Dict<{ markdown: string; inEditor: string }> = {
		en: { markdown: 'Markdown', inEditor: 'In the editor' },
		id: { markdown: 'Markdown', inEditor: 'Di editor' }
	};
	const t = $derived(DICT[lang]);
</script>

<div
	id="block-{block.id}"
	data-block-example={block.id}
	class="scroll-mt-28 overflow-hidden glass-panel"
>
	<div class="flex items-center gap-2.5 border-b border-[var(--glass-border)] px-5 py-3">
		<span class="grid size-7 place-items-center rounded-lg bg-note-accent/12 text-note-accent">
			<HugeiconsIcon icon={block.icon} strokeWidth={2} class="size-4" />
		</span>
		<h3 class="font-semibold text-foreground">{blockName(block.id, lang)}</h3>
		<code class="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
			{doc.insert}
		</code>
	</div>

	<p class="px-5 pt-4 text-sm text-pretty text-muted-foreground">
		<Prose text={doc.description[lang]} />
	</p>

	<!--
		`min-w-0` on both children, not just the `minmax(0, …)` tracks: a grid item
		defaults to `min-width: auto`, so a long Markdown line or a wide table
		preview stretches its column past the card — which, because the card clips,
		means the content is simply cut off on a phone rather than scrolling.
	-->
	<div class="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
		<div class="min-w-0">
			<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{t.markdown}
			</span>
			<pre
				class="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-foreground"><code
					>{doc.markdown}</code
				></pre>
		</div>
		<div class="min-w-0">
			<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{t.inEditor}
			</span>
			<!--
				`inert`: the preview is a picture of a block, not a control. Without it
				the example headings would join the page outline, and its checkboxes and
				fake download link would sit in the tab order promising to do something.
				The Markdown beside it carries the same meaning for screen readers.
			-->
			<div
				data-preview
				inert
				class="mt-2 overflow-x-auto rounded-md border glass-hairline bg-background/40 p-3"
			>
				<div class="note-prose not-prose text-foreground">
					{@render preview()}
				</div>
			</div>
		</div>
	</div>

	{#if doc.caveat}
		<p class="border-t border-[var(--glass-border)] px-5 py-3 text-xs text-muted-foreground">
			<Prose text={doc.caveat[lang]} />
		</p>
	{/if}
</div>
