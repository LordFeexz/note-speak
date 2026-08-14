<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import DocsPage from '$lib/docs/docs-page.svelte';
	import DocsSection from '$lib/docs/docs-section.svelte';
	import Prose from '$lib/docs/prose.svelte';
	import { DOC_PAGES, docHref } from '$lib/docs/nav';
	import { BLOCKS } from '$lib/editor/blocks';
	import { blockName, groupLabelFor } from '$lib/docs/blocks-content';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	const lang = $derived(page.params.lang as Lang);

	const DICT: Dict<{
		startLede: string;
		steps: string[];
		guidesLede: string;
		indexLede: string;
		limitsLede: string;
		limits: { title: string; body: string }[];
		openApp: string;
	}> = {
		en: {
			startLede: 'Nothing to install and no account to make. This takes about five minutes.',
			steps: [
				'Open the app. A welcome note is already there — type over it, or press ⌘N for a fresh one.',
				'The first line of a note is its title. There is no separate title field.',
				'Press the microphone, or ⌘⇧D, and talk. Say “period” and “new line” and they arrive as punctuation.',
				'Type / on an empty line to insert anything: a heading, a checklist, a table, an image, a diagram.',
				'Everything saves as you type, into this browser. Use Backup & Restore to keep your own copy.'
			],
			guidesLede: 'Four pages, in the order they are worth reading.',
			indexLede:
				'Every block in the / menu, with its Markdown and a picture of what it looks like. Grouped exactly as the menu groups them.',
			limitsLede:
				'Stated here rather than discovered later. Each one follows from having no server, which is also why there is no account and nothing to leak.',
			limits: [
				{
					title: 'We cannot recover anything',
					body: 'There is no server copy. Clearing this browser’s site data deletes your notes permanently, so export a backup you keep yourself.'
				},
				{
					title: 'A shared note needs somebody online',
					body: 'Shared notes live on the devices of the people sharing them. If nobody who has a note is online, it cannot be fetched — though anything you have already opened stays available offline.'
				},
				{
					title: 'A link cannot be un-sent',
					body: 'Anyone holding a share link has the access it grants and can pass it on. You can reissue the links to cut everyone off at once, but you cannot revoke one person, and you cannot delete a copy already on someone else’s device.'
				},
				{
					title: 'Dictation is not local',
					body: 'In Chrome and Safari the audio is transcribed by Google or Apple. Typing sends nothing anywhere; dictating does.'
				}
			],
			openApp: 'Open the app'
		},
		id: {
			startLede:
				'Tidak ada yang perlu dipasang dan tidak perlu membuat akun. Ini memakan waktu sekitar lima menit.',
			steps: [
				'Buka aplikasinya. Sudah ada catatan selamat datang di sana — timpa saja, atau tekan ⌘N untuk catatan baru.',
				'Baris pertama sebuah catatan adalah judulnya. Tidak ada kolom judul terpisah.',
				'Tekan mikrofon, atau ⌘⇧D, lalu bicara. Ucapkan “titik” dan “baris baru” dan keduanya masuk sebagai tanda baca.',
				'Ketik / di baris kosong untuk menyisipkan apa pun: judul, daftar centang, tabel, gambar, diagram.',
				'Semuanya tersimpan sambil Anda mengetik, ke dalam browser ini. Pakai Cadangkan & Pulihkan untuk menyimpan salinan Anda sendiri.'
			],
			guidesLede: 'Empat halaman, dalam urutan yang paling enak dibaca.',
			indexLede:
				'Setiap blok di menu /, lengkap dengan Markdown dan gambaran tampilannya. Dikelompokkan persis seperti menunya.',
			limitsLede:
				'Disebutkan di sini, bukan supaya Anda temukan sendiri nanti. Semuanya berasal dari tidak adanya server — yang juga alasan tidak ada akun dan tidak ada yang bisa bocor.',
			limits: [
				{
					title: 'Kami tidak bisa memulihkan apa pun',
					body: 'Tidak ada salinan di server. Membersihkan data situs browser ini menghapus catatan Anda secara permanen, jadi ekspor cadangan yang Anda simpan sendiri.'
				},
				{
					title: 'Catatan bersama perlu ada yang online',
					body: 'Catatan bersama hidup di perangkat orang-orang yang membagikannya. Kalau tidak ada satu pun pemiliknya yang online, catatannya tidak bisa diambil — meski yang pernah Anda buka tetap tersedia offline.'
				},
				{
					title: 'Tautan tidak bisa ditarik kembali',
					body: 'Siapa pun yang memegang tautan berbagi punya akses yang diberikannya dan bisa meneruskannya. Anda bisa menerbitkan ulang tautannya untuk memutus semua orang sekaligus, tetapi tidak bisa mencabut akses satu orang saja, dan tidak bisa menghapus salinan yang sudah ada di perangkat orang lain.'
				},
				{
					title: 'Dikte tidak berjalan lokal',
					body: 'Di Chrome dan Safari, audionya ditranskripsikan oleh Google atau Apple. Mengetik tidak mengirim apa pun ke mana pun; mendikte iya.'
				}
			],
			openApp: 'Buka aplikasi'
		}
	};
	const t = $derived(DICT[lang]);

	const grouped = $derived(
		(['basic', 'advanced'] as const).map((group) => ({
			group,
			blocks: BLOCKS.filter((block) => block.group === group)
		}))
	);
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- the docs links go through `docHref()`, which resolves. -->

