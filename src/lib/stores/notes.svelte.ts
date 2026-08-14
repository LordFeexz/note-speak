import { get, set } from 'idb-keyval';
import { noteTitle, searchableText, type Folder, type Note, type ShareInfo } from '$lib/types';
import { locale } from '$lib/i18n/locale.svelte';
import type { Dict } from '$lib/i18n/dict';
import { linkedTitles } from '$lib/editor/wikilink';

const NOTES_KEY = 'note-speak:notes';
const FOLDERS_KEY = 'note-speak:folders';
const PREFS_KEY = 'note-speak:prefs';
const SCHEMA_KEY = 'note-speak:schema';

/** Bump when `Note` gains a field, and add a step to `migrate()`. */
const CURRENT_SCHEMA = 2;

/** Folder ids of the form `ws:<workspaceId>` select a workspace, not a folder. */
export const WORKSPACE_PREFIX = 'ws:';

export function workspacePane(id: string): string {
	return `${WORKSPACE_PREFIX}${id}`;
}

function paneWorkspaceId(folderId: string | null | 'trash'): string | null {
	return typeof folderId === 'string' && folderId.startsWith(WORKSPACE_PREFIX)
		? folderId.slice(WORKSPACE_PREFIX.length)
		: null;
}

type Prefs = {
	/** User dismissed the "voice not supported on this browser" banner. */
	speechBannerDismissed?: boolean;
	/** BCP-47 tag last used for dictation. */
	speechLang?: string;
	/** Map spoken tokens like "titik"/"period" to punctuation while dictating. */
	voiceCommands?: boolean;
	/** Capitalize sentences and tidy spacing in the transcript. */
	autoPunctuate?: boolean;
	/** Note list ordering. Pinned notes lead regardless. */
	sortBy?: SortBy;
	/** How the note list is drawn. Pinned notes lead in every layout. */
	listLayout?: ListLayout;
	/** Anonymous display identity shown to collaborators. Stable across reloads. */
	identity?: { name: string; color: string };
	/**
	 * Recently used dictation languages, most recent first.
	 *
	 * Most people alternate between exactly two, so the top entries get a
	 * one-tap toggle and the full 15-item list stays in the dropdown.
	 */
	recentLangs?: string[];
};

export type SortBy = 'updated' | 'created' | 'title';

export const SORT_LABELS: Record<SortBy, string> = {
	updated: 'Date edited',
	created: 'Date created',
	title: 'Title'
};

/**
 * How the note list is drawn.
 *
 * Every layout renders the same `listFor()` result in the same order — they
 * differ in shape, not in content, which is what keeps a layout switch from
 * being able to hide a note.
 *
 * `board` is the exception in one respect: it groups by folder, so it only means
 * anything in the All Notes pane. See `note-board.svelte`.
 */
export type ListLayout = 'rows' | 'compact' | 'grid' | 'grouped' | 'board';

/** Switcher order. English labels live in the component's dictionary. */
export const LIST_LAYOUTS: ListLayout[] = ['rows', 'compact', 'grid', 'grouped', 'board'];

/**
 * The layout actually in force for a given pane.
 *
 * The board groups by folder, so it only means anything where every folder is in
 * scope — All Notes. In Trash or inside a workspace it would render a single
 * degenerate column, so it degrades to rows. Shared by the list, which draws it,
 * and the app shell, which widens the pane for it: two places deciding this
 * separately is two places to disagree.
 */
export function effectiveLayout(layout: ListLayout, folderId: string | null | 'trash'): ListLayout {
	return layout === 'board' && folderId !== null ? 'rows' : layout;
}

/** Layouts that want more room than the reading-list pane normally gets. */
export function isWideLayout(layout: ListLayout): boolean {
	return layout === 'grid' || layout === 'board';
}

/** How many languages the quick-switch remembers. */
const RECENT_LANG_LIMIT = 3;

