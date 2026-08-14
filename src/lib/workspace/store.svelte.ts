import { get, set } from 'idb-keyval';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { SignedDocProvider, type ProviderStatus } from '$lib/share/provider';
import { createShare, toBase64Url, fromBase64Url } from '$lib/share/crypto';
import { openShareSession, signalingUrl, type ShareSession } from '$lib/share/session';
import { notes } from '$lib/stores/notes.svelte';
import { createSharedEditor, normalizeListMarkers } from '$lib/editor/create';
import { noteTitle, type Note, type ShareInfo } from '$lib/types';
import {
	buildInviteUrl,
	deriveWorkspaceKeys,
	indexLink,
	newSalt,
	type WorkspaceKeys
} from './keys';

/**
 * Workspaces: a shared note *list*, with no server-side record of it.
 *
 * A workspace is one more shared document — the same `SignedDocProvider`, the
 * same signed append-only log, the same encryption. What it holds is an index:
 * the credentials for every note in the workspace. So one passphrase unlocks the
 * whole set, and adding a note to a workspace is minting a share and appending
 * it to the index.
 *
 * **What this does not do.** A workspace note is reachable when at least one
 * member who holds it is online, and not otherwise. Nothing here changes that,
 * because nothing here stores data on a server. What it does change is the
 * number of devices holding a replica: every member who opens a note keeps one,
 * so a six-member workspace has six ways to answer instead of one. The UI must
 * say this plainly rather than spin.
 */

const KEY = 'note-speak:workspaces';

/**
 * Cap on background note sessions.
 *
 * Each is a WebRTC room, so this is a real resource ceiling rather than a
 * guess. Notes past it still open normally when selected — they just are not
 * kept online in the background, which the workspace UI has to state instead of
 * quietly serving a subset.
 */
const MAX_BACKGROUND_NOTES = 25;

/** Matches the editor's own seed delay — see `#openNoteSession`. */
const SEED_DELAY_MS = 1500;

export type WorkspaceRecord = {
	id: string;
	name: string;
	/** Base64url. Kept so the invite link can be rebuilt without the passphrase. */
	salt: string;
	/**
	 * Derived keys, cached so a member is not re-prompted every launch.
	 *
	 * This is the passphrase's full power in storable form, which is why the
	 * privacy policy names it: it sits in IndexedDB exactly like the notes do.
	 * The passphrase itself is never written anywhere.
	 */
	keys: WorkspaceKeys;
};

/** One note, as listed in a workspace's index. */
export type IndexEntry = ShareInfo & { title: string; updatedAt: number };

type Session = {
	doc: Y.Doc;
	provider: SignedDocProvider;
	persistence: IndexeddbPersistence;
	observer: () => void;
};

function entriesOf(doc: Y.Doc): Y.Array<IndexEntry> {
	return doc.getArray<IndexEntry>('notes');
}

class WorkspaceStore {
	workspaces = $state<WorkspaceRecord[]>([]);
	loaded = $state(false);

	/** Connection state per workspace id, for the rail and the waiting message. */
	status = $state<Record<string, ProviderStatus>>({});
	peers = $state<Record<string, number>>({});
	/** Entry counts straight from the index, including notes not held locally. */
	sizes = $state<Record<string, number>>({});
	/**
	 * Last background failure, as a code the rail turns into a toast.
	 *
	 * Not swallowed: a note that fails to publish looks, to every other member,
	 * exactly like a note with nothing in it. The counter makes a repeat of the
	 * same failure a new event, so the second one is not silently dropped.
	 */
	lastError = $state<{ code: 'publish-failed'; detail: string; seq: number } | null>(null);
	#errorSeq = 0;

	#sessions = new Map<string, Session>();
	/**
	 * The title last written into each stub, by note docId.
	 *
	 * Lets a rename by another member refresh a note the user has never opened,
	 * without ever overwriting one they have. Deliberately not persisted: after a
	 * restart the map is empty and the title simply stays as it was, which is the
	 * safe direction to fail.
	 */
	#seeded = new Map<string, string>();

