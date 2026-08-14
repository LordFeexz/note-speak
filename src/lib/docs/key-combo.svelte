<script lang="ts">
	/**
	 * A keyboard shortcut, rendered statically.
	 *
	 * The shortcuts dialog inside the app reads `navigator.userAgent` and shows
	 * one key. A prerendered page has no user agent, and swapping the glyph after
	 * hydration would flash the wrong key — so the docs print both and say which
	 * is which once, at the top of the table.
	 */
	type Props = { keys: string[] };
	let { keys }: Props = $props();

	const kbd =
		'inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-sans text-xs text-foreground';
</script>

<span class="inline-flex items-center gap-1 align-middle">
	{#each keys as key, i (i)}
		{#if key === 'mod'}
			<kbd class={kbd}>⌘</kbd>
			<span class="text-xs text-muted-foreground">/</span>
			<kbd class={kbd}>Ctrl</kbd>
		{:else}
			<kbd class={kbd}>{key}</kbd>
		{/if}
	{/each}
</span>