/**
 * Bring notes written by an older version of the app up to `CURRENT_SCHEMA`.
 *
 * Runs on the raw array straight out of IndexedDB, before it reaches `$state`,
 * and must finish before `loaded` flips — a flush that lands mid-migration
 * would write the half-migrated array back over the user's notes.
 */
function migrate(raw: Note[], from: number): Note[] {
	let notes = raw;
	if (from < 1) {
		// v0 predates sharing, pinning and tags; absent fields are not "empty",
		// they simply never existed, so backfill rather than trusting defaults.
		notes = notes.map((note) => ({
			...note,
			pinnedAt: note.pinnedAt ?? null,
			tags: note.tags ?? [],
			share: note.share ?? null
		}));
	}
	if (from < 2) {
		// v1 predates workspaces. `null` and absent mean the same thing here, but
		// writing it makes the field present in storage rather than implied.
		notes = notes.map((note) => ({ ...note, workspaceId: note.workspaceId ?? null }));
	}
	return notes;
}

function uid() {
	return crypto.randomUUID();
}

/**
 * The dictation sentence is deliberate. The earlier wording said notes are
 * "never sent anywhere", which is true of typed text and false of dictation:
 * Chrome and Safari transcribe by streaming audio to Google and Apple. Saying so
 * plainly is both accurate and better positioning than being found out.
 *
 * Seeded once, in whatever language is current on first launch. It is an
 * ordinary note afterwards — editable, deletable, and never rewritten if the
 * interface language changes later.
 */
