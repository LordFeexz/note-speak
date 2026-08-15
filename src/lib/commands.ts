import ListViewIcon from '@hugeicons/core-free-icons/ListViewIcon';
import Menu02Icon from '@hugeicons/core-free-icons/Menu02Icon';
import GridViewIcon from '@hugeicons/core-free-icons/GridViewIcon';
import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
import KanbanIcon from '@hugeicons/core-free-icons/KanbanIcon';
import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
import FolderAddIcon from '@hugeicons/core-free-icons/FolderAddIcon';
import Database02Icon from '@hugeicons/core-free-icons/Database02Icon';
import KeyboardIcon from '@hugeicons/core-free-icons/KeyboardIcon';
import Globe02Icon from '@hugeicons/core-free-icons/Globe02Icon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import MicrophoneIcon from '@hugeicons/core-free-icons/Mic01Icon';
import ArrowUpDownIcon from '@hugeicons/core-free-icons/ArrowUpDownIcon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';

import { notes, LIST_LAYOUTS, type ListLayout, type SortBy } from '$lib/stores/notes.svelte';
import { LANGS, LANG_LABELS, type Lang } from '$lib/i18n/lang';
import { locale } from '$lib/i18n/locale.svelte';
import type { Dict } from '$lib/i18n/dict';

/**
 * Everything the ⌘K palette can do.
 *
 * A registry rather than markup, for one reason that matters: these actions
 * already exist, scattered across the folder rail's footer, the list header's
 * two unlabelled icon buttons, and a keyboard shortcut nobody has been told
 * about. The palette is a second route to them, so it must not re-implement
 * them — every `run` below calls the same code the original control calls.
 *
 * Labels are `Dict` values like everywhere else, so a missing Indonesian string
 * fails `bun run check` rather than shipping.
 */

/** What the palette needs from the page, since these live in component state. */
export type CommandContext = {
	createNote: () => void;
	selectFolder: (folderId: string | null | 'trash') => void;
	selectNote: (noteId: string) => void;
	openShortcuts: () => void;
	openBackup: () => void;
	openNewFolder: () => void;
	toggleDictation: () => void;
	toggleTheme: () => void;
	speechSupported: boolean;
	listening: boolean;
};

export type CommandGroup = 'create' | 'view' | 'go' | 'app';

export type Command = {
	id: string;
	group: CommandGroup;
	label: string;
	/** Extra words that should match this command, in the current language. */
	keywords: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hugeicons ships no icon type
	icon: any;
	/** Shown right-aligned: the current value of a setting, or a shortcut. */
	hint?: string;
	run: () => void;
};

const GROUP_LABELS: Dict<Record<CommandGroup, string>> = {
	en: { create: 'Create', view: 'View', go: 'Go to', app: 'App' },
	id: { create: 'Buat', view: 'Tampilan', go: 'Buka', app: 'Aplikasi' }
};

const DICT: Dict<{
	newNote: string;
	newFolder: string;
	layout: (label: string) => string;
	sort: (label: string) => string;
	layoutLabels: Record<ListLayout, string>;
	sortLabels: Record<SortBy, string>;
	allNotes: string;
	trash: string;
	theme: string;
	language: (label: string) => string;
	backup: string;
	shortcuts: string;
	startDictation: string;
	stopDictation: string;
	keywords: Record<string, string[]>;
}> = {
	en: {
		newNote: 'New note',
		newFolder: 'New folder',
		layout: (label) => `Layout: ${label}`,
		sort: (label) => `Sort by ${label}`,
		layoutLabels: {
			rows: 'Rows',
			compact: 'Compact',
			grid: 'Grid',
			grouped: 'Grouped',
			board: 'Board'
		},
		sortLabels: { updated: 'Date edited', created: 'Date created', title: 'Title' },
		allNotes: 'All Notes',
		trash: 'Trash',
		theme: 'Toggle dark mode',
		language: (label) => `Language: ${label}`,
		backup: 'Backup & Restore',
		shortcuts: 'Keyboard shortcuts',
		startDictation: 'Start dictation',
		stopDictation: 'Stop dictation',
		keywords: {
			newNote: ['create', 'add', 'compose', 'write'],
			newFolder: ['create', 'add', 'directory'],
			goFolder: ['folder', 'open', 'go to'],
			layout: ['view', 'display', 'list', 'appearance'],
			sort: ['order', 'arrange'],
			allNotes: ['home', 'everything', 'inbox'],
			trash: ['deleted', 'bin', 'removed'],
			theme: ['dark', 'light', 'appearance', 'colour', 'color'],
			language: ['locale', 'translate', 'indonesian', 'english'],
			backup: ['export', 'import', 'restore', 'download'],
			shortcuts: ['keys', 'keyboard', 'help'],
			dictation: ['voice', 'speak', 'microphone', 'record', 'transcribe'],
			note: ['open', 'find']
		}
	},
	id: {
		newNote: 'Catatan baru',
		newFolder: 'Folder baru',
		layout: (label) => `Tata letak: ${label}`,
		sort: (label) => `Urutkan menurut ${label}`,
		layoutLabels: {
			rows: 'Baris',
			compact: 'Ringkas',
			grid: 'Kisi',
			grouped: 'Dikelompokkan',
			board: 'Papan'
		},
		sortLabels: { updated: 'Tanggal diubah', created: 'Tanggal dibuat', title: 'Judul' },
		allNotes: 'Semua Catatan',
		trash: 'Sampah',
		theme: 'Alihkan mode gelap',
		language: (label) => `Bahasa: ${label}`,
		backup: 'Cadangkan & Pulihkan',
		shortcuts: 'Pintasan papan ketik',
		startDictation: 'Mulai dikte',
		stopDictation: 'Hentikan dikte',
		keywords: {
			newNote: ['buat', 'tambah', 'tulis'],
			newFolder: ['buat', 'tambah', 'direktori'],
			goFolder: ['folder', 'buka', 'pergi ke'],
			layout: ['tampilan', 'tampilkan', 'daftar'],
			sort: ['urutan', 'susun'],
			allNotes: ['beranda', 'semua', 'kotak masuk'],
			trash: ['dihapus', 'tong sampah'],
			theme: ['gelap', 'terang', 'tema', 'warna'],
			language: ['bahasa', 'terjemah', 'inggris', 'indonesia'],
			backup: ['ekspor', 'impor', 'pulihkan', 'unduh'],
			shortcuts: ['tombol', 'papan ketik', 'bantuan'],
			dictation: ['suara', 'bicara', 'mikrofon', 'rekam'],
			note: ['buka', 'cari']
		}
	}
};

