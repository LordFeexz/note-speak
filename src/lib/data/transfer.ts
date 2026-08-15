import { zipSync, strToU8 } from 'fflate';
import { noteTitle, type Folder, type Note } from '$lib/types';

/**
 * Backup and restore.
 *
 * Notes live in one browser's IndexedDB, which clearing site data wipes without
 * warning. Until sharing exists this file is the *only* way a note survives the
 * loss of its browser, so the JSON envelope is deliberately full-fidelity: it
 * round-trips every field, not just the text.
 */

export const EXPORT_APP = 'note-speak';
export const EXPORT_VERSION = 1;

export type Backup = {
	app: typeof EXPORT_APP;
	version: number;
	exportedAt: number;
	notes: Note[];
	folders: Folder[];
};

export type ImportSummary = {
	added: number;
	updated: number;
	skipped: number;
	folders: number;
};

/** Strip characters that are illegal or awkward in a filename, keeping it readable. */
function safeFilename(name: string, fallback: string): string {
	const cleaned = name
		.replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
	return cleaned || fallback;
}

function stamp(ts: number): string {
	const d = new Date(ts);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildBackup(notes: Note[], folders: Folder[]): Backup {
	return {
		app: EXPORT_APP,
		version: EXPORT_VERSION,
		exportedAt: Date.now(),
		notes,
		folders
	};
}

/** Trigger a browser download. Works on iOS, unlike the File System Access API. */
export function download(filename: string, data: BlobPart, type: string) {
	const url = URL.createObjectURL(new Blob([data], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Revoking synchronously cancels the download in Safari; give it a tick.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function exportJson(notes: Note[], folders: Folder[]) {
	const backup = buildBackup(notes, folders);
	download(
		`note-speak-${stamp(backup.exportedAt)}.json`,
		JSON.stringify(backup, null, 2),
		'application/json'
	);
}

export function exportNoteMarkdown(note: Note) {
	download(`${safeFilename(noteTitle(note), 'note')}.md`, note.body, 'text/markdown');
}

/**
 * Everything as a zip: one markdown file per note, foldered, plus the JSON
 * envelope so the archive is also a complete restore point.
 */
export function exportAllZip(notes: Note[], folders: Folder[]) {
	const folderName = new Map(folders.map((f) => [f.id, safeFilename(f.name, 'Folder')]));
	const files: Record<string, Uint8Array> = {};
	const used = new Set<string>();

	for (const note of notes) {
		if (note.deletedAt !== null) continue;
		const dir = note.folderId ? `notes/${folderName.get(note.folderId) ?? 'Folder'}` : 'notes';
		const base = safeFilename(noteTitle(note), 'note');
		// Titles are the first line of the body, so collisions are common.
		let path = `${dir}/${base}.md`;
		let n = 2;
		while (used.has(path)) path = `${dir}/${base} (${n++}).md`;
		used.add(path);
		files[path] = strToU8(note.body);
	}

	files['note-speak.json'] = strToU8(JSON.stringify(buildBackup(notes, folders), null, 2));
	download(`note-speak-${stamp(Date.now())}.zip`, zipSync(files), 'application/zip');
}

/** Why a backup was rejected. The UI turns this into copy in the reader's language. */
export type ImportErrorCode = 'not-json' | 'not-backup' | 'no-notes' | 'newer-version';

/**
 * Carries a code, not a sentence.
 *
 * This module has no idea what language the interface is in, and threading a
 * locale through a parser to build an error string would put translation in the
 * wrong place. The `message` stays English for stack traces and logs.
 */
export class ImportError extends Error {
	readonly code: ImportErrorCode;
	constructor(code: ImportErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}

/** Parse and validate a backup file. Throws `ImportError` carrying a code. */
export function parseBackup(text: string): Backup {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new ImportError('not-json', "That file isn't valid JSON.");
	}
	if (!raw || typeof raw !== 'object') {
		throw new ImportError('not-backup', "That file isn't a Note Speak backup.");
	}
	const backup = raw as Partial<Backup>;
	if (backup.app !== EXPORT_APP) {
		throw new ImportError('not-backup', "That file isn't a Note Speak backup.");
	}
	if (!Array.isArray(backup.notes)) {
		throw new ImportError('no-notes', 'That backup has no notes in it.');
	}
	if (typeof backup.version !== 'number' || backup.version > EXPORT_VERSION) {
		throw new ImportError('newer-version', 'That backup came from a newer version of Note Speak.');
	}
	return {
		app: EXPORT_APP,
		version: backup.version,
		exportedAt: backup.exportedAt ?? Date.now(),
		notes: backup.notes,
		folders: Array.isArray(backup.folders) ? backup.folders : []
	};
}

/**
 * Bring an imported note up to the current shape.
 *
 * A backup can predate any field, so this mirrors the store's migration rather
 * than trusting the file — an old export must not reintroduce a v0 note.
 */
function normalize(note: Note): Note {
	// `tags` was declared on `Note`, written as `[]` in every creation path and
	// read nowhere, so it was removed. Old backups still carry it and must still
	// restore — but stripping it here rather than letting the spread carry it
	// through is the point: a dead field written back into storage is exactly the
	// thing that later gets mistaken for a working one.
	const { tags: _dropped, ...rest } = note as Note & { tags?: unknown };
	void _dropped;
	return {
		...rest,
		pinnedAt: note.pinnedAt ?? null,
		share: note.share ?? null,
		deletedAt: note.deletedAt ?? null
	};
}

/**
 * Merge a backup into the existing collection.
 *
 * Same id wins by `updatedAt`, so importing an older backup over newer edits is
 * a no-op rather than data loss — the failure mode people actually hit.
 */
export function mergeBackup(
	current: { notes: Note[]; folders: Folder[] },
	backup: Backup
): { notes: Note[]; folders: Folder[]; summary: ImportSummary } {
	const notes = [...current.notes];
	const byId = new Map(notes.map((n, i) => [n.id, i]));
	const summary: ImportSummary = { added: 0, updated: 0, skipped: 0, folders: 0 };

	for (const incoming of backup.notes.map(normalize)) {
		const index = byId.get(incoming.id);
		if (index === undefined) {
			notes.push(incoming);
			byId.set(incoming.id, notes.length - 1);
			summary.added++;
		} else if (incoming.updatedAt > notes[index].updatedAt) {
			notes[index] = incoming;
			summary.updated++;
		} else {
			summary.skipped++;
		}
	}

	const folders = [...current.folders];
	const folderIds = new Set(folders.map((f) => f.id));
	for (const folder of backup.folders) {
		if (folderIds.has(folder.id)) continue;
		folders.push(folder);
		folderIds.add(folder.id);
		summary.folders++;
	}

	return { notes, folders, summary };
}

/** Wholesale replacement, for restoring onto a fresh device. */
export function replaceWithBackup(backup: Backup): {
	notes: Note[];
	folders: Folder[];
	summary: ImportSummary;
} {
	const notes = backup.notes.map(normalize);
	return {
		notes,
		folders: backup.folders,
		summary: { added: notes.length, updated: 0, skipped: 0, folders: backup.folders.length }
	};
}
