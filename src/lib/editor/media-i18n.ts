import type { Dict } from '$lib/i18n/dict';
import { locale } from '$lib/i18n/locale.svelte';
import type { MediaError, MediaKind, StoragePressure } from './media';

/**
 * Sentences for the media and sharing failure codes.
 *
 * Shared by the local editor and the collaborative one, which both pick files
 * and both show the same toasts — the copy should not be able to drift between
 * a note you own and a note you are editing with someone else.
 */

const DICT: Dict<{
	kinds: Record<MediaKind, string>;
	tooLarge: (kind: string, size: string, limit: string) => string;
	imageTooLarge: (size: string, limit: string) => string;
	unreadable: (kind: string) => string;
	insufficient: (needs: string, free: string) => string;
	nearlyFull: (left: string) => string;
	updateTooLarge: string;
}> = {
	en: {
		kinds: { image: 'image', video: 'video', audio: 'audio', file: 'file' },
		tooLarge: (kind, size, limit) =>
			`That ${kind} is ${size}. Notes can hold up to ${limit}, because the file is stored inside the note itself.`,
		imageTooLarge: (size, limit) =>
			`That image is ${size}, which is too large to process. Try one under ${limit}.`,
		unreadable: (kind) =>
			`That ${kind} could not be read. It may be corrupt or an unsupported format.`,
		insufficient: (needs, free) =>
			`Not enough storage left — this needs ${needs} and only ${free} is free.`,
		nearlyFull: (left) =>
			`Storage is nearly full (${left} left). Export a backup before adding more media.`,
		updateTooLarge: 'That change is too large to share.'
	},
	id: {
		kinds: { image: 'gambar', video: 'video', audio: 'audio', file: 'berkas' },
		tooLarge: (kind, size, limit) =>
			`${kind} itu berukuran ${size}. Catatan hanya memuat hingga ${limit}, karena berkasnya disimpan di dalam catatan itu sendiri.`,
		imageTooLarge: (size, limit) =>
			`Gambar itu berukuran ${size}, terlalu besar untuk diproses. Coba yang di bawah ${limit}.`,
		unreadable: (kind) =>
			`${kind} itu tidak bisa dibaca. Mungkin rusak atau formatnya tidak didukung.`,
		insufficient: (needs, free) =>
			`Penyimpanan tidak cukup — ini butuh ${needs} sedangkan hanya ${free} yang tersisa.`,
		nearlyFull: (left) =>
			`Penyimpanan hampir penuh (tersisa ${left}). Ekspor cadangan sebelum menambah media lagi.`,
		updateTooLarge: 'Perubahan itu terlalu besar untuk dibagikan.'
	}
};

export function mediaErrorMessage(error: MediaError): string {
	const t = DICT[locale.current];
	if (error.code === 'image-too-large') return t.imageTooLarge(error.size, error.limit);
	if (error.code === 'unreadable') return t.unreadable(t.kinds[error.kind]);
	return t.tooLarge(t.kinds[error.kind], error.size, error.limit);
}

export function storagePressureMessage(pressure: StoragePressure): string {
	const t = DICT[locale.current];
	return pressure.code === 'insufficient'
		? t.insufficient(pressure.needs, pressure.free)
		: t.nearlyFull(pressure.left);
}

export function shareErrorMessage(code: 'update-too-large'): string {
	void code;
	return DICT[locale.current].updateTooLarge;
}
