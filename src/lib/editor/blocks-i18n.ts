import type { Dict } from '$lib/i18n/dict';
import { locale } from '$lib/i18n/locale.svelte';
import { BLOCKS, type BlockDef, type BlockGroup, type BlockId } from './blocks';

/**
 * Block names and search terms, per language.
 *
 * Kept out of `blocks.ts` on purpose: that file is the *registry* — ids, icons,
 * commands and Markdown behaviour — and it is imported by the documentation
 * pages, which are prerendered on the server and have no interface language.
 * Names belong to the interface, so they live here.
 *
 * The English titles stay in `blocks.ts` as the canonical label: they are what
 * the docs print, and what a bug report will quote.
 */

/**
 * Exported because the documentation needs them too.
 *
 * The docs are prerendered once per language and take their language from the
 * route, while `blockTitle()` below reads the *app's* stored preference — a
 * prerendered page calling that would bake in whatever the build machine
 * happened to default to. Same data, two ways in.
 */
export const BLOCK_TITLES: Dict<Record<BlockId, string>> = {
	en: {
		paragraph: 'Text',
		heading1: 'Heading 1',
		heading2: 'Heading 2',
		heading3: 'Heading 3',
		bulletList: 'Bulleted list',
		orderedList: 'Numbered list',
		taskList: 'Check list',
		blockquote: 'Quote',
		codeBlock: 'Code block',
		table: 'Table',
		image: 'Image',
		voice: 'Voice clip',
		video: 'Video',
		audio: 'Audio',
		file: 'File',
		embed: 'Embed link',
		'callout-note': 'Note callout',
		'callout-warning': 'Warning callout',
		'callout-tip': 'Tip callout',
		toggle: 'Toggle',
		columns: 'Columns',
		mermaid: 'Diagram',
		math: 'Formula',
		horizontalRule: 'Divider'
	},
	id: {
		paragraph: 'Teks',
		heading1: 'Judul 1',
		heading2: 'Judul 2',
		heading3: 'Judul 3',
		bulletList: 'Daftar berpoin',
		orderedList: 'Daftar bernomor',
		taskList: 'Daftar centang',
		blockquote: 'Kutipan',
		codeBlock: 'Blok kode',
		table: 'Tabel',
		image: 'Gambar',
		voice: 'Klip suara',
		video: 'Video',
		audio: 'Audio',
		file: 'Berkas',
		embed: 'Sematkan tautan',
		'callout-note': 'Kotak catatan',
		'callout-warning': 'Kotak peringatan',
		'callout-tip': 'Kotak tips',
		toggle: 'Lipatan',
		columns: 'Kolom',
		mermaid: 'Diagram',
		math: 'Rumus',
		horizontalRule: 'Pembatas'
	}
};

/**
 * Extra search terms per language, *added to* the English ones rather than
 * replacing them.
 *
 * Someone using the Indonesian interface still types `/table` half the time —
 * the syntax and most tutorials are English, and taking that away would make
 * the menu harder to use, not easier.
 */
const EXTRA_KEYWORDS: Dict<Partial<Record<BlockId, string[]>>> = {
	en: {},
	id: {
		paragraph: ['teks', 'paragraf', 'biasa'],
		heading1: ['judul', 'tajuk'],
		heading2: ['judul', 'subjudul'],
		heading3: ['judul', 'subjudul'],
		bulletList: ['daftar', 'poin', 'butir'],
		orderedList: ['daftar', 'nomor', 'urut', 'langkah'],
		taskList: ['centang', 'tugas', 'ceklis'],
		blockquote: ['kutipan', 'kutip'],
		codeBlock: ['kode', 'cuplikan'],
		table: ['tabel', 'baris', 'kolom'],
		image: ['gambar', 'foto', 'unggah'],
		voice: ['suara', 'rekam', 'dikte', 'transkrip'],
		video: ['video', 'klip', 'film'],
		audio: ['audio', 'suara', 'musik', 'rekaman'],
		file: ['berkas', 'lampiran', 'dokumen', 'unduh'],
		embed: ['sematkan', 'tautan', 'video'],
		'callout-note': ['kotak', 'catatan', 'info'],
		'callout-warning': ['kotak', 'peringatan', 'awas', 'bahaya'],
		'callout-tip': ['kotak', 'tips', 'saran', 'ide'],
		toggle: ['lipat', 'lipatan', 'rincian', 'sembunyi'],
		columns: ['kolom', 'berdampingan', 'tata letak'],
		mermaid: ['diagram', 'bagan', 'alur'],
		math: ['rumus', 'matematika', 'persamaan'],
		horizontalRule: ['pembatas', 'garis', 'pemisah']
	}
};

export const BLOCK_GROUPS: Dict<Record<BlockGroup, string>> = {
	en: { basic: 'Basic', advanced: 'Advanced' },
	id: { basic: 'Dasar', advanced: 'Lanjutan' }
};

/** The block's name in the current interface language. */
export function blockTitle(block: BlockDef): string {
	return BLOCK_TITLES[locale.current][block.id];
}

export function groupLabel(group: BlockGroup): string {
	return BLOCK_GROUPS[locale.current][group];
}

/**
 * Blocks matching a slash-menu query, best match first.
 *
 * Ranking matters more than it looks: Table lists "columns" as a keyword, so an
 * unranked filter put Table above Columns and `/columns` + Enter inserted a
 * table. A title match must always beat a keyword match.
 *
 * Both languages are searched at once, so `/table` and `/tabel` both work
 * whichever interface language is set.
 */
export function searchBlocks(query: string): BlockDef[] {
	const q = query.trim().toLowerCase();
	if (!q) return BLOCKS;

	const score = (block: BlockDef): number => {
		const titles = [block.title, blockTitle(block)].map((value) => value.toLowerCase());
		if (titles.some((title) => title === q)) return 0;
		if (titles.some((title) => title.startsWith(q))) return 1;
		if (titles.some((title) => title.includes(q))) return 2;
		const keywords = [...block.keywords, ...(EXTRA_KEYWORDS[locale.current][block.id] ?? [])];
		if (keywords.some((keyword) => keyword === q)) return 3;
		if (keywords.some((keyword) => keyword.startsWith(q))) return 4;
		if (keywords.some((keyword) => keyword.includes(q))) return 5;
		return Number.POSITIVE_INFINITY;
	};

	return (
		BLOCKS.map((block, index) => ({ block, rank: score(block), index }))
			.filter((entry) => entry.rank !== Number.POSITIVE_INFINITY)
			// Registry order breaks ties, so equally-good matches stay predictable.
			.sort((a, b) => a.rank - b.rank || a.index - b.index)
			.map((entry) => entry.block)
	);
}
