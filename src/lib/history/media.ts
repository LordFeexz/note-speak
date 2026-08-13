import { get, set } from 'idb-keyval';

/**
 * Content-addressed storage for embedded media, used by version history.
 *
 * A note carries its images as base64 data URIs, so a naive history would copy
 * hundreds of KB into every version — ten edits to a note with two photos and
 * IndexedDB is holding megabytes of identical bytes.
 *
 * Instead, each payload is replaced by a token before diffing and stored once
 * under its own SHA-256. Versions then diff over text where an image is a
 * 71-character token, so a version costs bytes; and because the token *is* the
 * hash, two notes embedding the same photo share one copy.
 */

const MEDIA_KEY = 'note-speak:media';

/** `data:image/webp;base64,AAAA…` → `⟦media:<sha256>⟧` */
const DATA_URI = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
const TOKEN = /⟦media:([a-f0-9]{64})⟧/g;

type MediaMap = Record<string, string>;

async function sha256(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Replace every data URI with its hash token, storing payloads not seen before.
 *
 * Returns the tokenised text. Safe to call repeatedly: an already-tokenised
 * string contains no data URIs and passes straight through.
 */
export async function tokenizeMedia(body: string): Promise<string> {
	const matches = body.match(DATA_URI);
	if (!matches?.length) return body;

	const stored = (await get<MediaMap>(MEDIA_KEY)) ?? {};
	let changed = false;
	const hashes = new Map<string, string>();

	for (const uri of new Set(matches)) {
		const hash = await sha256(uri);
		hashes.set(uri, hash);
		if (!stored[hash]) {
			stored[hash] = uri;
			changed = true;
		}
	}
	if (changed) await set(MEDIA_KEY, stored);

	return body.replace(DATA_URI, (uri) => `⟦media:${hashes.get(uri)}⟧`);
}

/**
 * Turn tokens back into data URIs.
 *
 * A token whose payload is missing — pruned, or restored on a device that never
 * had it — is left in place rather than silently dropped. Visible breakage beats
 * a version that quietly comes back without its pictures.
 */
export async function expandMedia(body: string): Promise<string> {
	if (!TOKEN.test(body)) return body;
	TOKEN.lastIndex = 0;

	const stored = (await get<MediaMap>(MEDIA_KEY)) ?? {};
	return body.replace(TOKEN, (token, hash: string) => stored[hash] ?? token);
}

/**
 * Drop payloads no longer referenced by any live note or version.
 *
 * Called after history is trimmed. Without it the media map only ever grows,
 * and it holds the largest objects in the app.
 */
export async function pruneMedia(referenced: Set<string>): Promise<number> {
	const stored = (await get<MediaMap>(MEDIA_KEY)) ?? {};
	let removed = 0;
	for (const hash of Object.keys(stored)) {
		if (!referenced.has(hash)) {
			delete stored[hash];
			removed++;
		}
	}
	if (removed) await set(MEDIA_KEY, stored);
	return removed;
}

/** Hashes referenced by a tokenised string. */
export function referencedHashes(body: string): string[] {
	const out: string[] = [];
	for (const match of body.matchAll(TOKEN)) out.push(match[1]);
	return out;
}
