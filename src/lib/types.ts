/**
 * Everything needed to join a shared note's peer group.
 *
 * There is no server-side record of a share — the link *is* the credential, and
 * the secrets below travel in the URL fragment, which browsers never send to a
 * server. Holding `signSeed` is what makes a peer an editor: every update is
 * signed with it, and viewers drop anything that doesn't verify.
 */
export type ShareInfo = {
	/** Opaque signaling room id. Never derived from note content or `note.id`. */
	docId: string;
	/** Base64 AES-GCM content key. Both roles need it — viewing means decrypting. */
	symKey: string;
	/** Base64 Ed25519 private seed. `null` on a peer that joined via a view link. */
	signSeed: string | null;
	/** Base64 Ed25519 public key, used by every peer to verify inbound updates. */
	signPub: string;
	mode: 'link' | 'public';
};

export type Note = {
	id: string;
	folderId: string | null;
	/**
	 * Markdown. Canonical for local notes; for shared notes the Yjs doc is
	 * canonical and this becomes a cache refreshed on change, so that search and
	 * list previews keep working without loading the CRDT.
	 */
	body: string;
	createdAt: number;
	updatedAt: number;
	/** Soft delete — non-null means the note lives in Trash. */
	deletedAt: number | null;
	/** Non-null pins the note above the rest of its folder. */
	pinnedAt: number | null;
	tags: string[];
	/** Non-null means the note is shared and the Yjs doc owns its content. */
	share: ShareInfo | null;
};

export type Folder = {
	id: string;
	name: string;
	createdAt: number;
};

/** Which pane of the list is being shown. `null` = All Notes. */
export type Selection = { folderId: string | null | 'trash'; noteId: string | null };

/**
 * Strip Markdown syntax that should not appear in a plain-text title or preview.
 *
 * A trailing backslash is Markdown's hard line break, which the editor emits at
 * the end of any line followed by a soft break — it showed up verbatim as
 * "Welcome to Note Speak\" in the note list.
 */
function plainify(line: string): string {
	return line
		.replace(/\\$/, '')
		.replace(/^#{1,6}\s+/, '')
		.replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, '')
		.replace(/^>\s?/, '')
		.trim();
}

/** Derived note title: first non-empty line, macOS Notes style. */
export function noteTitle(note: Note): string {
	const line = note.body.split('\n').find((l) => l.trim().length > 0);
	return plainify(line ?? '').slice(0, 120) || 'New Note';
}

/** Derived one-line preview: everything after the title line. */
export function notePreview(note: Note): string {
	const lines = note.body.split('\n');
	const titleIndex = lines.findIndex((l) => l.trim().length > 0);
	if (titleIndex === -1) return 'No additional text';
	const rest = lines
		.slice(titleIndex + 1)
		.map(plainify)
		.filter(Boolean)
		.join(' ')
		.trim();
	return rest.length > 0 ? rest.slice(0, 160) : 'No additional text';
}
