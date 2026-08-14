<script lang="ts">
	/**
	 * Documentation prose with `backticked` fragments rendered as code.
	 *
	 * These pages are about Markdown syntax, so the copy is full of short literal
	 * fragments — `## `, `[[`, `:::note`. Writing them as plain text loses the
	 * distinction between the syntax and the sentence around it, and the obvious
	 * alternative, running the copy through a Markdown renderer, would mean
	 * `{@html}` and a parser on a page that needs neither.
	 *
	 * Splitting on backticks and rendering the pieces is the whole implementation.
	 * Nothing is ever interpreted as HTML, so a stray `<` in a snippet stays a
	 * literal `<`.
	 */
	type Props = { text: string };
	let { text }: Props = $props();

	// Odd indices are the fragments between backticks; even ones are prose.
	const parts = $derived(text.split('`'));
</script>

{#each parts as part, i (i)}{#if i % 2 === 1}<code
			class="rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{part}</code
		>{:else}{part}{/if}{/each}
