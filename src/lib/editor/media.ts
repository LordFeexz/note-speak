/**
 * Turning a picked file into something safe to embed in a note.
 *
 * Media lives inside `note.body` as a base64 data URI, which keeps a note
 * self-contained and free of any third-party host — but that body is also
 * searched, exported, and for a shared note signed and relayed to every peer on
 * each edit. So the size of what goes in is the whole design:
 *
 * - **Images** are re-encoded, because we can. A 4 MB phone photo becomes a few
 *   hundred KB with no visible loss at note width.
 * - **Everything else** can only be measured, because in-browser transcoding of
 *   video needs a library far larger than this entire app. Oversized files are
 *   refused with the real numbers rather than silently truncated or left to
 *   freeze the tab.
 */

/**
 * Successive downscale attempts, widest first.
 *
 * A single pass bounds the *input* but not the output: a noisy or highly
 * detailed photo can still encode to close to a megabyte at 1600px. Since it is
 * the output that lands in the note body — searched, and for a shared note
 * signed and relayed — the encoder retries smaller until it fits.
 */
const IMAGE_STEPS = [
	{ edge: 1600, quality: 0.82 },
	{ edge: 1280, quality: 0.75 },
	{ edge: 1024, quality: 0.68 },
	{ edge: 800, quality: 0.6 }
] as const;

/** Target for the encoded image, before base64 adds its ~37%. */
const IMAGE_TARGET_BYTES = 300 * 1024;

/** Hard ceilings on the raw file, before base64 adds its ~37%. */
export const MEDIA_LIMITS = {
	image: 12 * 1024 * 1024, // pre-downscale; the output is far smaller
	video: 5 * 1024 * 1024,
	audio: 5 * 1024 * 1024,
	file: 2 * 1024 * 1024
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export type MediaResult =
	| { ok: true; src: string; name: string; size: string; bytes: number }
	| { ok: false; reason: string };

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/**
 * Re-encode an image to at most `MAX_IMAGE_EDGE` on its long side.
 *
 * WebP where the browser supports it, falling back to JPEG. Transparency is the
 * one case that must not be flattened, so PNG/GIF sources with an alpha channel
 * keep PNG output.
 */
async function encodeAt(
	bitmap: ImageBitmap,
	edge: number,
	quality: number,
	type: string
): Promise<Blob> {
	const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	// OffscreenCanvas keeps the work off the main thread where it exists.
	const canvas =
		typeof OffscreenCanvas !== 'undefined'
			? new OffscreenCanvas(width, height)
			: Object.assign(document.createElement('canvas'), { width, height });

	const context = (canvas as HTMLCanvasElement).getContext('2d');
	if (!context) throw new Error('no 2d context');
	context.drawImage(bitmap, 0, 0, width, height);

	if (canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({ type, quality });
	}
	return new Promise<Blob>((resolve, reject) => {
		(canvas as HTMLCanvasElement).toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
			type,
			quality
		);
	});
}

async function downscaleImage(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	// Transparency is the one thing that must not be flattened, so sources that
	// may carry an alpha channel stay PNG.
	const mightHaveAlpha = /image\/(png|gif|webp)/.test(file.type);
	const type = mightHaveAlpha ? 'image/png' : 'image/webp';

	try {
		let best: Blob | null = null;
		for (const step of IMAGE_STEPS) {
			best = await encodeAt(bitmap, step.edge, step.quality, type);
			if (best.size <= IMAGE_TARGET_BYTES) break;
		}
		return best!;
	} finally {
		bitmap.close();
	}
}

/**
 * Prepare a picked file for embedding.
 *
 * Never throws for ordinary failures — an unreadable or oversized file returns
 * `{ ok: false, reason }` so the caller can say something specific instead of
 * showing a stack trace.
 */
export async function prepareMedia(file: File, kind: MediaKind): Promise<MediaResult> {
	const limit = MEDIA_LIMITS[kind];

	if (kind !== 'image' && file.size > limit) {
		return {
			ok: false,
			// The numbers matter: "too large" alone leaves someone guessing whether
			// trimming a second off the clip would help.
			reason: `That ${kind} is ${formatBytes(file.size)}. Notes can hold up to ${formatBytes(limit)}, because the file is stored inside the note itself.`
		};
	}
	if (kind === 'image' && file.size > limit) {
		return {
			ok: false,
			reason: `That image is ${formatBytes(file.size)}, which is too large to process. Try one under ${formatBytes(limit)}.`
		};
	}

	try {
		const blob = kind === 'image' ? await downscaleImage(file) : file;
		const src = await readAsDataUrl(blob);
		return {
			ok: true,
			src,
			name: file.name,
			size: formatBytes(blob.size),
			bytes: blob.size
		};
	} catch {
		return {
			ok: false,
			reason: `That ${kind} could not be read. It may be corrupt or an unsupported format.`
		};
	}
}

/**
 * Warn before storage runs out.
 *
 * Failing on write leaves a half-inserted note; asking first lets us say so
 * while the user still has the file in hand.
 */
export async function storagePressure(incoming: number): Promise<string | null> {
	if (!navigator.storage?.estimate) return null;
	try {
		const { quota, usage } = await navigator.storage.estimate();
		if (!quota || usage === undefined) return null;
		const free = quota - usage;
		if (incoming > free) {
			return `Not enough storage left — this needs ${formatBytes(incoming)} and only ${formatBytes(free)} is free.`;
		}
		if (free - incoming < quota * 0.1) {
			return `Storage is nearly full (${formatBytes(free - incoming)} left). Export a backup before adding more media.`;
		}
		return null;
	} catch {
		return null;
	}
}

/** File-picker `accept` values, kept next to the limits they go with. */
export const MEDIA_ACCEPT: Record<MediaKind, string> = {
	image: 'image/*',
	video: 'video/*',
	audio: 'audio/*',
	file: '*/*'
};
