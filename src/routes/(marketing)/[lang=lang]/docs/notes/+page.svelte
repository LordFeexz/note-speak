<script lang="ts">
	import { page } from '$app/state';
	import DocsPage from '$lib/docs/docs-page.svelte';
	import DocsSection from '$lib/docs/docs-section.svelte';
	import KeyCombo from '$lib/docs/key-combo.svelte';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	const lang = $derived(page.params.lang as Lang);

	const SHORTCUTS = [
		{ keys: ['mod', 'N'], id: 'newNote' },
		{ keys: ['mod', 'F'], id: 'search' },
		{ keys: ['mod', '⇧', 'D'], id: 'dictate' },
		{ keys: ['Esc'], id: 'escape' }
	] as const;

	const DICT: Dict<{
		organiseLede: string;
		organise: string[];
		layoutsLede: string;
		layouts: { title: string; body: string }[];
		layoutsNote: string;
		boardNote: string;
		searchLede: string;
		search: string[];
		sortNote: string;
		linksLede: string;
		links: string[];
		historyLede: string;
		history: string[];
		historyNote: string;
		trashLede: string;
		trash: string[];
		backupLede: string;
		backup: { title: string; body: string }[];
		importNote: string;
		installLede: string;
		install: string[];
		shortcutsLede: string;
		shortcutLabels: Record<'newNote' | 'search' | 'dictate' | 'escape', string>;
		modNote: string;
	}> = {
		en: {
			organiseLede:
				'The first line of a note is its title — there is no separate field, and renaming means editing that line.',
			organise: [
				'Folders are a flat list in the sidebar. New Folder creates one; a folder’s ⋯ menu renames or deletes it.',
				'Deleting a folder keeps its notes and moves them to All Notes. Nothing is lost by tidying.',
				'Move a note between folders from its own ⋯ menu.',
				'Pin a note to keep it at the top of its list, regardless of how the list is sorted.'
			],
			layoutsLede:
				'The same notes, drawn five different ways. Pick one from the layout button in the list header; the choice is remembered on this device.',
			layouts: [
				{
					title: 'Rows',
					body: 'The default. Title, date and a one-line preview — the most notes you can scan without losing the gist of each.'
				},
				{
					title: 'Compact',
					body: 'Title only. Roughly twice as many notes on screen, for when you know what you are looking for.'
				},
				{
					title: 'Grid',
					body: 'Cards with a longer excerpt, and a thumbnail for any note whose first image is embedded in it. The pane widens to make room.'
				},
				{
					title: 'Grouped',
					body: 'Rows under headings — Today, Yesterday, Previous 7 days. The headings follow whatever you are sorting by, so they can never disagree with the order: date buckets when sorting by date, first letters when sorting by title.'
				},
				{
					title: 'Board',
					body: 'One column per folder, side by side, so you can see the whole shape of your notes at once. Drag a note by the grip in its corner to move it to another folder.'
				}
			],
			layoutsNote:
				'Every layout shows the same notes in the same order, and pinned notes lead in all of them — they differ in shape, not in what they contain.',
			boardNote:
				'The board groups by folder, so it is only offered in All Notes; inside a single folder or in Trash there would be nothing to group. Dragging is an addition, not a replacement: “Move to” in a note’s ⋯ menu still moves it, by keyboard, in every layout.',
			searchLede: 'One box, searching the pane you are looking at.',
			search: [
				'Search matches the title and the body, ignoring case.',
				'Embedded images, video, audio and files are skipped — they are megabytes of encoded data that would swamp both the results and the typing.',
				'The words in a voice clip’s transcript are ordinary text, so they are searchable even though the audio is not.'
			],
			sortNote:
				'Sort by date edited, date created or title, from the control in the list header. Pinned notes lead regardless of the choice.',
			linksLede: 'Type [[ and a note’s title to link to it.',
			links: [
				'The link resolves by title as the note renders, so renaming a note never breaks a link to it.',
				'Linking to a title that does not exist yet is not an error — clicking it creates that note.',
				'Any note linking to the one you are reading is listed under “Linked from” at the bottom of the editor.'
			],
			historyLede: 'Versions are kept per note, on this device.',
			history: [
				'A version closes automatically after a couple of minutes without typing, so a burst of editing becomes one entry rather than fifty.',
				'Save version now takes one immediately and lets you name it.',
				'Selecting a version shows a line-by-line difference against the note as it is now.',
				'Restoring saves your current text as a version first, so restoring is itself undoable.'
			],
			historyNote:
				'Fifty versions or 2 MB per note, whichever comes first — the oldest fall away. Images are stored once by content, so a version of a photo-heavy note costs a few hundred bytes rather than a few hundred kilobytes.',
			trashLede: 'Deleting is reversible until you say otherwise.',
			trash: [
				'Move to Trash is a soft delete, with an Undo on the toast that follows it.',
				'A trashed note opens read-only, with a Restore button in its header.',
				'Empty Trash deletes permanently, from this device, with no way back.'
			],
			backupLede:
				'Your notes are in this browser and nowhere else. A backup is the only copy that survives clearing site data.',
			backup: [
				{
					title: 'Export backup (.json)',
					body: 'Everything, including folders and trashed notes. This is the file to import later — it restores exactly what you had.'
				},
				{
					title: 'Export notes (.zip)',
					body: 'One Markdown file per note, arranged into folders, readable in any editor. The archive also contains the JSON, so it doubles as a full restore point.'
				},
				{
					title: 'Export as Markdown',
					body: 'A single note, from its ⋯ menu.'
				}
			],
			importNote:
				'Importing offers Merge or Replace all. Merge keeps whichever copy of a note is newer, so importing an older backup over newer edits changes nothing. Replace all deletes what is here first, including anything the backup does not contain.',
			installLede: 'Install it and it behaves like any other app on the device.',
			install: [
				'Chrome and Edge offer an Install button in the sidebar. On iPhone and iPad, Safari installs from Share → Add to Home Screen.',
				'Once installed it works with no connection at all — the one exception being dictation, which needs the network on Chrome.',
				'Long-pressing the installed icon offers New note and New voice note.',
				'Sharing text or a link to Note Speak from another app creates a note from it.',
				'A new version never reloads under you. It waits behind a Reload button.'
			],
			shortcutsLede: 'Four, and they work on every platform.',
			shortcutLabels: {
				newNote: 'New note',
				search: 'Search notes',
				dictate: 'Start / stop dictation',
				escape: 'Stop dictation, or clear the search'
			},
			modNote: '⌘ on a Mac, Ctrl everywhere else.'
		},
		id: {
			organiseLede:
				'Baris pertama catatan adalah judulnya — tidak ada kolom terpisah, dan mengganti nama berarti menyunting baris itu.',
			organise: [
				'Folder berupa daftar datar di bilah samping. Folder Baru membuatnya; menu ⋯ pada folder mengganti nama atau menghapusnya.',
				'Menghapus folder tetap menyimpan catatannya dan memindahkannya ke Semua Catatan. Tidak ada yang hilang karena berbenah.',
				'Pindahkan catatan antar folder lewat menu ⋯ pada catatan itu sendiri.',
				'Sematkan catatan agar tetap di puncak daftarnya, terlepas dari urutan daftar itu.'
			],
			layoutsLede:
				'Catatan yang sama, digambar dengan lima cara berbeda. Pilih lewat tombol tata letak di kepala daftar; pilihannya diingat di perangkat ini.',
			layouts: [
				{
					title: 'Baris',
					body: 'Bawaan. Judul, tanggal, dan pratinjau satu baris — jumlah catatan terbanyak yang bisa dipindai tanpa kehilangan gambaran isinya.'
				},
				{
					title: 'Ringkas',
					body: 'Hanya judul. Kira-kira dua kali lebih banyak catatan di layar, untuk saat Anda sudah tahu apa yang dicari.'
				},
				{
					title: 'Kisi',
					body: 'Kartu dengan kutipan lebih panjang, dan gambar mini untuk catatan yang gambar pertamanya tertanam di dalamnya. Panelnya melebar untuk memberi ruang.'
				},
				{
					title: 'Dikelompokkan',
					body: 'Baris di bawah judul kelompok — Hari ini, Kemarin, 7 hari terakhir. Kelompoknya mengikuti dasar pengurutan Anda, jadi tidak mungkin bertentangan dengan urutannya: kelompok tanggal saat diurutkan menurut tanggal, huruf awal saat diurutkan menurut judul.'
				},
				{
					title: 'Papan',
					body: 'Satu kolom per folder, berdampingan, sehingga seluruh bentuk catatan Anda terlihat sekaligus. Seret catatan lewat pegangan di sudutnya untuk memindahkannya ke folder lain.'
				}
			],
			layoutsNote:
				'Setiap tata letak menampilkan catatan yang sama dalam urutan yang sama, dan catatan tersemat selalu memimpin — yang berbeda adalah bentuknya, bukan isinya.',
			boardNote:
				'Papan mengelompokkan menurut folder, jadi hanya tersedia di Semua Catatan; di dalam satu folder atau di Sampah tidak ada yang bisa dikelompokkan. Menyeret adalah tambahan, bukan pengganti: “Pindahkan ke” di menu ⋯ sebuah catatan tetap bisa memindahkannya, lewat papan ketik, di semua tata letak.',
			searchLede: 'Satu kotak, mencari di panel yang sedang Anda lihat.',
			search: [
				'Pencarian mencocokkan judul dan isi, tanpa membedakan huruf besar-kecil.',
				'Gambar, video, audio, dan berkas yang disematkan dilewati — semuanya data terkode berukuran megabyte yang akan membanjiri hasil sekaligus membuat pengetikan tersendat.',
				'Kata-kata dalam transkrip klip suara adalah teks biasa, jadi tetap bisa dicari meski audionya tidak.'
			],
			sortNote:
				'Urutkan menurut tanggal disunting, tanggal dibuat, atau judul, lewat kontrol di kepala daftar. Catatan yang disematkan tetap memimpin apa pun pilihannya.',
			linksLede: 'Ketik [[ lalu judul sebuah catatan untuk menautkannya.',
			links: [
				'Tautannya diselesaikan berdasarkan judul saat catatan dirender, jadi mengganti nama catatan tidak pernah merusak tautan ke sana.',
				'Menautkan ke judul yang belum ada bukan kesalahan — mengekliknya akan membuat catatan itu.',
				'Catatan mana pun yang menautkan ke catatan yang sedang Anda baca terdaftar di bawah “Ditautkan dari” di bagian bawah editor.'
			],
			historyLede: 'Versi disimpan per catatan, di perangkat ini.',
			history: [
				'Sebuah versi ditutup otomatis setelah beberapa menit tanpa diketik, jadi satu sesi menyunting menjadi satu entri, bukan lima puluh.',
				'Simpan versi sekarang membuat satu versi seketika dan memungkinkan Anda memberinya nama.',
				'Memilih sebuah versi menampilkan perbedaan baris demi baris terhadap catatan seperti sekarang.',
				'Memulihkan akan menyimpan teks Anda saat ini sebagai versi lebih dulu, jadi pemulihan itu sendiri bisa diurungkan.'
			],
			historyNote:
				'Lima puluh versi atau 2 MB per catatan, mana yang lebih dulu tercapai — yang paling lama akan gugur. Gambar disimpan sekali berdasarkan isinya, jadi satu versi dari catatan penuh foto hanya memakan beberapa ratus byte, bukan beberapa ratus kilobyte.',
			trashLede: 'Menghapus bisa dibatalkan sampai Anda menyatakan sebaliknya.',
			trash: [
				'Pindahkan ke Sampah adalah penghapusan lunak, dengan tombol Urungkan pada notifikasi yang menyusul.',
				'Catatan di Sampah terbuka hanya-baca, dengan tombol Pulihkan di bagian atasnya.',
				'Kosongkan Sampah menghapus secara permanen, dari perangkat ini, tanpa jalan kembali.'
			],
			backupLede:
				'Catatan Anda ada di browser ini dan tidak di tempat lain. Cadangan adalah satu-satunya salinan yang selamat saat data situs dibersihkan.',
			backup: [
				{
					title: 'Ekspor cadangan (.json)',
					body: 'Semuanya, termasuk folder dan catatan di Sampah. File inilah yang nanti diimpor — ia memulihkan persis seperti keadaan Anda sebelumnya.'
				},
				{
					title: 'Ekspor catatan (.zip)',
					body: 'Satu file Markdown per catatan, tertata dalam folder, terbaca di editor mana pun. Arsipnya juga memuat JSON-nya, jadi sekaligus berfungsi sebagai titik pemulihan penuh.'
				},
				{
					title: 'Ekspor sebagai Markdown',
					body: 'Satu catatan saja, lewat menu ⋯ miliknya.'
				}
			],
			importNote:
				'Mengimpor menawarkan Gabungkan atau Ganti semua. Gabungkan menyimpan salinan catatan yang lebih baru, jadi mengimpor cadangan lama di atas suntingan yang lebih baru tidak mengubah apa pun. Ganti semua menghapus yang ada di sini lebih dulu, termasuk apa pun yang tidak ada di cadangan.',
			installLede: 'Pasang, dan ia berperilaku seperti aplikasi lain di perangkat Anda.',
			install: [
				'Chrome dan Edge menawarkan tombol Pasang di bilah samping. Di iPhone dan iPad, Safari memasangnya lewat Bagikan → Tambahkan ke Layar Utama.',
				'Setelah terpasang, ia bekerja tanpa koneksi sama sekali — satu-satunya pengecualian adalah dikte, yang memerlukan jaringan di Chrome.',
				'Menekan lama ikon yang terpasang menawarkan Catatan baru dan Catatan suara baru.',
				'Membagikan teks atau tautan ke Note Speak dari aplikasi lain akan membuat catatan darinya.',
				'Versi baru tidak pernah memuat ulang tanpa sepengetahuan Anda. Ia menunggu di balik tombol Muat ulang.'
			],
			shortcutsLede: 'Ada empat, dan semuanya bekerja di setiap platform.',
			shortcutLabels: {
				newNote: 'Catatan baru',
				search: 'Cari catatan',
				dictate: 'Mulai / hentikan dikte',
				escape: 'Hentikan dikte, atau bersihkan pencarian'
			},
			modNote: '⌘ di Mac, Ctrl di selainnya.'
		}
	};
	const t = $derived(DICT[lang]);
