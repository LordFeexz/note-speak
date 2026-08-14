<script module lang="ts">
	import type { Snippet } from 'svelte';
	import type { BlockId } from '$lib/editor/blocks';
	import * as previews from '$lib/docs/block-previews.svelte';
	import { assertCovers } from '$lib/docs/blocks-content';

	const PREVIEWS: Record<BlockId, Snippet> = {
		paragraph: previews.paragraph,
		heading1: previews.heading1,
		heading2: previews.heading2,
		heading3: previews.heading3,
		bulletList: previews.bulletList,
		orderedList: previews.orderedList,
		taskList: previews.taskList,
		blockquote: previews.blockquote,
		codeBlock: previews.codeBlock,
		table: previews.table,
		image: previews.image,
		voice: previews.voice,
		video: previews.video,
		audio: previews.audio,
		file: previews.file,
		embed: previews.embed,
		'callout-note': previews.calloutNote,
		'callout-warning': previews.calloutWarning,
		'callout-tip': previews.calloutTip,
		toggle: previews.toggle,
		columns: previews.columns,
		mermaid: previews.mermaid,
		math: previews.math,
		horizontalRule: previews.horizontalRule
	};

	// Throws during prerendering — so a block added to the editor without a
	// preview fails the build, naming the id, instead of shipping a gap.
	assertCovers(Object.keys(PREVIEWS), 'block previews');
</script>

<script lang="ts">
	import { page } from '$app/state';
	import DocsPage from '$lib/docs/docs-page.svelte';
	import DocsSection from '$lib/docs/docs-section.svelte';
	import BlockExample from '$lib/docs/block-example.svelte';
	import Prose from '$lib/docs/prose.svelte';
	import { BLOCKS } from '$lib/editor/blocks';
	import { BLOCK_DOCS } from '$lib/docs/blocks-content';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	const lang = $derived(page.params.lang as Lang);

	const DICT: Dict<{
		howLede: string;
		ways: { title: string; body: string }[];
		basicLede: string;
		advancedLede: string;
		inlineLede: string;
		inline: { syntax: string; what: string }[];
		syntaxHeader: string;
		resultHeader: string;
		limitsLede: string;
		limits: string[];
	}> = {
		en: {
			howLede: 'The same list of blocks, reachable three ways.',
			ways: [
				{
					title: 'Type / on an empty line',
					body: 'The fastest route. Keep typing to filter — /tab finds Table — then press Enter. It only opens at the start of a line, so “and/or” mid-sentence is left alone.'
				},
				{
					title: 'The Text and Insert menus',
					body: 'Below the editor. Text converts the block the cursor is in; Insert adds a new one. Text is labelled with whatever block you are currently in.'
				},
				{
					title: 'Just write the Markdown',
					body: 'Every block here has a Markdown form, and typing it works: `## ` becomes a heading as you type it, ``` opens a code block, `[[` starts a note link.'
				}
			],
			basicLede: 'These convert the block your cursor is in, so only one applies at a time.',
			advancedLede: 'These insert something new at the cursor.',
			inlineLede: 'Inside a paragraph, the usual Markdown marks work as you type.',
			inline: [
				{ syntax: '**bold**', what: 'Bold' },
				{ syntax: '*italic*', what: 'Italic' },
				{ syntax: '~~strikethrough~~', what: 'Strikethrough' },
				{ syntax: '`code`', what: 'Inline code' },
				{ syntax: '[text](https://example.com)', what: 'A link' },
				{ syntax: '[[Another note]]', what: 'A link to another note, by its title' }
			],
			syntaxHeader: 'Type',
			resultHeader: 'Gives you',
			limitsLede:
				'All of these come from storing notes as plain Markdown, which is the trade that keeps them readable in any other editor.',
			limits: [
				'Underline has no Markdown equivalent, so it is not offered. Use bold or italic.',
				'Tables cannot merge cells or hold more than one paragraph in a cell.',
				'A toggle always comes back open — only its heading is saved.',
				'Headings stop at three levels, because the first line of the note is already its title.',
				'Images, video, audio and files live inside the note itself. That is why they are size-limited, and why they work with no connection and no third-party host.'
			]
		},
		id: {
			howLede: 'Daftar blok yang sama, bisa dicapai lewat tiga cara.',
			ways: [
				{
					title: 'Ketik / di baris kosong',
					body: 'Cara tercepat. Terus mengetik untuk menyaring — /tab menemukan Tabel — lalu tekan Enter. Menunya hanya terbuka di awal baris, jadi “dan/atau” di tengah kalimat tidak terganggu.'
				},
				{
					title: 'Menu Teks dan Sisipkan',
					body: 'Ada di bawah editor. Teks mengubah blok tempat kursor berada; Sisipkan menambahkan yang baru. Menu Teks diberi label sesuai blok yang sedang Anda tempati.'
				},
				{
					title: 'Tulis saja Markdown-nya',
					body: 'Setiap blok di sini punya bentuk Markdown, dan mengetiknya langsung berfungsi: `## ` menjadi judul sambil Anda ketik, ``` membuka blok kode, `[[` memulai tautan catatan.'
				}
			],
			basicLede:
				'Blok-blok ini mengubah blok tempat kursor Anda berada, jadi hanya satu yang berlaku pada satu waktu.',
			advancedLede: 'Blok-blok ini menyisipkan sesuatu yang baru di posisi kursor.',
			inlineLede: 'Di dalam paragraf, penanda Markdown biasa bekerja sambil Anda mengetik.',
			inline: [
				{ syntax: '**tebal**', what: 'Tebal' },
				{ syntax: '*miring*', what: 'Miring' },
				{ syntax: '~~dicoret~~', what: 'Dicoret' },
				{ syntax: '`kode`', what: 'Kode sebaris' },
				{ syntax: '[teks](https://example.com)', what: 'Tautan' },
				{ syntax: '[[Catatan lain]]', what: 'Tautan ke catatan lain, berdasarkan judulnya' }
			],
			syntaxHeader: 'Ketik',
			resultHeader: 'Hasilnya',
			limitsLede:
				'Semua ini berasal dari penyimpanan catatan sebagai Markdown biasa — pertukaran yang membuatnya tetap terbaca di editor mana pun.',
			limits: [
				'Garis bawah tidak punya padanan di Markdown, jadi tidak disediakan. Pakai tebal atau miring.',
				'Tabel tidak bisa menggabungkan sel atau memuat lebih dari satu paragraf per sel.',
				'Lipatan selalu kembali dalam keadaan terbuka — hanya judulnya yang disimpan.',
				'Judul berhenti di tiga tingkat, karena baris pertama catatan sudah menjadi judulnya.',
				'Gambar, video, audio, dan berkas berada di dalam catatan itu sendiri. Itulah sebabnya ukurannya dibatasi, dan sebabnya semuanya bekerja tanpa koneksi dan tanpa hosting pihak ketiga.'
			]
		}
	};
	const t = $derived(DICT[lang]);

	const basic = BLOCKS.filter((block) => block.group === 'basic');
	const advanced = BLOCKS.filter((block) => block.group === 'advanced');
