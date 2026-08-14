import { resolve } from '$app/paths';
import type { Dict } from '$lib/i18n/dict';
import type { Lang } from '$lib/i18n/lang';

/**
 * The documentation's table of contents, in one place.
 *
 * Page titles, ledes, `<title>` text, section anchors and prev/next all come
 * from here, so a page cannot end up with a contents list that disagrees with
 * its own headings — the two are the same data.
 */

export const DOCS_UPDATED: Dict<string> = {
	en: '13 August 2026',
	id: '13 Agustus 2026'
};

export type DocSlug = '' | 'blocks' | 'voice' | 'sharing' | 'notes';

export type DocSection = { id: string; title: Dict<string> };

export type DocPage = {
	slug: DocSlug;
	/** Label in the sidebar and the hub cards. */
	nav: Dict<string>;
	heading: Dict<string>;
	lede: Dict<string>;
	metaTitle: Dict<string>;
	metaDescription: Dict<string>;
	sections: DocSection[];
};

export const DOC_PAGES: DocPage[] = [
	{
		slug: '',
		nav: { en: 'Overview', id: 'Ringkasan' },
		heading: { en: 'Note Speak documentation', id: 'Dokumentasi Note Speak' },
		lede: {
			en: 'Everything the app does, how to do it, and the handful of things it deliberately cannot do.',
			id: 'Semua yang bisa dilakukan aplikasi ini, cara memakainya, dan beberapa hal yang memang sengaja tidak bisa dilakukannya.'
		},
		metaTitle: { en: 'Documentation — Note Speak', id: 'Dokumentasi — Note Speak' },
		metaDescription: {
			en: 'How to use Note Speak: dictation, every editor block with examples, sharing, workspaces, version history and backups.',
			id: 'Cara memakai Note Speak: dikte, setiap blok editor beserta contohnya, berbagi, ruang kerja, riwayat versi, dan cadangan.'
		},
		sections: [
			{ id: 'start', title: { en: 'Five-minute start', id: 'Mulai dalam lima menit' } },
			{ id: 'guides', title: { en: 'Guides', id: 'Panduan' } },
			{ id: 'block-index', title: { en: 'Every block', id: 'Semua blok' } },
			{ id: 'limits', title: { en: 'What it cannot do', id: 'Yang tidak bisa dilakukannya' } }
		]
	},
	{
		slug: 'blocks',
		nav: { en: 'Blocks', id: 'Blok' },
		heading: { en: 'Blocks', id: 'Blok' },
		lede: {
			en: 'Every block you can insert, the Markdown it becomes, and what it looks like in the editor. Notes are stored as plain Markdown, so all of this stays readable anywhere else.',
			id: 'Setiap blok yang bisa Anda sisipkan, Markdown yang dihasilkannya, dan tampilannya di editor. Catatan disimpan sebagai Markdown biasa, jadi semuanya tetap terbaca di aplikasi lain.'
		},
		metaTitle: { en: 'Blocks — Note Speak docs', id: 'Blok — dokumentasi Note Speak' },
		metaDescription: {
			en: 'Every Note Speak editor block with its Markdown syntax and a rendered example: headings, lists, tables, callouts, media, diagrams and formulas.',
			id: 'Setiap blok editor Note Speak beserta sintaks Markdown dan contoh tampilannya: judul, daftar, tabel, kotak catatan, media, diagram, dan rumus.'
		},
		sections: [
			{ id: 'how', title: { en: 'Three ways to insert', id: 'Tiga cara menyisipkan' } },
			{ id: 'basic', title: { en: 'Basic blocks', id: 'Blok dasar' } },
			{ id: 'advanced', title: { en: 'Advanced blocks', id: 'Blok lanjutan' } },
			{ id: 'inline', title: { en: 'Inline syntax', id: 'Sintaks sebaris' } },
			{
				id: 'block-limits',
				title: { en: 'Limits worth knowing', id: 'Batasan yang perlu diketahui' }
			}
		]
	},
	{
		slug: 'voice',
		nav: { en: 'Voice', id: 'Suara' },
		heading: { en: 'Dictation', id: 'Dikte' },
		lede: {
			en: 'Speak instead of typing, including the punctuation. This is also the one feature that sends anything off your device, so it is worth reading to the end.',
			id: 'Bicara alih-alih mengetik, lengkap dengan tanda bacanya. Ini juga satu-satunya fitur yang mengirim sesuatu keluar dari perangkat Anda, jadi bacalah sampai habis.'
		},
		metaTitle: { en: 'Dictation — Note Speak docs', id: 'Dikte — dokumentasi Note Speak' },
		metaDescription: {
			en: 'How dictation works in Note Speak: spoken punctuation commands in English and Indonesian, supported languages, auto-capitalize, and the privacy caveat.',
			id: 'Cara kerja dikte di Note Speak: perintah tanda baca lisan dalam bahasa Inggris dan Indonesia, bahasa yang didukung, kapital otomatis, dan catatan privasinya.'
		},
		sections: [
			{ id: 'basics', title: { en: 'Dictating', id: 'Mendikte' } },
			{ id: 'commands', title: { en: 'Spoken punctuation', id: 'Tanda baca lisan' } },
			{ id: 'languages', title: { en: 'Languages', id: 'Bahasa' } },
			{ id: 'clips', title: { en: 'Voice clips', id: 'Klip suara' } },
			{ id: 'privacy', title: { en: 'Where the audio goes', id: 'Ke mana audionya pergi' } },
			{ id: 'trouble', title: { en: 'When it will not start', id: 'Kalau dikte tidak mau mulai' } }
		]
	},
	{
		slug: 'sharing',
		nav: { en: 'Sharing', id: 'Berbagi' },
		heading: { en: 'Sharing and workspaces', id: 'Berbagi dan ruang kerja' },
		lede: {
			en: 'Send a link to one note, or share a whole list with a passphrase. Both connect devices directly, with no copy on any server — which is the strength and the catch.',
			id: 'Kirim tautan untuk satu catatan, atau bagikan seluruh daftar dengan frasa sandi. Keduanya menghubungkan perangkat secara langsung, tanpa salinan di server mana pun — di situlah kekuatannya sekaligus konsekuensinya.'
		},
		metaTitle: {
			en: 'Sharing and workspaces — Note Speak docs',
			id: 'Berbagi dan ruang kerja — dokumentasi Note Speak'
		},
		metaDescription: {
			en: 'Share a Note Speak note with an edit or view-only link, or set up a passphrase-protected workspace. How it works peer-to-peer, and what it cannot do.',
			id: 'Bagikan catatan Note Speak lewat tautan sunting atau hanya-baca, atau buat ruang kerja berfrasa sandi. Cara kerjanya antar perangkat, dan batasannya.'
		},
		sections: [
			{ id: 'one-note', title: { en: 'Sharing one note', id: 'Membagikan satu catatan' } },
			{
				id: 'roles',
				title: { en: 'Edit and view-only links', id: 'Tautan sunting dan hanya-baca' }
			},
			{ id: 'workspaces', title: { en: 'Workspaces', id: 'Ruang kerja' } },
			{ id: 'joining', title: { en: 'Inviting and joining', id: 'Mengundang dan bergabung' } },
			{ id: 'availability', title: { en: 'Who has to be online', id: 'Siapa yang harus online' } },
			{
				id: 'sharing-limits',
				title: { en: 'What sharing cannot do', id: 'Yang tidak bisa dilakukan' }
			}
		]
	},
	{
		slug: 'notes',
		nav: { en: 'Notes & files', id: 'Catatan & berkas' },
		heading: { en: 'Organising, history and backups', id: 'Menata, riwayat, dan cadangan' },
		lede: {
			en: 'Folders, search, version history, exports and installing the app — the everyday mechanics around the writing.',
			id: 'Folder, pencarian, riwayat versi, ekspor, dan memasang aplikasinya — mekanisme sehari-hari di sekitar aktivitas menulis.'
		},
		metaTitle: {
			en: 'Organising, history and backups — Note Speak docs',
			id: 'Menata, riwayat, dan cadangan — dokumentasi Note Speak'
		},
		metaDescription: {
			en: 'Folders, pinning, the five note-list layouts, search, sorting, note links, version history, backup and restore, keyboard shortcuts and installing Note Speak.',
			id: 'Folder, sematan, lima tata letak daftar catatan, pencarian, pengurutan, tautan antar catatan, riwayat versi, cadangan dan pemulihan, pintasan papan ketik, dan memasang Note Speak.'
		},
		sections: [
			{ id: 'organise', title: { en: 'Folders and pins', id: 'Folder dan sematan' } },
			{ id: 'layouts', title: { en: 'List layouts', id: 'Tata letak daftar' } },
			{ id: 'search', title: { en: 'Search and sorting', id: 'Pencarian dan pengurutan' } },
			{ id: 'links', title: { en: 'Linking notes', id: 'Menautkan catatan' } },
			{ id: 'history', title: { en: 'Version history', id: 'Riwayat versi' } },
			{ id: 'trash', title: { en: 'Trash', id: 'Sampah' } },
			{ id: 'backup', title: { en: 'Backup and restore', id: 'Cadangan dan pemulihan' } },
			{ id: 'install', title: { en: 'Installing and offline', id: 'Memasang dan mode offline' } },
			{ id: 'shortcuts', title: { en: 'Keyboard shortcuts', id: 'Pintasan papan ketik' } }
		]
	}
];

