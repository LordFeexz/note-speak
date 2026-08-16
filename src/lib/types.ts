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
	/** Non-null means the note is shared and the Yjs doc owns its content. */
	share: ShareInfo | null;
	/**
	 * Set when the note belongs to a workspace.
	 *
	 * A workspace note is an ordinary shared note whose credentials live in the
	 * workspace's encrypted index, so this is only a grouping key — everything
	 * needed to open it is still in `share`.
	 */
	workspaceId?: string | null;
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
	return (
		line
			.replace(/\\$/, '')
			.replace(/^#{1,6}\s+/, '')
			.replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, '')
			.replace(/^>\s?/, '')
			// A table row would otherwise become the title verbatim, as "| a | b |",
			// and its delimiter row as "|---|---|".
			.replace(/^\|[\s:|-]*\|$/, '')
			.replace(/^\|\s*/, '')
			.replace(/\s*\|$/, '')
			.replace(/\s*\|\s*/g, ' · ')
			// Images carry no readable text; keep the alt text if there is any. The
			// non-greedy URL match matters: a base64 data URI is megabytes long and a
			// greedy `[^)]*` would backtrack across the whole note.
			.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
			// Directive fences and their payloads are structure, not prose.
			.replace(/^:::[a-zA-Z][\w-]*(\{.*\})?$/, '')
			.replace(/^:::$/, '')
			.replace(/^data:[^\s]+$/, '')
			.trim()
	);
}

/**
 * Text worth searching, with media payloads removed.
 *
 * `listFor()` runs a substring match over every note on each keystroke. With a
 * base64 image embedded, that means lowercasing hundreds of KB per note per
 * keypress — for a handful of notes with photos it is megabytes of pointless
 * scanning, and the search box visibly stutters. Stripping the payloads keeps
 * the cost proportional to the prose.
 */
export function searchableText(body: string): string {
	if (typeof body !== 'string') return '';
	return body
		.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '')
		.replace(/^:::[a-zA-Z][\w-]*(\{.*\})?$/gm, '')
		.replace(/^:::$/gm, '');
}

/**
 * Derived note title: first non-empty line, macOS Notes style.
 *
 * The fallback is a parameter because this function has two kinds of caller. The
 * list and the editor show it to a reader, and pass a translated string. Search,
 * export filenames and the workspace index use it as a *stable identifier* —
 * those must not change meaning when the reader switches language, so they take
 * the English default.
 */
export function noteTitle(note: Note, fallback = 'New Note'): string {
	const body = typeof note.body === 'string' ? note.body : '';
	const line = body.split('\n').find((l) => l.trim().length > 0);
	return plainify(line ?? '').slice(0, 120) || fallback;
}

/**
 * Everything after the title line, flattened to a single string.
 *
 * `chars` is what makes this serve both the one-line row preview and the much
 * longer card excerpt — the card clamps to three lines in CSS, so it only needs
 * enough text to fill them.
 */
export function notePreview(note: Note, chars = 160, fallback = 'No additional text'): string {
	const body = typeof note.body === 'string' ? note.body : '';
	const lines = body.split('\n');
	const titleIndex = lines.findIndex((l) => l.trim().length > 0);
	if (titleIndex === -1) return fallback;
	const rest = lines
		.slice(titleIndex + 1)
		.map(plainify)
		.filter(Boolean)
		.join(' ')
		.trim();
	return rest.length > 0 ? rest.slice(0, chars) : fallback;
}

/**
 * The note's first image, for a card thumbnail. `null` when it has none.
 *
 * Deliberately a local, non-global regex: the `/g` patterns in
 * `history/media.ts` carry `lastIndex` between calls, and reusing one from a
 * render path would make every other card silently miss its image.
 *
 * `[^)\s]+` is safe against a megabyte-long data URI — base64 contains neither a
 * closing paren nor whitespace, so there is nothing for the engine to backtrack
 * over.
 */
export function noteThumbnail(note: Note): string | null {
	const match = /!\[[^\]]*\]\((data:image\/[^)\s]+|https?:\/\/[^)\s]+)\)/.exec(note.body);
	return match ? match[1] : null;
}
