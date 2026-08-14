<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
	import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
	import { LANGS, LANG_LABELS, type Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';
	import { DOC_PAGES, DOCS_UPDATED, docHref, neighbours, pageFor, type DocSlug } from './nav';

	/**
	 * The shell every documentation page renders inside.
	 *
	 * **No `prose` anywhere on these pages.** `@tailwindcss/typography` adds
	 * literal backticks around inline `<code>` through a `::before`, which is
	 * unusable on a page whose subject is Markdown syntax; and its body colour
	 * inherits into `not-prose` children, which would tint every block preview a
	 * shade the editor never uses. Spacing comes from `flex flex-col gap-*`
	 * instead of element selectors, so nothing can collide with `.note-prose`.
	 */
	type Props = { slug: DocSlug; lang: Lang; children: Snippet };
	let { slug, lang, children }: Props = $props();

	const page = $derived(pageFor(slug));
	const around = $derived(neighbours(slug));

	const DICT: Dict<{
		docs: string;
		onThisPage: string;
		allPages: string;
		updated: (date: string) => string;
		previous: string;
		next: string;
		language: string;
		anchor: (title: string) => string;
	}> = {
		en: {
			docs: 'Docs',
			onThisPage: 'On this page',
			allPages: 'Documentation',
			updated: (date) => `Last updated ${date}`,
			previous: 'Previous',
			next: 'Next',
			language: 'Language',
			anchor: (title) => `Link to ${title}`
		},
		id: {
			docs: 'Dokumentasi',
			onThisPage: 'Di halaman ini',
			allPages: 'Dokumentasi',
			updated: (date) => `Terakhir diperbarui ${date}`,
			previous: 'Sebelumnya',
			next: 'Berikutnya',
			language: 'Bahasa',
			anchor: (title) => `Tautan ke ${title}`
		}
	};
	const t = $derived(DICT[lang]);

	const other = $derived(LANGS.filter((value) => value !== lang));
	const linkClass =
		'block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
</script>

<!--
	eslint-disable svelte/no-navigation-without-resolve --
	Every link on this page comes from `docHref()`, which calls `resolve()` with a
	typed route id. The rule checks the `href` expression itself and cannot see
	through a helper, so it is switched off for a file that is entirely navigation.
-->

<svelte:head>
	<title>{page.metaTitle[lang]}</title>
	<meta name="description" content={page.metaDescription[lang]} />
	<!-- Each language points at the other, so a search engine indexes both rather
	     than treating one as a duplicate of the other. -->
	{#each LANGS as alternate (alternate)}
		<link rel="alternate" hreflang={alternate} href={docHref(alternate, slug)} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={docHref('en', slug)} />
</svelte:head>

<article class="px-6 py-16" {lang}>
	<div class="mx-auto w-[min(72rem,100%)]">
		<header class="max-w-3xl">
			{#if slug}
				<a
					href={docHref(lang, '')}
					class="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					{t.docs}
				</a>
			{/if}
			<h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{page.heading[lang]}</h1>
			<p class="mt-2 text-sm text-muted-foreground">{t.updated(DOCS_UPDATED[lang])}</p>
			<p class="mt-6 text-lg text-pretty text-muted-foreground">{page.lede[lang]}</p>
		</header>

		<!-- The rail is hidden below `lg`, so small screens get the same links inline. -->
		<nav class="mt-10 glass-panel p-5 lg:hidden" aria-label={t.onThisPage}>
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{t.onThisPage}
			</p>
			<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
				{#each page.sections as section (section.id)}
					<li>
						<a href="#{section.id}" class="text-sm text-note-accent hover:underline">
							{section.title[lang]}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="mt-12 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
			<!--
				No `self-start` on the aside: it has to span the whole grid row for the
				sticky nav inside it to travel the length of the page. No
				`overflow-hidden` on any ancestor either — that silently disables
				`position: sticky` with no warning.
			-->
			<aside class="hidden lg:block">
				<nav class="sticky top-28 flex flex-col gap-6" aria-label={t.allPages}>
					<div>
						<p class="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{t.allPages}
						</p>
						<ul class="mt-2">
							{#each DOC_PAGES as entry (entry.slug)}
								<li>
									<a
										href={docHref(lang, entry.slug)}
										class="{linkClass} {entry.slug === slug
											? 'bg-muted font-medium text-foreground'
											: ''}"
										aria-current={entry.slug === slug ? 'page' : undefined}
									>
										{entry.nav[lang]}
									</a>
								</li>
							{/each}
						</ul>
					</div>

					<div>
						<p class="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{t.onThisPage}
						</p>
						<ul class="mt-2">
							{#each page.sections as section (section.id)}
								<li><a href="#{section.id}" class={linkClass}>{section.title[lang]}</a></li>
							{/each}
						</ul>
					</div>

					<div>
						<p class="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{t.language}
						</p>
						<ul class="mt-2">
							{#each other as alternate (alternate)}
								<li>
									<a href={docHref(alternate, slug)} class={linkClass} hreflang={alternate}>
										{LANG_LABELS[alternate]}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				</nav>
			</aside>

			<div class="max-w-3xl min-w-0">
				{@render children()}

				<nav class="mt-16 grid gap-3 sm:grid-cols-2" aria-label={t.next}>
					{#if around.prev}
						<a href={docHref(lang, around.prev.slug)} class="glass-panel p-4 transition-colors">
							<span class="flex items-center gap-1 text-xs text-muted-foreground">
								<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} class="size-3.5" />
								{t.previous}
							</span>
							<span class="mt-1 block font-medium">{around.prev.nav[lang]}</span>
						</a>
					{:else}
						<span></span>
					{/if}
					{#if around.next}
						<a
							href={docHref(lang, around.next.slug)}
							class="glass-panel p-4 text-right transition-colors"
						>
							<span class="flex items-center justify-end gap-1 text-xs text-muted-foreground">
								{t.next}
								<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} class="size-3.5" />
							</span>
							<span class="mt-1 block font-medium">{around.next.nav[lang]}</span>
						</a>
					{/if}
				</nav>
			</div>
		</div>
	</div>
</article>
