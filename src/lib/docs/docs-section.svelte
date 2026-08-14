<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	/**
	 * One `<h2>` section of a documentation page.
	 *
	 * `scroll-mt-28` is not optional: the marketing header is `sticky top-0`, so
	 * without it every `#anchor` jump lands with the heading hidden underneath the
	 * navigation bar.
	 *
	 * Children are spaced by `flex flex-col gap-4` rather than by descendant
	 * selectors on `p`/`ul`, so a `.note-prose` block preview dropped inside keeps
	 * exactly the typography the editor gives it.
	 */
	type Props = {
		id: string;
		title: Dict<string>;
		lang: Lang;
		lede?: Dict<string>;
		children: Snippet;
	};
	let { id, title, lang, lede, children }: Props = $props();
</script>

<section {id} class="mt-14 scroll-mt-28 first:mt-0">
	<h2 class="group text-xl font-semibold tracking-tight">
		{title[lang]}
		<a
			href="#{id}"
			class="ml-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
			aria-label={title[lang]}>#</a
		>
	</h2>
	{#if lede}
		<p class="mt-2 text-pretty text-muted-foreground">{lede[lang]}</p>
	{/if}
	<div class="mt-4 flex flex-col gap-4 text-pretty text-muted-foreground">
		{@render children()}
	</div>
</section>