const WELCOME_BODY: Dict<string> = {
	en: `Welcome to Note Speak
Your notes are saved to this browser's own storage. We have no server and no account, so typed notes are never sent anywhere.

Tap the microphone to dictate instead of typing. One thing worth knowing: dictation uses your browser's speech recognition, and in Chrome and Safari that sends the audio to Google or Apple to be transcribed — never to us.

Press ⌘N for a new note and ⌘⇧D to start dictating.`,
	id: `Selamat datang di Note Speak
Catatan Anda disimpan di penyimpanan browser ini sendiri. Kami tidak punya server dan tidak punya akun, jadi catatan yang Anda ketik tidak dikirim ke mana pun.

Ketuk mikrofon untuk mendikte alih-alih mengetik. Satu hal yang perlu diketahui: dikte memakai pengenalan suara bawaan browser Anda, dan di Chrome serta Safari itu mengirim audionya ke Google atau Apple untuk ditranskripsikan — tidak pernah ke kami.

Tekan ⌘N untuk catatan baru dan ⌘⇧D untuk mulai mendikte.`
};

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
	/**
	 * Cached search text per note, keyed by the body it was derived from.
	 *
	 * Recomputing the strip on every keystroke would cost as much as the naive
	 * scan it replaces; the body doubles as its own cache key, so an edit
	 * invalidates the entry without any bookkeeping.
	 */
	#searchCache = new Map<string, { body: string; text: string }>();

	#searchText(note: Note): string {
		const cached = this.#searchCache.get(note.id);
		if (cached?.body === note.body) return cached.text;
		const text = searchableText(note.body).toLowerCase();
		this.#searchCache.set(note.id, { body: note.body, text });
		return text;
	}

	async load() {
		if (this.loaded) return;
		// Before anything else: the welcome note below is seeded once, in whatever
		// language is current at that moment. `onMount` fires child-first, so a
		// layout could not guarantee this ordering — doing it here can.
		await locale.load();
		const [notes, folders, prefs, schema] = await Promise.all([
			get<Note[]>(NOTES_KEY),
			get<Folder[]>(FOLDERS_KEY),
			get<Prefs>(PREFS_KEY),
			get<number>(SCHEMA_KEY)
		]);
		this.folders = folders ?? [];
		this.prefs = prefs ?? {};
		if (notes) {
			// An explicitly emptied list stays empty — only a *missing* key seeds.
			const from = schema ?? 0;
			this.notes = from < CURRENT_SCHEMA ? migrate(notes, from) : notes;
			this.loaded = true;
			// Persist the upgraded shape immediately. Leaving it in memory would let a
			// crash before the next edit drop the migration and run it again next time.
			if (from < CURRENT_SCHEMA) this.flush();
		} else {
			const now = Date.now();
			this.notes = [
				{
					id: uid(),
					folderId: null,
					body: WELCOME_BODY[locale.current],
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
					pinnedAt: null,
					tags: [],
					share: null
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
			void set(SCHEMA_KEY, CURRENT_SCHEMA);
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
		void set(SCHEMA_KEY, CURRENT_SCHEMA);
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
			deletedAt: null,
			pinnedAt: null,
			tags: [],
			share: null,
			workspaceId: null
		};
		this.notes = [note, ...this.notes];
		this.#persist();
		return note;
	}

	// ---- workspaces ----

	/**
	 * Mirror one workspace index entry into the local note list.
	 *
	 * A member sees every note in the workspace, but holds a replica only of the
	 * ones they have opened — so the stub carries the shared title as its body.
	 * That keeps the list readable offline, and the shared session overwrites it
	 * with the real content the moment the note is opened.
	 */
	syncWorkspaceNote(
		workspaceId: string,
		share: ShareInfo,
		title: string,
		updatedAt: number,
		/** The title this stub was last given, if any — see below. */
		seededTitle?: string
	) {
		const existing = this.notes.find((n) => n.share?.docId === share.docId);
		if (existing) {
			existing.workspaceId = workspaceId;
			// Never overwrite `signSeed` with null: a peer that joined this note by
			// view link would otherwise be downgraded by its own index entry.
			if (share.signSeed && !existing.share?.signSeed) existing.share = { ...share };
			// Keep an unopened stub's title current when another member renames the
			// note. Guarded on the body still being *exactly* what we last wrote, so
			// a note the user has actually opened or edited is never touched.
			if (seededTitle !== undefined && existing.body === seededTitle && title !== seededTitle) {
				existing.body = title;
			}
			this.#persist();
			return;
		}
		const now = Date.now();
		this.notes = [
			{
				id: uid(),
				folderId: null,
				body: title,
				createdAt: updatedAt || now,
				updatedAt: updatedAt || now,
				deletedAt: null,
				pinnedAt: null,
				tags: [],
				share: { ...share },
				workspaceId
			},
			...this.notes
		];
		this.#persist();
	}

	/**
	 * Detach notes from a workspace without deleting them.
	 *
	 * Used both when leaving a workspace and when another member removes a note
	 * from it. Removal from a shared list is not a delete, and treating it as one
	 * would let any member destroy another's note — so the note falls back to All
	 * Notes instead.
	 */
	detachWorkspace(workspaceId: string, docId?: string) {
		let touched = false;
		for (const note of this.notes) {
			if (note.workspaceId !== workspaceId) continue;
			if (docId && note.share?.docId !== docId) continue;
			note.workspaceId = null;
			touched = true;
		}
		if (touched) this.#persist();
	}

	setWorkspace(id: string, workspaceId: string | null) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.workspaceId = workspaceId;
		this.#persist();
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

	togglePin(id: string) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.pinnedAt = note.pinnedAt === null ? Date.now() : null;
		this.#persist();
	}

	/**
	 * Attach (or clear) share credentials.
	 *
	 * Deliberately does *not* touch `updatedAt` — sharing is not an edit to the
	 * note, and bumping it would jump the note to the top of the list.
	 */
	setShare(id: string, share: Note['share']) {
		const note = this.notes.find((n) => n.id === id);
		if (!note) return;
		note.share = share;
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

	/**
	 * Adopt an imported collection.
	 *
	 * Refuses to run before `load()` has finished: applying an import onto the
	 * empty initial arrays would flush that emptiness over the user's real notes,
	 * which is the same hazard `#persist()` guards against.
	 */
	applyImport(notes: Note[], folders: Folder[]): boolean {
		if (!this.loaded) return false;
		this.notes = notes;
		this.folders = folders;
		this.flush();
		return true;
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
		const workspaceId = paneWorkspaceId(folderId);
		if (workspaceId) return this.activeNotes.filter((n) => n.workspaceId === workspaceId).length;
		return this.activeNotes.filter((n) => n.folderId === folderId).length;
	}

	/** Notes for the current folder, filtered by the search query, newest first. */
	listFor(folderId: string | null | 'trash'): Note[] {
		const workspaceId = paneWorkspaceId(folderId);
		const base =
			folderId === 'trash'
				? this.trashedNotes
				: folderId === null
					? this.activeNotes
					: workspaceId
						? this.activeNotes.filter((n) => n.workspaceId === workspaceId)
						: this.activeNotes.filter((n) => n.folderId === folderId);

		const q = this.query.trim().toLowerCase();
		const filtered = q
			? base.filter(
					(n) => this.#searchText(n).includes(q) || noteTitle(n).toLowerCase().includes(q)
				)
			: base;

		// Pinned notes lead, most recently pinned first; the rest by the chosen order.
		const sortBy = this.prefs.sortBy ?? 'updated';
		return [...filtered].sort((a, b) => {
			// Compare *pinnedness*, not the timestamps. Guarding on `a.pinnedAt !==
			// b.pinnedAt` meant two pinned notes — which almost never share a
			// millisecond — always took the pin branch and never reached the chosen
			// sort, so "Sort by Title" quietly left the pinned notes unsorted.
			const aPinned = a.pinnedAt !== null;
			const bPinned = b.pinnedAt !== null;
			if (aPinned !== bPinned) return aPinned ? -1 : 1;
			if (aPinned && bPinned && sortBy === 'updated') {
				// Within the pins, most recently pinned first — the original intent,
				// now only where it does not override an explicit sort choice.
				return b.pinnedAt! - a.pinnedAt!;
			}
			if (sortBy === 'created') return b.createdAt - a.createdAt;
			if (sortBy === 'title') {
				// localeCompare so accented titles sort where a reader expects.
				return noteTitle(a).localeCompare(noteTitle(b), undefined, { sensitivity: 'base' });
			}
			return b.updatedAt - a.updatedAt;
		});
	}

	/**
	 * The name and colour collaborators see.
	 *
	 * Generated once and kept, so you don't become a different stranger on every
	 * reload. Never leaves the device except as presence inside a share.
	 */
	async identity(): Promise<{ name: string; color: string }> {
		if (this.prefs.identity) return this.prefs.identity;
		const { makeIdentity } = await import('$lib/share/session');
		const identity = makeIdentity();
		this.setPref('identity', identity);
		return identity;
	}

	/**
	 * Notes linking to a given title.
	 *
	 * Derived, never stored: a stored index would go stale the moment a note is
	 * renamed or edited, and this is cheap enough to compute — the scan is over
	 * link syntax, not note bodies.
	 */
	backlinksTo(title: string): Note[] {
		const target = title.trim().toLowerCase();
		if (!target) return [];
		return this.activeNotes.filter((note) =>
			linkedTitles(note.body).some((linked) => linked.toLowerCase() === target)
		);
	}

	/** Resolve a wiki-link title to a note, case-insensitively. */
	findByTitle(title: string): Note | undefined {
		const target = title.trim().toLowerCase();
		return this.activeNotes.find((note) => noteTitle(note).toLowerCase() === target);
	}

	/** Record a dictation language so the quick-switch can offer it. */
	noteLangUse(lang: string) {
		const rest = (this.prefs.recentLangs ?? []).filter((l) => l !== lang);
		this.setPref('recentLangs', [lang, ...rest].slice(0, RECENT_LANG_LIMIT));
	}
}

export const notes = new NotesStore();
