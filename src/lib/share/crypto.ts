import * as ed from '@noble/ed25519';
import type { ShareInfo } from '$lib/types';

/**
 * Share credentials.
 *
 * There is no server-side record of a share: the link *is* the credential. Every
 * secret travels in the URL fragment, which browsers never send to a server, so
 * the signaling gateway sees room ids and nothing else.
 *
 * Two independent secrets, and the split is the whole security model:
 *
 * - `symKey` (AES-GCM) — needed to read. Both roles hold it.
 * - Ed25519 keypair — needed to *write*. Editors hold the seed; viewers get only
 *   the public key, so they can verify updates but cannot produce one that any
 *   other peer will accept.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function randomBytes(length: number): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * WebCrypto's types insist on a view backed by a plain `ArrayBuffer`, while a
 * `Uint8Array` may in principle be backed by a `SharedArrayBuffer`. Copying into
 * a fresh buffer satisfies that without an unchecked cast.
 */
function toBuffer(data: Uint8Array): ArrayBuffer {
	return data.slice().buffer as ArrayBuffer;
}

/** Mint a brand new share. The caller stores this and hands out links built from it. */
export async function createShare(mode: ShareInfo['mode'] = 'link'): Promise<ShareInfo> {
	const seed = randomBytes(32);
	const publicKey = await ed.getPublicKeyAsync(seed);
	return {
		// 128 bits of room id: unguessable, and unrelated to the note's local id so
		// a link reveals nothing about the device that made it.
		docId: toBase64Url(randomBytes(16)),
		symKey: toBase64Url(randomBytes(32)),
		signSeed: toBase64Url(seed),
		signPub: toBase64Url(publicKey),
		mode
	};
}

// ---- content key ----

export async function importKey(symKey: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		toBuffer(fromBase64Url(symKey)),
		{ name: 'AES-GCM' },
		false,
		['encrypt', 'decrypt']
	);
}

/** Encrypt a frame. The 12-byte IV is prepended, as is conventional for AES-GCM. */
export async function encrypt(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
	const iv = randomBytes(12);
	const cipher = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toBuffer(iv) }, key, toBuffer(data))
	);
	const out = new Uint8Array(iv.length + cipher.length);
	out.set(iv, 0);
	out.set(cipher, iv.length);
	return out;
}

/** Returns `null` on any failure — a frame from a stale key must not throw. */
export async function decrypt(key: CryptoKey, frame: Uint8Array): Promise<Uint8Array | null> {
	if (frame.length < 13) return null;
	try {
		const iv = frame.slice(0, 12);
		const body = frame.slice(12);
		return new Uint8Array(
			await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBuffer(iv) }, key, toBuffer(body))
		);
	} catch {
		return null;
	}
}

// ---- update signatures ----

export async function sign(seed: string, data: Uint8Array): Promise<string> {
	return toBase64Url(await ed.signAsync(data, fromBase64Url(seed)));
}

/**
 * Verify an update against the share's public key.
 *
 * Every peer runs this before applying anything, which is what makes view-only
 * real rather than cosmetic: a viewer can alter their own replica, but cannot
 * produce bytes another peer will accept.
 */
export async function verify(
	publicKey: string,
	data: Uint8Array,
	signature: string
): Promise<boolean> {
	try {
		return await ed.verifyAsync(fromBase64Url(signature), data, fromBase64Url(publicKey));
	} catch {
		return false;
	}
}

// ---- links ----

export type ShareLink = { docId: string; symKey: string; signSeed?: string; signPub: string };

export function buildShareUrl(origin: string, share: ShareInfo, canEdit: boolean): string {
	const params = new URLSearchParams();
	params.set('k', share.symKey);
	if (canEdit && share.signSeed) params.set('s', share.signSeed);
	else params.set('p', share.signPub);
	// The fragment is never transmitted, so the secrets stay off the wire and out
	// of server logs, proxies and Referer headers.
	return `${origin}/s/${share.docId}#${params.toString()}`;
}

/** Parse `#k=…&s=…` / `#k=…&p=…`. Returns null when anything required is missing. */
export async function parseShareFragment(
	docId: string,
	fragment: string
): Promise<ShareLink | null> {
	const params = new URLSearchParams(fragment.replace(/^#/, ''));
	const symKey = params.get('k');
	const seed = params.get('s');
	const pub = params.get('p');
	if (!symKey || (!seed && !pub)) return null;
	try {
		if (seed) {
			// Derive rather than trust: an edit link carries only the seed, so the
			// public key cannot disagree with it.
			const publicKey = await ed.getPublicKeyAsync(fromBase64Url(seed));
			return { docId, symKey, signSeed: seed, signPub: toBase64Url(publicKey) };
		}
		return { docId, symKey, signPub: pub! };
	} catch {
		return null;
	}
}

export { encoder, decoder };