export function groupLabel(group: CommandGroup): string {
	return GROUP_LABELS[locale.current][group];
}

/**
 * The commands available right now.
 *
 * Rebuilt on each call rather than cached, because half of them describe live
 * state — which layout is active, whether dictation is running — and a stale
 * hint is worse than no hint.
 */
export function buildCommands(ctx: CommandContext): Command[] {
	const t = DICT[locale.current];
	const layout = notes.prefs.listLayout ?? 'rows';
	const sortBy = notes.prefs.sortBy ?? 'updated';
	const out: Command[] = [
		{
			id: 'note.new',
			group: 'create',
			label: t.newNote,
			keywords: t.keywords.newNote,
			icon: NoteAddIcon,
			run: ctx.createNote
		},
		{
			id: 'folder.new',
			group: 'create',
			label: t.newFolder,
			keywords: t.keywords.newFolder,
			icon: FolderAddIcon,
			run: ctx.openNewFolder
		}
	];

	const LAYOUT_ICONS: Record<ListLayout, unknown> = {
		rows: ListViewIcon,
		compact: Menu02Icon,
		grid: GridViewIcon,
		grouped: Calendar03Icon,
		board: KanbanIcon
	};
	for (const value of LIST_LAYOUTS) {
		out.push({
			id: `layout.${value}`,
			group: 'view',
			label: t.layout(t.layoutLabels[value]),
			keywords: [...t.keywords.layout, t.layoutLabels[value]],
			icon: LAYOUT_ICONS[value],
			hint: layout === value ? '✓' : undefined,
			run: () => notes.setPref('listLayout', value)
		});
	}

	for (const value of ['updated', 'created', 'title'] as SortBy[]) {
		out.push({
			id: `sort.${value}`,
			group: 'view',
			label: t.sort(t.sortLabels[value]),
			keywords: [...t.keywords.sort, t.sortLabels[value]],
			icon: ArrowUpDownIcon,
			hint: sortBy === value ? '✓' : undefined,
			run: () => notes.setPref('sortBy', value)
		});
	}

	out.push(
		{
			id: 'go.all',
			group: 'go',
			label: t.allNotes,
			keywords: t.keywords.allNotes,
			icon: Note01Icon,
			run: () => ctx.selectFolder(null)
		},
		{
			id: 'go.trash',
			group: 'go',
			label: t.trash,
			keywords: t.keywords.trash,
			icon: Delete02Icon,
			run: () => ctx.selectFolder('trash')
		}
	);

	for (const folder of notes.folders) {
		out.push({
			id: `go.folder.${folder.id}`,
			group: 'go',
			label: folder.name,
			// Navigation words, not creation ones. Borrowing `newFolder`'s keywords
			// made typing "create" list every existing folder beside the two commands
			// that actually create something — each drawn with the add-folder icon.
			keywords: t.keywords.goFolder,
			icon: Folder01Icon,
			run: () => ctx.selectFolder(folder.id)
		});
	}

	if (ctx.speechSupported) {
		out.push({
			id: 'dictation.toggle',
			group: 'app',
			label: ctx.listening ? t.stopDictation : t.startDictation,
			keywords: t.keywords.dictation,
			icon: MicrophoneIcon,
			run: ctx.toggleDictation
		});
	}

	out.push({
		id: 'theme.toggle',
		group: 'app',
		label: t.theme,
		keywords: t.keywords.theme,
		icon: Moon02Icon,
		run: ctx.toggleTheme
	});

	// Only the languages you are not already in — "switch to the language you are
	// reading" is a command that does nothing.
	for (const lang of LANGS.filter((value: Lang) => value !== locale.current)) {
		out.push({
			id: `language.${lang}`,
			group: 'app',
			label: t.language(LANG_LABELS[lang]),
			keywords: [...t.keywords.language, LANG_LABELS[lang]],
			icon: Globe02Icon,
			run: () => locale.set(lang)
		});
	}

	out.push(
		{
			id: 'app.backup',
			group: 'app',
			label: t.backup,
			keywords: t.keywords.backup,
			icon: Database02Icon,
			run: ctx.openBackup
		},
		{
			id: 'app.shortcuts',
			group: 'app',
			label: t.shortcuts,
			keywords: t.keywords.shortcuts,
			icon: KeyboardIcon,
			run: ctx.openShortcuts
		}
	);

	return out;
}

/** Words that should match a note, beyond its title. */
export function noteKeywords(): string[] {
	return DICT[locale.current].keywords.note;
}
