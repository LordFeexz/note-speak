import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { SignedDocProvider, type ProviderStatus, type Role } from './provider';
import type { ShareLink } from './crypto';

export { Y };
export type { ProviderStatus, Role };

/** Colours for collaborator cursors — picked for contrast in both themes. */
const PEER_COLORS = [
	'#e11d48',
	'#0891b2',
	'#7c3aed',
	'#ea580c',
	'#16a34a',
	'#db2777',
	'#2563eb',
	'#ca8a04'
];

const ADJECTIVES = ['Swift', 'Quiet', 'Bright', 'Calm', 'Bold', 'Keen', 'Warm', 'Clever'];
const ANIMALS = ['Otter', 'Heron', 'Fox', 'Lynx', 'Falcon', 'Badger', 'Marten', 'Ibis'];

export type Identity = { name: string; color: string };

/**
 * A stable anonymous identity.
 *
 * There are no accounts, so this is what collaborators see. It is persisted so
 * you stay the same "Quiet Otter" across reloads rather than becoming a stranger
 * mid-session.
 */
export function makeIdentity(): Identity {
	const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
	return {
		name: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
		color: pick(PEER_COLORS)
	};
}

export type ShareSession = {
	doc: Y.Doc;
	fragment: Y.XmlFragment;
	provider: SignedDocProvider;
	persistence: IndexeddbPersistence;
	role: Role;
	/** Resolves once the local replica has loaded, so we know if we hold a copy. */
	whenLocalReady: Promise<void>;
	destroy: () => void;
};

/**
 * Open a shared note.
 *
 * The local replica (`y-indexeddb`) is what makes a shared note editable offline
 * and lets *any* peer who has seen the document serve it to a latecomer — the
 * only thing standing in for a server that stores nothing.
 */
export async function openShareSession(
	link: ShareLink,
	identity: Identity,
	signalingUrl: string
): Promise<ShareSession> {
	const doc = new Y.Doc();
	// Tiptap's collaboration extension binds to an XmlFragment, not a Y.Text.
	const fragment = doc.getXmlFragment('note');

	const persistence = new IndexeddbPersistence(`note-speak:doc:${link.docId}`, doc);
	const whenLocalReady = new Promise<void>((resolve) => {
		persistence.once('synced', () => resolve());
	});

	const provider = new SignedDocProvider(link, doc);
	provider.awareness.setLocalStateField('user', identity);
	await provider.connect(signalingUrl);

	return {
		doc,
		fragment,
		provider,
		persistence,
		role: provider.role,
		whenLocalReady,
		destroy: () => {
			provider.destroy();
			void persistence.destroy();
			doc.destroy();
		}
	};
}

/** Where the signaling gateway lives, relative to wherever the app is served. */
export function signalingUrl(): string {
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${location.host}/signal`;
}