/**
 * `/en/docs`, `/id/docs/blocks`, … — the one place a docs URL is built.
 *
 * Through `resolve()` so the route ids are checked at compile time: a page
 * renamed without updating this would fail the build rather than shipping a
 * sidebar full of 404s.
 */
export function docHref(lang: Lang, slug: DocSlug): string {
	switch (slug) {
		case 'blocks':
			return resolve('/(marketing)/[lang=lang]/docs/blocks', { lang });
		case 'voice':
			return resolve('/(marketing)/[lang=lang]/docs/voice', { lang });
		case 'sharing':
			return resolve('/(marketing)/[lang=lang]/docs/sharing', { lang });
		case 'notes':
			return resolve('/(marketing)/[lang=lang]/docs/notes', { lang });
		default:
			return resolve('/(marketing)/[lang=lang]/docs', { lang });
	}
}

export function pageFor(slug: DocSlug): DocPage {
	const page = DOC_PAGES.find((entry) => entry.slug === slug);
	if (!page) throw new Error(`No docs page registered for slug "${slug}"`);
	return page;
}

export function neighbours(slug: DocSlug): { prev?: DocPage; next?: DocPage } {
	const index = DOC_PAGES.findIndex((entry) => entry.slug === slug);
	return { prev: DOC_PAGES[index - 1], next: DOC_PAGES[index + 1] };
}
