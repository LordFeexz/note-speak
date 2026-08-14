<script lang="ts">
	import { page } from '$app/state';
	import DocsPage from '$lib/docs/docs-page.svelte';
	import DocsSection from '$lib/docs/docs-section.svelte';
	import KeyCombo from '$lib/docs/key-combo.svelte';
	import { COMMANDS } from '$lib/speech/transcript';
	import { LANGUAGES } from '$lib/stores/speech.svelte';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	const lang = $derived(page.params.lang as Lang);

	/**
	 * The command tables come from the speech pipeline itself, and the language
	 * list from the picker — so neither can describe a phrase the app does not
	 * actually listen for.
	 */
	const TABLES = [
		{ code: 'en', label: 'English' },
		{ code: 'id', label: 'Bahasa Indonesia' }
	] as const;

	const DICT: Dict<{
		basicsLede: string;
		basics: string[];
		commandsLede: string;
		spoken: string;
		gives: string;
		newline: string;
		paragraph: string;
		scratch: string;
		commandsNote: string;
		languagesLede: string;
		languagesNote: string;
		autoTitle: string;
		autoBody: string;
		clipsLede: string;
		clipsBody: string[];
		privacyLede: string;
		privacyBody: string[];
		troubleLede: string;
		trouble: { symptom: string; fix: string }[];
	}> = {
		en: {
			basicsLede: 'Dictation types into the note at the cursor, in whatever block you are in.',
			basics: [
				'Press Dictate, or ⌘⇧D, and start talking. Words appear as the engine hears them and firm up as it revises.',
				'Press Stop, Esc, or simply start typing — typing always takes over from your voice.',
				'The whole run counts as one edit, so a single undo removes the utterance rather than a letter.',
				'It works inside a shared note too, exactly as it does in your own.'
			],
			commandsLede:
				'Say these instead of the punctuation mark and they arrive as punctuation, not as words. Longer phrases win over shorter ones, so “new paragraph” never comes out as “new”.',
			spoken: 'Say',
			gives: 'You get',
			newline: 'a line break',
			paragraph: 'a blank line',
			scratch: 'deletes what you just said',
			commandsNote:
				'Only English and Indonesian have spoken punctuation. The other languages still transcribe normally; you just type the punctuation yourself. Turn the whole feature off under “Spoken punctuation” in the language menu.',
			languagesLede: 'Pick the language in the menu beside the Dictate button.',
			languagesNote:
				'Once you have used a second language, a one-tap button appears next to the menu to flip between the two most recent — most people alternate between exactly two.',
			autoTitle: 'Auto-capitalize',
			autoBody:
				'On by default. It capitalizes the first letter of each sentence, removes the space engines put before a comma, and tidies double spaces. It is skipped for scripts without letter case — Japanese, Chinese, Korean, Arabic, Hindi and Russian — where the spacing cleanup still applies.',
			clipsLede: 'A voice clip records the audio and transcribes it at the same time.',
			clipsBody: [
				'Insert one with /voice. A bar appears at the bottom with a timer and the words as they are recognised.',
				'The clip stops itself at three minutes, and the file is capped at 5 MB — around 240 KB a minute.',
				'The transcript is stored as ordinary text, so searching finds the words. The audio itself is skipped by search, so it cannot swamp the results.'
			],
			privacyLede: 'This is the one part of Note Speak that sends anything off your device.',
			privacyBody: [
				'Dictation uses the speech recognition built into your browser, and in Chrome and Safari that is a cloud service: the audio goes to Google or Apple, is transcribed, and comes back as text.',
				'It does not pass through us — we have no server that could receive it — and their handling of it is governed by their privacy policies, not ours.',
				'Typing sends nothing anywhere. If the audio matters to you, type instead; everything else in the app works identically.'
			],
			troubleLede: 'The usual causes, in the order they are worth checking.',
			trouble: [
				{
					symptom: 'The microphone button is greyed out',
					fix: 'Either the page is not on https, or the browser has no speech recognition at all. Firefox has none; Chrome, Edge and Safari do. Typing is unaffected either way.'
				},
				{
					symptom: 'Access was blocked',
					fix: 'The browser is refusing the microphone. Allow it for this site in the browser’s own settings — the app cannot re-ask once it has been denied.'
				},
				{
					symptom: 'It needs an internet connection',
					fix: 'On Chrome the recognition runs on Google’s servers, so dictation needs a connection even though the rest of the app does not.'
				},
				{
					symptom: 'It keeps stopping',
					fix: 'Usually a microphone that keeps dropping out. The app restarts it a few times, then says so rather than silently missing what you say.'
				}
			]
		},
		id: {
			basicsLede: 'Dikte mengetik ke dalam catatan di posisi kursor, di blok mana pun Anda berada.',
			basics: [
				'Tekan Dikte, atau ⌘⇧D, lalu mulai bicara. Kata-kata muncul begitu mesin mendengarnya dan menjadi mantap saat direvisi.',
				'Tekan Berhenti, Esc, atau cukup mulai mengetik — ketikan selalu mengambil alih dari suara.',
				'Seluruh sesi dihitung sebagai satu suntingan, jadi satu kali urungkan menghapus ucapannya, bukan satu huruf.',
				'Ini juga berfungsi di dalam catatan bersama, persis seperti di catatan Anda sendiri.'
			],
			commandsLede:
				'Ucapkan ini sebagai ganti tanda bacanya, dan ia masuk sebagai tanda baca, bukan sebagai kata. Frasa yang lebih panjang menang atas yang pendek, jadi “paragraf baru” tidak pernah keluar sebagai “paragraf”.',
			spoken: 'Ucapkan',
			gives: 'Hasilnya',
			newline: 'ganti baris',
			paragraph: 'baris kosong',
			scratch: 'menghapus yang baru saja Anda ucapkan',
			commandsNote:
				'Hanya bahasa Inggris dan Indonesia yang punya tanda baca lisan. Bahasa lain tetap ditranskripsikan seperti biasa; tanda bacanya saja yang Anda ketik sendiri. Matikan seluruh fitur ini lewat “Tanda baca lisan” di menu bahasa.',
			languagesLede: 'Pilih bahasanya di menu sebelah tombol Dikte.',
			languagesNote:
				'Setelah Anda memakai bahasa kedua, muncul tombol sekali-ketuk di sebelah menu untuk berpindah antara dua bahasa terakhir — kebanyakan orang berganti-ganti di antara tepat dua bahasa.',
			autoTitle: 'Kapital otomatis',
			autoBody:
				'Aktif secara bawaan. Fitur ini mengapitalkan huruf pertama setiap kalimat, menghapus spasi yang disisipkan mesin sebelum koma, dan merapikan spasi ganda. Ia dilewati untuk aksara tanpa huruf kapital — Jepang, Tionghoa, Korea, Arab, Hindi, dan Rusia — sementara perapian spasinya tetap berlaku.',
			clipsLede: 'Klip suara merekam audio sekaligus mentranskripsinya.',
			clipsBody: [
				'Sisipkan dengan /voice. Sebuah bilah muncul di bawah dengan penghitung waktu dan kata-kata yang dikenali.',
				'Klipnya berhenti sendiri pada tiga menit, dan berkasnya dibatasi 5 MB — sekitar 240 KB per menit.',
				'Transkripnya disimpan sebagai teks biasa, jadi pencarian menemukan kata-katanya. Audionya sendiri dilewati pencarian agar tidak membanjiri hasilnya.'
			],
			privacyLede:
				'Ini satu-satunya bagian Note Speak yang mengirim sesuatu keluar dari perangkat Anda.',
			privacyBody: [
				'Dikte memakai pengenalan suara bawaan browser Anda, dan di Chrome serta Safari itu adalah layanan awan: audionya dikirim ke Google atau Apple, ditranskripsikan, lalu kembali sebagai teks.',
				'Audionya tidak melewati kami — kami tidak punya server yang bisa menerimanya — dan cara mereka menanganinya diatur oleh kebijakan privasi mereka, bukan kami.',
				'Mengetik tidak mengirim apa pun ke mana pun. Kalau audionya penting bagi Anda, ketik saja; semua fitur lain di aplikasi ini bekerja sama persis.'
			],
			troubleLede: 'Penyebab yang biasa, dalam urutan yang paling layak diperiksa.',
			trouble: [
				{
					symptom: 'Tombol mikrofon berwarna abu-abu',
					fix: 'Entah halamannya tidak berjalan di https, atau browsernya memang tidak punya pengenalan suara. Firefox tidak punya; Chrome, Edge, dan Safari punya. Mengetik tetap tidak terpengaruh.'
				},
				{
					symptom: 'Aksesnya diblokir',
					fix: 'Browser menolak mikrofonnya. Izinkan untuk situs ini lewat pengaturan browser — aplikasinya tidak bisa meminta ulang setelah ditolak.'
				},
				{
					symptom: 'Perlu koneksi internet',
					fix: 'Di Chrome, pengenalannya berjalan di server Google, jadi dikte perlu koneksi meski bagian lain aplikasi ini tidak.'
				},
				{
					symptom: 'Dikte terus berhenti',
					fix: 'Biasanya mikrofon yang terus terputus. Aplikasinya mencoba menyalakan ulang beberapa kali, lalu memberi tahu Anda alih-alih diam-diam melewatkan ucapan.'
				}
			]
		}
	};
	const t = $derived(DICT[lang]);

	function shown(value: string): string {
		if (value === '\n') return t.newline;
		if (value === '\n\n') return t.paragraph;
		return value;
	}