	/**
	 * Background sessions, one per workspace note, keyed by docId.
	 *
	 * These are what make a workspace work at all. A note's content lives in its
	 * own Yjs document, and that document is only *served* by a device that is
	 * connected to its room — so without these, adding a note to a workspace
	 * would publish its credentials and never its text, and members would
	 * receive an empty note.
	 *
	 * Running them for every note also delivers the one availability improvement
	 * this architecture can honestly make: each member ends up holding a replica
	 * of every note, so a workspace with six members has six devices able to
	 * answer instead of one.
	 */
	#noteSessions = new Map<string, ShareSession>();
	/**
	 * Notes the editor has taken over.
	 *
	 * Two sessions on one document from the same browser would join the same room
	 * twice: the peer count would include this device, and presence would show
	 * the user as their own collaborator. The open editor wins, and the
	 * background session resumes when it closes.
	 */
	#held = new Set<string>();
	/** Notes with a publish already scheduled, so two callers do not both seed. */
	#publishing = new Set<string>();

	async load() {
		if (this.loaded) return;
		this.workspaces = (await get<WorkspaceRecord[]>(KEY)) ?? [];
		this.loaded = true;
		// Reconnect everything the user is a member of, so a workspace note is
		// reachable from the list without opening it first.
		for (const record of this.workspaces) void this.connect(record);
	}

