import type { Dict } from '$lib/i18n/dict';
import type { Lang } from '$lib/i18n/lang';
import { BLOCKS, type BlockGroup, type BlockId } from '$lib/editor/blocks';
import { BLOCK_GROUPS, BLOCK_TITLES } from '$lib/editor/blocks-i18n';

/**
 * What the documentation says about each block.
 *
 * `markdown` is the literal text the app writes for that block — not an
 * approximation. The verification suite feeds every one of these strings through
 * the real editor and asserts both that it produces the block it claims and that
 * it round-trips unchanged, so a snippet here cannot teach syntax the app would
 * rewrite.
 */

export type BlockDoc = {
	/** Exactly what the app stores. Copy-pasteable. */
	markdown: string;
	/** How you reach it: the slash command, or the syntax that triggers it. */
	insert: string;
	description: Dict<string>;
	/** A limit worth stating on the card itself rather than further down. */
	caveat?: Dict<string>;
};

export const BLOCK_DOCS: Record<BlockId, BlockDoc> = {
	paragraph: {
		markdown: 'Just type. A blank line starts a new paragraph.',
		insert: '/text',
		description: {
			en: 'The default. Everything is a paragraph until you make it something else.',
			id: 'Bawaan. Semuanya adalah paragraf sampai Anda mengubahnya menjadi sesuatu yang lain.'
		}
	},
	heading1: {
		markdown: '# Trip planning',
		insert: '# ',
		description: {
			en: 'Typing `# ` at the start of a line converts it. Only three levels exist.',
			id: 'Mengetik `# ` di awal baris akan mengubahnya. Hanya ada tiga tingkat.'
		},
		caveat: {
			en: 'The first line of a note is already its title, so starting a note with a heading repeats it in the list.',
			id: 'Baris pertama catatan sudah menjadi judulnya, jadi mengawali catatan dengan judul akan membuatnya tampil dua kali di daftar.'
		}
	},
	heading2: {
		markdown: '## Flights',
		insert: '## ',
		description: { en: 'A section within a note.', id: 'Bagian di dalam sebuah catatan.' }
	},
	heading3: {
		markdown: '### Return leg',
		insert: '### ',
		description: {
			en: 'The smallest heading. `#### ` does nothing.',
			id: 'Judul terkecil. `#### ` tidak melakukan apa-apa.'
		}
	},
	bulletList: {
		markdown: '* Passport\n* Charger\n* Tickets',
		insert: '/list',
		description: {
			en: 'Typing `- `, `* ` or `+ ` all start one; the note is saved with `*`.',
			id: 'Mengetik `- `, `* `, atau `+ ` sama-sama memulainya; catatannya disimpan memakai `*`.'
		}
	},
	orderedList: {
		markdown: '1. Book the flight\n2. Reserve a room\n3. Pack',
		insert: '1. ',
		description: {
			en: 'Numbers renumber themselves — write `1.` on every line if you prefer.',
			id: 'Nomornya menyusun ulang sendiri — Anda boleh menulis `1.` di setiap baris kalau lebih suka begitu.'
		}
	},
	taskList: {
		markdown: '- [ ] Pack the charger\n\n- [x] Print the tickets',
		insert: '/todo',
		description: {
			en: 'Tick the boxes by tapping them. Sub-items are allowed.',
			id: 'Centang kotaknya dengan mengetuk. Sub-item diperbolehkan.'
		},
		caveat: {
			en: 'Checklists are saved with `-` and bullets with `*`, deliberately: the same marker for both makes Markdown merge them into one broken list.',
			id: 'Daftar centang disimpan dengan `-` dan poin biasa dengan `*`, dan itu disengaja: penanda yang sama untuk keduanya membuat Markdown menggabungkannya menjadi satu daftar yang rusak.'
		}
	},
	blockquote: {
		markdown: '> The best time to plant a tree was twenty years ago.',
		insert: '> ',
		description: {
			en: 'For quoting someone, or setting a line apart.',
			id: 'Untuk mengutip seseorang, atau memisahkan satu baris.'
		}
	},
	codeBlock: {
		markdown: '```js\nconst total = items.length;\n```',
		insert: '```',
		description: {
			en: 'Name the language after the opening fence to keep it readable elsewhere.',
			id: 'Tulis nama bahasanya setelah pagar pembuka agar tetap terbaca di tempat lain.'
		}
	},
	table: {
		markdown: '| Item | Cost |\n| --- | --- |\n| Flight | 320 |\n| Hotel | 180 |',
		insert: '/table',
		description: {
			en: 'Starts as three columns by three rows with a header.',
			id: 'Dimulai dengan tiga kolom kali tiga baris beserta barisan kepala.'
		},
		caveat: {
			en: 'Markdown tables cannot hold merged cells or more than one paragraph per cell. A table that does gets written out as the literal text `[table]`.',
			id: 'Tabel Markdown tidak bisa memuat sel yang digabung atau lebih dari satu paragraf per sel. Tabel semacam itu akan ditulis sebagai teks harfiah `[table]`.'
		}
	},
	image: {
		markdown:
			'![beach.jpg](data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==)',
		insert: '/image',
		description: {
			en: 'Opens the file picker. The picture is stored inside the note itself, so it needs no host and works offline.',
			id: 'Membuka pemilih berkas. Gambarnya disimpan di dalam catatan itu sendiri, jadi tidak perlu hosting dan tetap bekerja offline.'
		},
		caveat: {
			en: 'Images are re-encoded down to about 300 KB before they are inserted; anything over 12 MB is refused outright.',
			id: 'Gambar dikodekan ulang hingga sekitar 300 KB sebelum disisipkan; yang di atas 12 MB langsung ditolak.'
		}
	},
	voice: {
		markdown:
			':::voice{duration="0:12"}\ndata:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC\nPick up the dry cleaning, then call mum.\n:::',
		insert: '/voice',
		description: {
			en: 'Records audio and transcribes it at the same time. The words stay searchable; the audio does not clog up search.',
			id: 'Merekam audio sekaligus mentranskripsinya. Kata-katanya tetap bisa dicari; audionya tidak membebani pencarian.'
		},
		caveat: {
			en: 'Three minutes maximum, and 5 MB — roughly 240 KB per minute.',
			id: 'Maksimal tiga menit, dan 5 MB — kira-kira 240 KB per menit.'
		}
	},
	video: {
		markdown: ':::video{name="holiday.mp4"}\ndata:video/mp4;base64,AAAAIGZ0eXBpc29t\n:::',
		insert: '/video',
		description: {
			en: 'A video file stored inside the note.',
			id: 'Berkas video yang disimpan di dalam catatan.'
		},
		caveat: {
			en: '5 MB maximum, and there is no re-encoding — converting video in the browser would need a library larger than this whole app.',
			id: 'Maksimal 5 MB, dan tidak ada pengodean ulang — mengonversi video di browser butuh pustaka yang lebih besar dari seluruh aplikasi ini.'
		}
	},
	audio: {
		markdown: ':::audio{name="riff.mp3"}\ndata:audio/mpeg;base64,SUQzBAAAAAAA\n:::',
		insert: '/audio',
		description: {
			en: 'An audio file, played inline. 5 MB maximum.',
			id: 'Berkas audio, diputar langsung di tempat. Maksimal 5 MB.'
		}
	},
	file: {
		markdown:
			':::file{name="itinerary.pdf" size="1.2 MB"}\ndata:application/pdf;base64,JVBERi0xLjcK\n:::',
		insert: '/file',
		description: {
			en: 'Any attachment, shown as a download link. 2 MB maximum.',
			id: 'Lampiran apa pun, ditampilkan sebagai tautan unduhan. Maksimal 2 MB.'
		}
	},
	embed: {
		markdown: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		insert: '/embed',
		description: {
			en: 'A URL alone on a line becomes a card. YouTube, Vimeo, Spotify and Instagram get a player; anything else opens in a new tab.',
			id: 'URL yang berdiri sendiri di satu baris akan menjadi kartu. YouTube, Vimeo, Spotify, dan Instagram mendapat pemutar; selainnya terbuka di tab baru.'
		},
		caveat: {
			en: 'Nothing is requested from the platform until you press play — opening the note contacts nobody.',
			id: 'Tidak ada permintaan ke platformnya sampai Anda menekan putar — membuka catatannya tidak menghubungi siapa pun.'
		}
	},
	'callout-note': {
		markdown: ':::note\nCheck the visa rules before booking.\n\n:::',
		insert: '/callout',
		description: {
			en: 'A panel for something the reader should not skim past. The body is ordinary Markdown, so lists and emphasis work inside it.',
			id: 'Panel untuk hal yang sebaiknya tidak dilewati pembaca. Isinya Markdown biasa, jadi daftar dan penekanan tetap berfungsi di dalamnya.'
		}
	},
	'callout-warning': {
		markdown: ':::warning\nThe passport must be valid for six more months.\n\n:::',
		insert: '/warning',
		description: {
			en: 'The same panel, coloured for something that can go wrong.',
			id: 'Panel yang sama, diberi warna untuk hal yang bisa berakibat buruk.'
		}
	},
	'callout-tip': {
		markdown: ':::tip\nBooking on a Tuesday is usually cheaper.\n\n:::',
		insert: '/tip',
		description: { en: 'For advice rather than warnings.', id: 'Untuk saran, bukan peringatan.' }
	},
	toggle: {
		markdown: ':::toggle{summary="Packing list"}\nPassport, charger, adapter.\n\n:::',
		insert: '/toggle',
		description: {
			en: 'Folds a section away behind a heading you choose.',
			id: 'Melipat satu bagian di balik judul yang Anda tentukan.'
		},
		caveat: {
			en: 'Only the heading is saved, not whether it was open — a toggle always comes back open.',
			id: 'Hanya judulnya yang disimpan, bukan status terbuka atau tertutupnya — lipatan selalu kembali dalam keadaan terbuka.'
		}
	},
	columns: {
		markdown: ':::columns\n:::column\nOutbound\n\n:::\n\n:::column\nReturn\n\n:::\n\n:::',
		insert: '/columns',
		description: {
			en: 'Two columns side by side, stacking on a phone. Inserts empty — existing text is not moved into it.',
			id: 'Dua kolom berdampingan, menumpuk di ponsel. Disisipkan dalam keadaan kosong — teks yang sudah ada tidak dipindahkan ke dalamnya.'
		}
	},
	mermaid: {
		markdown: '```mermaid\nflowchart TD\n  A[Start] --> B[Finish]\n```',
		insert: '/diagram',
		description: {
			en: 'An ordinary code block that also draws itself. Because it is only a fenced block, the note stays readable in any other editor.',
			id: 'Blok kode biasa yang sekaligus menggambar dirinya. Karena hanya blok berpagar, catatannya tetap terbaca di editor mana pun.'
		}
	},
	math: {
		markdown: '$$\ne = mc^2\n$$',
		insert: '/formula',
		description: {
			en: 'A formula on its own line, rendered with KaTeX.',
			id: 'Rumus di barisnya sendiri, dirender dengan KaTeX.'
		},
		caveat: {
			en: 'Block form only. Inline `$…$` collides with prices — “$5 and $10” would become a formula.',
			id: 'Hanya bentuk blok. `$…$` sebaris bentrok dengan harga — “$5 dan $10” akan menjadi rumus.'
		}
	},
	horizontalRule: {
		markdown: '---',
		insert: '/divider',
		description: {
			en: 'A horizontal rule, for separating parts of a long note.',
			id: 'Garis horizontal, untuk memisahkan bagian dari catatan yang panjang.'
		}
	}
};