</script>

<DocsPage slug="notes" {lang}>
	<DocsSection
		id="organise"
		{lang}
		title={{ en: 'Folders and pins', id: 'Folder dan sematan' }}
		lede={{ en: t.organiseLede, id: t.organiseLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.organise as line (line)}<li>{line}</li>{/each}
		</ul>
	</DocsSection>

	<DocsSection
		id="layouts"
		{lang}
		title={{ en: 'List layouts', id: 'Tata letak daftar' }}
		lede={{ en: t.layoutsLede, id: t.layoutsLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.layouts as entry (entry.title)}
				<div>
					<dt class="font-medium text-foreground">{entry.title}</dt>
					<dd class="mt-1">{entry.body}</dd>
				</div>
			{/each}
		</dl>
		<p>{t.layoutsNote}</p>
		<p>{t.boardNote}</p>
	</DocsSection>

	<DocsSection
		id="search"
		{lang}
		title={{ en: 'Search and sorting', id: 'Pencarian dan pengurutan' }}
		lede={{ en: t.searchLede, id: t.searchLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.search as line (line)}<li>{line}</li>{/each}
		</ul>
		<p>{t.sortNote}</p>
	</DocsSection>

	<DocsSection
		id="links"
		{lang}
		title={{ en: 'Linking notes', id: 'Menautkan catatan' }}
		lede={{ en: t.linksLede, id: t.linksLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.links as line (line)}<li>{line}</li>{/each}
		</ul>
	</DocsSection>

	<DocsSection
		id="history"
		{lang}
		title={{ en: 'Version history', id: 'Riwayat versi' }}
		lede={{ en: t.historyLede, id: t.historyLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.history as line (line)}<li>{line}</li>{/each}
		</ul>
		<p>{t.historyNote}</p>
	</DocsSection>

	<DocsSection
		id="trash"
		{lang}
		title={{ en: 'Trash', id: 'Sampah' }}
		lede={{ en: t.trashLede, id: t.trashLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.trash as line (line)}<li>{line}</li>{/each}
		</ul>
	</DocsSection>

	<DocsSection
		id="backup"
		{lang}
		title={{ en: 'Backup and restore', id: 'Cadangan dan pemulihan' }}
		lede={{ en: t.backupLede, id: t.backupLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.backup as item (item.title)}
				<div>
					<dt class="font-medium text-foreground">{item.title}</dt>
					<dd class="mt-1">{item.body}</dd>
				</div>
			{/each}
		</dl>
		<p>{t.importNote}</p>
	</DocsSection>

	<DocsSection
		id="install"
		{lang}
		title={{ en: 'Installing and offline', id: 'Memasang dan mode offline' }}
		lede={{ en: t.installLede, id: t.installLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.install as line (line)}<li>{line}</li>{/each}
		</ul>
	</DocsSection>

	<DocsSection
		id="shortcuts"
		{lang}
		title={{ en: 'Keyboard shortcuts', id: 'Pintasan papan ketik' }}
		lede={{ en: t.shortcutsLede, id: t.shortcutsLede }}
	>
		<p class="text-sm">{t.modNote}</p>
		<div class="overflow-x-auto glass-panel">
			<table class="w-full text-sm">
				<tbody>
					{#each SHORTCUTS as shortcut (shortcut.id)}
						<tr class="border-b border-[var(--glass-border)] last:border-0">
							<td class="px-4 py-2"><KeyCombo keys={[...shortcut.keys]} /></td>
							<td class="px-4 py-2">{t.shortcutLabels[shortcut.id]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</DocsSection>
</DocsPage>