	#persist() {
		void set(KEY, $state.snapshot(this.workspaces));
	}

	get(id: string): WorkspaceRecord | undefined {
		return this.workspaces.find((w) => w.id === id);
	}

	/**
	 * Derive a workspace's keys from a passphrase.
	 *
	 * Both create and join go through here, and they are deliberately the same
	 * operation: creating a workspace nobody else has joined and joining one that
	 * already exists are indistinguishable until a peer answers. That is a
	 * property of deriving the room from the secret, not an accident.
	 */
	async derive(passphrase: string, saltB64?: string) {
		const salt = saltB64 ? fromBase64Url(saltB64) : newSalt();
		const keys = await deriveWorkspaceKeys(passphrase, salt);
		return { salt: toBase64Url(salt), keys };
	}

	async create(name: string, passphrase: string): Promise<WorkspaceRecord> {
		const { salt, keys } = await this.derive(passphrase);
		return this.#adopt(name.trim() || 'Workspace', salt, keys, true);
	}

	async join(name: string, saltB64: string, passphrase: string): Promise<WorkspaceRecord> {
		const { salt, keys } = await this.derive(passphrase, saltB64);
		return this.#adopt(name.trim() || 'Workspace', salt, keys, false);
	}

	async #adopt(
		name: string,
		salt: string,
		keys: WorkspaceKeys,
		seedMeta: boolean
	): Promise<WorkspaceRecord> {
		// The topic is the identity: joining the same workspace twice from two
		// links must land on the one record, not two.
		const existing = this.workspaces.find((w) => w.keys.topic === keys.topic);
		if (existing) {
			await this.connect(existing);
			return existing;
		}
		const record: WorkspaceRecord = { id: crypto.randomUUID(), name, salt, keys };
		this.workspaces = [...this.workspaces, record];
		this.#persist();
		await this.connect(record, seedMeta ? name : undefined);
		return record;
	}

	/** Open (or reuse) the index session for a workspace. */
	async connect(record: WorkspaceRecord, seedName?: string) {
		if (this.#sessions.has(record.id)) return;
		// Reserve the slot before the first await, so two concurrent calls cannot
		// each open a provider for the same room.
		const doc = new Y.Doc();
		const provider = new SignedDocProvider(indexLink(record.keys), doc);
		const persistence = new IndexeddbPersistence(`note-speak:ws:${record.keys.topic}`, doc);

		const apply = () => this.#applyIndex(record.id, doc);
		const observer = () => apply();
		const session: Session = { doc, provider, persistence, observer };
		this.#sessions.set(record.id, session);

		entriesOf(doc).observeDeep(observer);
		provider.onstatus = () => {
			this.status = { ...this.status, [record.id]: provider.status };
			this.peers = { ...this.peers, [record.id]: provider.peerCount };
		};
		this.status = { ...this.status, [record.id]: 'connecting' };

		const identity = await notes.identity();
		provider.awareness.setLocalStateField('user', identity);

		persistence.once('synced', () => apply());
		await provider.connect(signalingUrl());

		if (seedName) {
			const meta = doc.getMap<string>('meta');
			if (!meta.get('name')) meta.set('name', seedName);
		}
	}

	/** Mirror the index into the local note list. */
	#applyIndex(workspaceId: string, doc: Y.Doc) {
		const entries = entriesOf(doc).toArray();
		this.sizes = { ...this.sizes, [workspaceId]: entries.length };

		// A local lookup that never outlives this call, so it needs no reactivity.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const live = new Set<string>();
		for (const entry of entries) {
			if (!entry?.docId || !entry.symKey || !entry.signPub) continue;
			live.add(entry.docId);
			const title = entry.title || 'Untitled';
			const share: ShareInfo = {
				docId: entry.docId,
				symKey: entry.symKey,
				signSeed: entry.signSeed ?? null,
				signPub: entry.signPub,
				mode: entry.mode ?? 'link'
			};
			notes.syncWorkspaceNote(
				workspaceId,
				share,
				title,
				entry.updatedAt ?? 0,
				this.#seeded.get(entry.docId)
			);
			this.#seeded.set(entry.docId, title);
			// Never seeds: this device is learning about the note, not publishing it.
			void this.#openNoteSession(share);
		}

		// Anything still tagged with this workspace but no longer in the index was
		// removed by a member. Detach rather than delete — see `detachWorkspace`.
		for (const note of notes.notes) {
			if (note.workspaceId === workspaceId && note.share && !live.has(note.share.docId)) {
				notes.detachWorkspace(workspaceId, note.share.docId);
				this.#closeNoteSession(note.share.docId);
			}
		}

		const name = doc.getMap<string>('meta').get('name');
		const record = this.get(workspaceId);
		if (name && record && record.name !== name) {
			record.name = name;
			this.#persist();
		}
	}

	/**
	 * Open a background session for one workspace note.
	 *
	 * `seedBody` is passed only by the device that already holds the note — the
	 * one adding it. Everyone else must never seed: writing local text into a
	 * document a peer already has appends a duplicate instead of replacing it.
	 */
	async #openNoteSession(share: ShareInfo, seedBody?: string) {
		if (this.#held.has(share.docId)) return;
		const open = this.#noteSessions.get(share.docId);
		if (open) {
			// Already connected — but a caller with content to publish still needs
			// its seed to run, or the note is announced and never filled in.
			if (seedBody?.trim()) this.#publishLater(open, share.docId, seedBody);
			return;
		}
		if (this.#noteSessions.size >= MAX_BACKGROUND_NOTES) return;
		// Placeholder before the first await, so two index passes cannot both open
		// a session for the same note.
		this.#noteSessions.set(share.docId, null as unknown as ShareSession);
		try {
			const identity = await notes.identity();
			// `ShareInfo` stores an absent seed as null; `ShareLink` omits it. Same
			// meaning — a viewer — but the provider reads `signSeed ? editor : viewer`,
			// so the conversion has to be explicit rather than a cast.
			const session = await openShareSession(
				{
					docId: share.docId,
					symKey: share.symKey,
					signPub: share.signPub,
					...(share.signSeed ? { signSeed: share.signSeed } : {})
				},
				identity,
				signalingUrl()
			);
			// Publish no presence. This device is relaying the note, not reading it,
			// and announcing a name here would show the user as a collaborator in
			// every note of the workspace at once.
			session.provider.awareness.setLocalState(null);
			this.#noteSessions.set(share.docId, session);

			if (seedBody?.trim()) this.#publishLater(session, share.docId, seedBody);
		} catch (error) {
			this.#noteSessions.delete(share.docId);
			// Never silent: a note that fails to publish looks to every other member
			// exactly like a note with nothing in it.
			this.lastError = {
				code: 'publish-failed',
				detail: error instanceof Error ? error.message : String(error),
				seq: ++this.#errorSeq
			};
		}
	}

	/**
	 * Publish a note's text into its shared document, once the replica has
	 * loaded and any peer holding it has had a chance to connect.
	 *
	 * The wait matches the editor's: deciding a document is "empty" too early
	 * would append a duplicate of the whole note over a copy a peer already has.
	 */
	async #publishLater(session: ShareSession, docId: string, body: string) {
		if (this.#publishing.has(docId)) return;
		this.#publishing.add(docId);
		await session.whenLocalReady;
		setTimeout(() => {
			this.#publishing.delete(docId);
			if (!this.#noteSessions.has(docId)) return;
			if (session.fragment.length > 0) return;
			this.#seedFragment(session, body);
		}, SEED_DELAY_MS);
	}

	/**
	 * Write markdown into a shared document without showing an editor.
	 *
	 * Tiptap owns the markdown-to-ProseMirror conversion, so publishing a note
	 * means briefly running an editor against a detached element and throwing it
	 * away. Cheaper than duplicating the schema, and guaranteed to agree with
	 * what the real editor would have produced.
	 */
	#seedFragment(session: ShareSession, body: string) {
		const host = document.createElement('div');
		const editor = createSharedEditor({
			element: host,
			fragment: session.fragment,
			awareness: session.provider.awareness,
			user: { name: '', color: '#000000' },
			editable: true,
			onUpdate: () => {}
		});
		try {
			editor.commands.setContent(normalizeListMarkers(body));
		} catch (error) {
			this.lastError = {
				code: 'publish-failed',
				detail: error instanceof Error ? error.message : String(error),
				seq: ++this.#errorSeq
			};
		} finally {
			editor.destroy();
			host.remove();
		}
	}

	/** Called by the editor when it opens a shared note: it owns the connection. */
	hold(docId: string) {
		this.#held.add(docId);
		this.#closeNoteSession(docId);
	}

	/** Called when the editor closes. Resumes serving the note in the background. */
	release(docId: string) {
		if (!this.#held.delete(docId)) return;
		const note = notes.notes.find((n) => n.share?.docId === docId);
		if (note?.workspaceId && note.share) void this.#openNoteSession(note.share);
	}

	#closeNoteSession(docId: string) {
		const session = this.#noteSessions.get(docId);
		this.#noteSessions.delete(docId);
		session?.destroy();
	}

	/**
	 * Put a note into a workspace, minting share credentials if it has none.
	 *
	 * The credentials go into the index, which is encrypted under the workspace
	 * key — so membership is what grants access to the note, and the note's own
	 * link keeps working independently for anyone outside.
	 */
	async addNote(workspaceId: string, note: Note): Promise<boolean> {
		const session = this.#sessions.get(workspaceId);
		if (!session) return false;
		const share = note.share ?? (await createShare('link'));
		if (!note.share) notes.setShare(note.id, share);
		notes.setWorkspace(note.id, workspaceId);

		// Publish the text *before* announcing the note. The index observer fires
		// synchronously on the write below and opens its own (seedless) session for
		// every entry it sees — which, in the other order, wins the race and leaves
		// the note announced but empty.
		const entry: IndexEntry = {
			...share,
			title: noteTitle(note),
			updatedAt: note.updatedAt
		};
		this.#seeded.set(share.docId, entry.title);
		await this.#openNoteSession(share, note.body);

		const array = entriesOf(session.doc);
		const existing = array.toArray().findIndex((e) => e.docId === share.docId);
		session.doc.transact(() => {
			if (existing >= 0) array.delete(existing, 1);
			array.push([entry]);
		});
		return true;
	}

	/** Keep the shared title current, so other members' lists are not stale. */
	touchTitle(note: Note) {
		if (!note.workspaceId || !note.share) return;
		const session = this.#sessions.get(note.workspaceId);
		if (!session) return;
		const array = entriesOf(session.doc);
		const list = array.toArray();
		const index = list.findIndex((e) => e.docId === note.share!.docId);
		if (index < 0) return;
		const title = noteTitle(note);
		if (list[index].title === title) return;
		session.doc.transact(() => {
			array.delete(index, 1);
			array.insert(index, [{ ...list[index], title, updatedAt: note.updatedAt }]);
		});
	}

	removeNote(workspaceId: string, docId: string) {
		const session = this.#sessions.get(workspaceId);
		if (!session) return;
		const array = entriesOf(session.doc);
		const index = array.toArray().findIndex((e) => e.docId === docId);
		if (index >= 0) array.delete(index, 1);
		notes.detachWorkspace(workspaceId, docId);
		this.#closeNoteSession(docId);
	}

	inviteUrl(record: WorkspaceRecord): string {
		return buildInviteUrl(location.origin, fromBase64Url(record.salt), record.name);
	}

	/** Leave locally. There is no server to tell, and no way to evict anyone else. */
	leave(id: string) {
		for (const note of notes.notes) {
			if (note.workspaceId === id && note.share) this.#closeNoteSession(note.share.docId);
		}
		this.#close(id);
		notes.detachWorkspace(id);
		this.workspaces = this.workspaces.filter((w) => w.id !== id);
		this.#persist();
	}

	#close(id: string) {
		const session = this.#sessions.get(id);
		if (!session) return;
		entriesOf(session.doc).unobserveDeep(session.observer);
		session.provider.destroy();
		void session.persistence.destroy();
		session.doc.destroy();
		this.#sessions.delete(id);
	}

	destroy() {
		for (const docId of [...this.#noteSessions.keys()]) this.#closeNoteSession(docId);
		for (const id of [...this.#sessions.keys()]) this.#close(id);
	}
}

export const workspaces = new WorkspaceStore();
