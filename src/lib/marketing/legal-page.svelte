<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Shared shell for /terms and /privacy: glass card, prose, effective date. */
	type Props = { title: string; updated: string; summary: string; children: Snippet };
	let { title, updated, summary, children }: Props = $props();
</script>

<article class="px-6 py-16">
	<div class="mx-auto max-w-2xl">
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
		<p class="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
		<p class="mt-6 text-lg text-pretty text-muted-foreground">{summary}</p>

		<div
			class="prose mt-10 max-w-none glass-panel p-6 prose-neutral sm:p-8 dark:prose-invert
				prose-headings:font-semibold prose-h2:mt-8 prose-h2:text-xl prose-h3:text-base
				prose-p:text-pretty prose-a:text-note-accent"
		>
			{@render children()}
		</div>
	</div>
</article>