/**
 * Every block in the editor must be documented, and nothing may be documented
 * that the editor does not have.
 *
 * Thrown at module scope, and the documentation renders with SSR on — so a
 * missing entry fails `vite build` with the block's id in the message, rather
 * than shipping a page with a hole in it. A visible "undocumented" badge was the
 * other option; it fails quietly, and somebody ships it.
 */
export function assertCovers(ids: string[], what: string): void {
	const have = new Set(ids);
	const real = BLOCKS.map((block) => block.id);
	const missing = real.filter((id) => !have.has(id));
	const extra = ids.filter((id) => !real.includes(id as BlockId));
	if (missing.length || extra.length) {
		throw new Error(
			`The blocks documentation is out of sync with the editor (${what}).\n` +
				(missing.length ? `  Undocumented blocks: ${missing.join(', ')}\n` : '') +
				(extra.length ? `  Documented but not in BLOCKS: ${extra.join(', ')}\n` : '') +
				`  Fix src/lib/docs/blocks-content.ts and src/lib/docs/block-previews.svelte.`
		);
	}
}

assertCovers(Object.keys(BLOCK_DOCS), 'BLOCK_DOCS');

/** Block name for a *route* language, rather than the app's stored preference. */
export function blockName(id: BlockId, lang: Lang): string {
	return BLOCK_TITLES[lang][id];
}

export function groupLabelFor(group: BlockGroup, lang: Lang): string {
	return BLOCK_GROUPS[lang][group];
}