<DocsPage slug="" {lang}>
	<DocsSection
		id="start"
		{lang}
		title={{ en: 'Five-minute start', id: 'Mulai dalam lima menit' }}
		lede={{ en: t.startLede, id: t.startLede }}
	>
		<ol class="flex list-decimal flex-col gap-2 pl-5">
			{#each t.steps as step (step)}
				<li><Prose text={step} /></li>
			{/each}
		</ol>
		<p>
			<a href={resolve('/(app)/app')} class="font-medium text-note-accent hover:underline"
				>{t.openApp} →</a
			>
		</p>
	</DocsSection>

	<DocsSection
		id="guides"
		{lang}
		title={{ en: 'Guides', id: 'Panduan' }}
		lede={{ en: t.guidesLede, id: t.guidesLede }}
	>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each DOC_PAGES.filter((entry) => entry.slug) as entry (entry.slug)}
				<a href={docHref(lang, entry.slug)} class="glass-panel p-5">
					<span class="block font-medium text-foreground">{entry.nav[lang]}</span>
					<span class="mt-1 block text-sm">{entry.lede[lang]}</span>
				</a>
			{/each}
		</div>
	</DocsSection>

	<DocsSection
		id="block-index"
		{lang}
		title={{ en: 'Every block', id: 'Semua blok' }}
		lede={{ en: t.indexLede, id: t.indexLede }}
	>
		<!--
			Generated from the editor's own registry, so this index cannot list a
			block the app does not have, or miss one it does.
		-->
		{#each grouped as section (section.group)}
			<div>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{groupLabelFor(section.group, lang)}
				</p>
				<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
					{#each section.blocks as block (block.id)}
						<li>
							<a
								href="{docHref(lang, 'blocks')}#block-{block.id}"
								class="text-sm text-note-accent hover:underline"
							>
								{blockName(block.id, lang)}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</DocsSection>

	<DocsSection
		id="limits"
		{lang}
		title={{ en: 'What it cannot do', id: 'Yang tidak bisa dilakukannya' }}
		lede={{ en: t.limitsLede, id: t.limitsLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.limits as limit (limit.title)}
				<div>
					<dt class="font-medium text-foreground">{limit.title}</dt>
					<dd class="mt-1"><Prose text={limit.body} /></dd>
				</div>
			{/each}
		</dl>
	</DocsSection>
</DocsPage>