</script>

<DocsPage slug="blocks" {lang}>
	<DocsSection
		id="how"
		{lang}
		title={{ en: 'Three ways to insert', id: 'Tiga cara menyisipkan' }}
		lede={{ en: t.howLede, id: t.howLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.ways as way (way.title)}
				<div>
					<dt class="font-medium text-foreground">{way.title}</dt>
					<dd class="mt-1"><Prose text={way.body} /></dd>
				</div>
			{/each}
		</dl>
	</DocsSection>

	<DocsSection
		id="basic"
		{lang}
		title={{ en: 'Basic blocks', id: 'Blok dasar' }}
		lede={{ en: t.basicLede, id: t.basicLede }}
	>
		{#each basic as block (block.id)}
			<BlockExample {block} doc={BLOCK_DOCS[block.id]} {lang} preview={PREVIEWS[block.id]} />
		{/each}
	</DocsSection>

	<DocsSection
		id="advanced"
		{lang}
		title={{ en: 'Advanced blocks', id: 'Blok lanjutan' }}
		lede={{ en: t.advancedLede, id: t.advancedLede }}
	>
		{#each advanced as block (block.id)}
			<BlockExample {block} doc={BLOCK_DOCS[block.id]} {lang} preview={PREVIEWS[block.id]} />
		{/each}
	</DocsSection>

	<DocsSection
		id="inline"
		{lang}
		title={{ en: 'Inline syntax', id: 'Sintaks sebaris' }}
		lede={{ en: t.inlineLede, id: t.inlineLede }}
	>
		<div class="overflow-x-auto glass-panel">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[var(--glass-border)]">
						<th class="px-4 py-2 text-left font-medium text-foreground">{t.syntaxHeader}</th>
						<th class="px-4 py-2 text-left font-medium text-foreground">{t.resultHeader}</th>
					</tr>
				</thead>
				<tbody>
					{#each t.inline as row (row.syntax)}
						<tr class="border-b border-[var(--glass-border)] last:border-0">
							<td class="px-4 py-2"
								><code class="rounded bg-muted px-1.5 py-0.5 text-xs">{row.syntax}</code></td
							>
							<td class="px-4 py-2">{row.what}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</DocsSection>

	<DocsSection
		id="block-limits"
		{lang}
		title={{ en: 'Limits worth knowing', id: 'Batasan yang perlu diketahui' }}
		lede={{ en: t.limitsLede, id: t.limitsLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.limits as limit (limit)}
				<li><Prose text={limit} /></li>
			{/each}
		</ul>
	</DocsSection>
</DocsPage>