</script>

<DocsPage slug="voice" {lang}>
	<DocsSection
		id="basics"
		{lang}
		title={{ en: 'Dictating', id: 'Mendikte' }}
		lede={{ en: t.basicsLede, id: t.basicsLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.basics as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
		<p>
			<KeyCombo keys={['mod', '⇧', 'D']} />
		</p>
	</DocsSection>

	<DocsSection
		id="commands"
		{lang}
		title={{ en: 'Spoken punctuation', id: 'Tanda baca lisan' }}
		lede={{ en: t.commandsLede, id: t.commandsLede }}
	>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each TABLES as table (table.code)}
				<div class="overflow-hidden glass-panel">
					<p
						class="border-b border-[var(--glass-border)] px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
					>
						{table.label}
					</p>
					<table class="w-full text-sm">
						<thead class="sr-only">
							<tr><th>{t.spoken}</th><th>{t.gives}</th></tr>
						</thead>
						<tbody>
							{#each Object.entries(COMMANDS[table.code]) as [phrase, command] (phrase)}
								<tr class="border-b border-[var(--glass-border)] last:border-0">
									<td class="px-4 py-1.5">“{phrase}”</td>
									<td class="px-4 py-1.5 text-muted-foreground">
										{#if command.kind === 'scratch'}
											{t.scratch}
										{:else}
											<code class="rounded bg-muted px-1.5 py-0.5 text-xs">
												{shown(command.value)}
											</code>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</div>
		<p>{t.commandsNote}</p>
	</DocsSection>

	<DocsSection
		id="languages"
		{lang}
		title={{ en: 'Languages', id: 'Bahasa' }}
		lede={{ en: t.languagesLede, id: t.languagesLede }}
	>
		<ul class="flex flex-wrap gap-x-4 gap-y-1">
			{#each LANGUAGES as language (language.value)}
				<li class="text-sm">
					{language.label}
					<code class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">{language.value}</code>
				</li>
			{/each}
		</ul>
		<p>{t.languagesNote}</p>
		<div>
			<p class="font-medium text-foreground">{t.autoTitle}</p>
			<p class="mt-1">{t.autoBody}</p>
		</div>
	</DocsSection>

	<DocsSection
		id="clips"
		{lang}
		title={{ en: 'Voice clips', id: 'Klip suara' }}
		lede={{ en: t.clipsLede, id: t.clipsLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.clipsBody as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
	</DocsSection>

	<DocsSection
		id="privacy"
		{lang}
		title={{ en: 'Where the audio goes', id: 'Ke mana audionya pergi' }}
		lede={{ en: t.privacyLede, id: t.privacyLede }}
	>
		{#each t.privacyBody as line (line)}
			<p>{line}</p>
		{/each}
	</DocsSection>

	<DocsSection
		id="trouble"
		{lang}
		title={{ en: 'When it will not start', id: 'Kalau dikte tidak mau mulai' }}
		lede={{ en: t.troubleLede, id: t.troubleLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.trouble as item (item.symptom)}
				<div>
					<dt class="font-medium text-foreground">{item.symptom}</dt>
					<dd class="mt-1">{item.fix}</dd>
				</div>
			{/each}
		</dl>
	</DocsSection>
</DocsPage>
