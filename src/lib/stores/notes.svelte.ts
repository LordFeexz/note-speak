import { get, set } from 'idb-keyval';
import { noteTitle, type Folder, type Note } from '$lib/types';

const NOTES_KEY = 'note-speak:notes';
const FOLDERS_KEY = 'note-speak:folders';
const PREFS_KEY = 'note-speak:prefs';

type Prefs = {
	/** User dismissed the "voice not supported on this browser" banner. */
	speechBannerDismissed?: boolean;
	/** BCP-47 tag last used for dictation. */
	speechLang?: string;
};

function uid() {
	return crypto.randomUUID();
}

const WELCOME_BODY = `Welcome to Note Speak
Everything here stays on this device — notes are saved to your browser's storage and never sent anywhere.

Tap the microphone to dictate instead of typing. Press ⌘N for a new note and ⌘⇧D to start dictating.`;

/**
 * Single source of truth for notes, folders and preferences.
 * Writes are debounced because dictation mutates the body many times a second.
 */
class NotesStore {
	notes = $state<Note[]>([]);
	folders = $state<Folder[]>([]);
	prefs = $state<Prefs>({});
	query = $state('');
	loaded = $state(false);

	#timer: ReturnType<typeof setTimeout> | undefined;

	async load() {
		if (this.loaded) return;
		const [notes, folders, prefs] = await Promise.all([
			get<Note[]>(NOTES_KEY),
			get<Folder[]>(FOLDERS_KEY),
			get<Prefs>(PREFS_KEY)
		]);
		this.folders = folders ?? [];
		this.prefs = prefs ?? {};
		if (notes) {
			// An explicitly emptied list stays empty — only a *missing* key seeds.
			this.notes = notes;
			this.loaded = true;
		} else {
			const now = Date.now();
			this.notes = [
				{
					id: uid(),
					folderId: null,
					body: WELCOME_BODY,
					createdAt: now,
					updatedAt: now,
					deletedAt: null
				}
			];
			this.loaded = true;
			this.flush();
		}
	}

	#persist() {
		if (!this.loaded) return;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => {
			// $state.snapshot strips proxies — structured clone can't serialise them.
			void set(NOTES_KEY, $state.snapshot(this.notes));
			void set(FOLDERS_KEY, $state.snapshot(this.folders));
		}, 250);
	}

	/**
	 * Flush pending writes immediately (used on pagehide/visibilitychange).
	 * Never runs before `load()` finishes — an early flush would persist the empty
	 * initial arrays over the user's real notes.
	 */
	flush() {
		if (!this.loaded) return;
		clearTimeout(this.#timer);
		void set(NOTES_KEY, $state.snapshot(this.notes));
		void set(FOLDERS_KEY, $state.snapshot(this.folders));
	}

	setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
		this.prefs = { ...this.prefs, [key]: value };
		void set(PREFS_KEY, $state.snapshot(this.prefs));
	}

	// ---- notes ----

	createNote(folderId: string | null): Note {
		const now = Date.now();
		const note: Note = {
			id: uid(),
			folderId,
			body: '',
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		this.notes = [note, ...this.notes];
		this.#persist();
		return note;
	}

	getNote(id: string | null): Note | undefined {
		if (!id) return undefined;
		return this.notes.find((n) => n.id === id);
	}

	updateBody(id: string, body: string) {
		const note = this.notes.find((n) => n.id === id);
		if (!note || note.body === body) return;
		note.body = body;
		note.updatedAt = Date.now();
		this.#persist();
	}

	moveNote(id: string, folderId: string | null) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.folderId = folderId;
		note.updatedAt = Date.now();
		this.#persist();
	}

	trashNote(id: string) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.deletedAt = Date.now();
		this.#persist();
	}

	restoreNote(id: string) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.deletedAt = null;
		note.updatedAt = Date.now();
		this.#persist();
	}

	purgeNote(id: string) {
		this.notes = this.notes.filter((n) => n.id !== id);
		this.#persist();
	}

	emptyTrash() {
		this.notes = this.notes.filter((n) => n.deletedAt === null);
		this.#persist();
	}

	// ---- folders ----

	createFolder(name: string): Folder {
		const folder: Folder = { id: uid(), name: name.trim() || 'New Folder', createdAt: Date.now() };
		this.folders = [...this.folders, folder];
		this.#persist();
		return folder;
	}

	renameFolder(id: string, name: string) {
		const folder = this.folders.find((f) => f.id === id);
		if (!folder) return;
		folder.name = name.trim() || folder.name;
		this.#persist();
	}

	/** Deletes the folder; its notes fall back to All Notes rather than disappearing. */
	deleteFolder(id: string) {
		this.folders = this.folders.filter((f) => f.id !== id);
		for (const note of this.notes) {
			if (note.folderId === id) note.folderId = null;
		}
		this.#persist();
	}

	// ---- derived views ----

	get activeNotes() {
		return this.notes.filter((n) => n.deletedAt === null);
	}

	get trashedNotes() {
		return this.notes.filter((n) => n.deletedAt !== null);
	}

	countIn(folderId: string | null | 'trash') {
		if (folderId === 'trash') return this.trashedNotes.length;
		if (folderId === null) return this.activeNotes.length;
		return this.activeNotes.filter((n) => n.folderId === folderId).length;
	}

	/** Notes for the current folder, filtered by the search query, newest first. */
	listFor(folderId: string | null | 'trash'): Note[] {
		const base =
			folderId === 'trash'
				? this.trashedNotes
				: folderId === null
					? this.activeNotes
					: this.activeNotes.filter((n) => n.folderId === folderId);

		const q = this.query.trim().toLowerCase();
		const filtered = q
			? base.filter(
					(n) => n.body.toLowerCase().includes(q) || noteTitle(n).toLowerCase().includes(q)
				)
			: base;

		return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
	}
}

export const notes = new NotesStore();
