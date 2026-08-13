import * as ed from '@noble/ed25519';
import { fromBase64Url, toBase64Url, type ShareLink } from '$lib/share/crypto';

/**
 * Workspace credentials, derived entirely from a passphrase.
 *
 * The invite link carries a salt and a display name — nothing else. Even the
 * signalling room is derived from the passphrase, so a link on its own does not
 * identify a workspace, cannot join anything, and reveals nothing to anyone who
 * intercepts it. That is what makes "link plus passphrase" two real channels
 * rather than a slogan.
 *
 * Everyone holding the passphrase is an editor. A read-only member would need
 * the signing seed withheld, and it cannot be withheld from a secret it is
 * derived from — so the UI must not offer a workspace role that cannot be
 * enforced. Per-note view links still exist for sharing outward.
 */

/**
 * OWASP's 2023 floor for PBKDF2-SHA256.
 *
 * Measured at 139 ms on this desktop, so perhaps half a second on a slow phone —
 * enough to want a pending state on the button, not enough to justify moving it
 * to a worker. If it ever needs to be faster, spend the effort on the worker
 * rather than on lowering this number.
 */
const ITERATIONS = 600_000;

export type WorkspaceKeys = {
	/** Signalling room. Derived, so it is itself a secret. */
	topic: string;
	symKey: string;
	signSeed: string;
	signPub: string;
};

async function pbkdf2(passphrase: string, salt: Uint8Array): Promise<ArrayBuffer> {
	const base = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase.normalize('NFKC')),
		'PBKDF2',
		false,
		['deriveBits']
	);
	return crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: salt.slice().buffer as ArrayBuffer,
			iterations: ITERATIONS
		},
		base,
		256
	);
}

/** HKDF-SHA256 with a label, so one master yields independent sub-keys. */
async function subKey(master: ArrayBuffer, label: string): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(0),
			info: new TextEncoder().encode(`note-speak/workspace/${label}`)
		},
		key,
		256
	);
	return new Uint8Array(bits);
}

/** Derive everything a workspace needs from a passphrase and a salt. */
export async function deriveWorkspaceKeys(
	passphrase: string,
	salt: Uint8Array
): Promise<WorkspaceKeys> {
	const master = await pbkdf2(passphrase, salt);

	const [topicBytes, contentBytes, seedBytes] = await Promise.all([
		subKey(master, 'topic'),
		subKey(master, 'content'),
		subKey(master, 'sign')
	]);

	const signPub = await ed.getPublicKeyAsync(seedBytes);
	return {
		topic: toBase64Url(topicBytes),
		symKey: toBase64Url(contentBytes),
		signSeed: toBase64Url(seedBytes),
		signPub: toBase64Url(signPub)
	};
}

/** A workspace's index document, in the shape the existing provider expects. */
export function indexLink(keys: WorkspaceKeys): ShareLink {
	return {
		// The room *is* the doc id — a workspace has exactly one index document.
		docId: keys.topic,
		symKey: keys.symKey,
		signSeed: keys.signSeed,
		signPub: keys.signPub
	};
}

export function newSalt(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(16));
}

/** `/w#s=<salt>&n=<name>` — no workspace identifier, by design. */
export function buildInviteUrl(origin: string, salt: Uint8Array, name: string): string {
	const params = new URLSearchParams({ s: toBase64Url(salt) });
	if (name) params.set('n', name);
	return `${origin}/w#${params.toString()}`;
}

export function parseInvite(fragment: string): { salt: Uint8Array; name: string } | null {
	const params = new URLSearchParams(fragment.replace(/^#/, ''));
	const salt = params.get('s');
	if (!salt) return null;
	try {
		const bytes = fromBase64Url(salt);
		if (bytes.length < 8) return null;
		return { salt: bytes, name: params.get('n') ?? '' };
	} catch {
		return null;
	}
}
