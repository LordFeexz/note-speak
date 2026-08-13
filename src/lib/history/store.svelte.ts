import { get, set, del } from 'idb-keyval';
import { createPatch, applyPatch, diffLines, type Change } from 'diff';
import { expandMedia, pruneMedia, referencedHashes, tokenizeMedia } from './media';

/**
 * Per-note version history.
 *
 * Versions are stored as **reverse** patches: the note itself is the current
 * version, and each entry says how to turn the *newer* text back into the older
 * one. Current state therefore costs nothing, and cost grows with how far back
 * you reach — which matches how history actually gets used.
 *
 * Media never appears in a patch. `tokenizeMedia` swaps each data URI for a
 * content hash first, so a version of a note full of photos is a few hundred
 * bytes rather than a few hundred KB.
 */

export type Version = {
	id: string;
	at: number;
	/** Set only for versions the user deliberately marked. */
	label?: string;
	/** Reverse patch: turns THIS version's text into the previous version's. */
	patch: string;
	bytes: number;
};

/**
 * What is stored per note.
 *
 * `head` is the newest version's full text, tokenised. Keeping one full copy is
 * what lets a version mean "the note as it was at this moment" — the reading a
 * user expects from "Save version now". Chaining patches off the *live* body
 * instead would make every version represent the text from one session earlier,
 * which is subtly and confusingly wrong.
 */
type History = { head: string; versions: Version[] };

const historyKey = (noteId: string) => `note-speak:history:${noteId}`;

/** A writing session becomes one version once it has been idle this long. */
const SESSION_IDLE_MS = 2 * 60 * 1000;
/** Twin limits, the lesson from the shared-note log: count alone is not enough. */
const MAX_VERSIONS = 50;
const MAX_BYTES = 2 * 1024 * 1024;

function uid() {
	return crypto.randomUUID();
}

export class HistoryStore {
	/** Versions for the note currently open, newest first. */
	versions = $state<Version[]>([]);
	loadedFor = $state<string | null>(null);
	busy = $state(false);

	/**
	 * Body as it stood when the open session began, tokenised.
	 *
	 * A plain Map on purpose: this is internal bookkeeping that nothing renders
	 * from, so a reactive one would signal a reactivity that does not exist.
	 */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#sessionBase = new Map<string, string>();
	#idleTimer: ReturnType<typeof setTimeout> | undefined;
	#pendingNoteId: string | null = null;

	async load(noteId: string) {
		if (this.loadedFor === noteId) return;
		this.loadedFor = noteId;
		this.versions = (await this.#read(noteId)).versions;
	}

	async #read(noteId: string): Promise<History> {
		return (await get<History>(historyKey(noteId))) ?? { head: '', versions: [] };
	}

	/**
	 * Note the body at the start of an editing session.
	 *
	 * Called on every edit, but only the *first* call after a commit records a
	 * base — the point of a session is that a burst of typing is one version.
	 */
	async touch(noteId: string, body: string) {
		if (!this.#sessionBase.has(noteId)) {
			this.#sessionBase.set(noteId, await tokenizeMedia(body));
		}
		this.#pendingNoteId = noteId;
		clearTimeout(this.#idleTimer);
		this.#idleTimer = setTimeout(() => void this.commit(noteId, body), SESSION_IDLE_MS);
	}

	/**
	 * Close the open session for a note, if it changed anything.
	 *
	 * Idempotent and safe to call on note switch, pagehide, or a manual save.
	 */
	async commit(noteId: string, currentBody: string, label?: string): Promise<boolean> {
		clearTimeout(this.#idleTimer);
		const hadSession = this.#sessionBase.delete(noteId);
		if (this.#pendingNoteId === noteId) this.#pendingNoteId = null;

		const stored = await this.#read(noteId);
		const current = await tokenizeMedia(currentBody);
		// Nothing to record. A manual save still counts even without a typing
		// session, as long as the text actually differs from the last version.
		if (current === stored.head) return false;
		if (!hadSession && !label && stored.versions.length) return false;

		// The patch walks *backwards*: from this version's text to the previous
		// one's. So the newest version costs nothing to read, and cost grows with
		// how far back you reach — which is how history actually gets used.
		const patch = createPatch(noteId, current, stored.head, '', '');
		const version: Version = {
			id: uid(),
			at: Date.now(),
			...(label ? { label } : {}),
			patch,
			bytes: patch.length
		};

		const versions = this.#trim([version, ...stored.versions]);
		await set(historyKey(noteId), { head: current, versions });
		if (this.loadedFor === noteId) this.versions = versions;
		return true;
	}

	/** Enforce both limits, newest first, so recent history survives. */
	#trim(versions: Version[]): Version[] {
		const out: Version[] = [];
		let bytes = 0;
		for (const version of versions) {
			if (out.length >= MAX_VERSIONS || bytes + version.bytes > MAX_BYTES) break;
			bytes += version.bytes;
			out.push(version);
		}
		return out;
	}

	/**
	 * Reconstruct a version's body.
	 *
	 * Patches are applied newest-first back to the requested one, then media
	 * tokens are expanded. Returns null if a patch no longer applies, which is
	 * better than handing back a corrupted note.
	 */
	async bodyAt(noteId: string, versionId: string): Promise<string | null> {
		const { head, versions } = await this.#read(noteId);
		// `head` is the newest version's own text, so the walk starts there and
		// each patch steps one version further back.
		let text = head;

		for (const version of versions) {
			if (version.id === versionId) return expandMedia(text);
			const applied = applyPatch(text, version.patch);
			if (applied === false) return null;
			text = applied;
		}
		return null;
	}

	/** Line changes between a version and the current body, for the diff view. */
	async diffAgainstCurrent(
		noteId: string,
		versionId: string,
		currentBody: string
	): Promise<Change[] | null> {
		const older = await this.bodyAt(noteId, versionId);
		if (older === null) return null;
		// Compare tokenised text so a swapped image reads as one changed line
		// rather than a wall of base64.
		return diffLines(await tokenizeMedia(older), await tokenizeMedia(currentBody));
	}

	async clear(noteId: string) {
		await del(historyKey(noteId));
		this.#sessionBase.delete(noteId);
		if (this.loadedFor === noteId) this.versions = [];
	}

	/**
	 * Drop media payloads nothing references any more.
	 *
	 * Needs every live note body *and* every stored version, so it is driven from
	 * the caller rather than guessing here.
	 */
	async prune(bodies: string[], allVersionPatches: string[]) {
		// Function-local and discarded on return — never observed by the UI.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const referenced = new Set<string>();
		for (const body of bodies) for (const hash of referencedHashes(body)) referenced.add(hash);
		for (const patch of allVersionPatches) {
			for (const hash of referencedHashes(patch)) referenced.add(hash);
		}
		// A live note still holds its media as a data URI, not a token, so hash
		// those too or the very images in use would be pruned.
		for (const body of bodies) {
			const tokenised = await tokenizeMedia(body);
			for (const hash of referencedHashes(tokenised)) referenced.add(hash);
		}
		return pruneMedia(referenced);
	}
}

export const history = new HistoryStore();
