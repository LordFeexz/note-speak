import { speech } from '$lib/stores/speech.svelte';
import { formatBytes, MEDIA_LIMITS } from './media';

/**
 * Records a voice clip and its transcript in one pass.
 *
 * The whole point of the block: `MediaRecorder` captures the audio while the
 * existing `SpeechController` transcribes the same speech, so the clip arrives
 * already searchable and re-readable. When the transcript garbles a name — which
 * it will — the audio is right there.
 *
 * Two mic consumers at once is the fragile part. Chrome desktop handles it;
 * iOS Safari frequently does not, so every failure path here must leave
 * *dictation* working and simply mark the block unavailable.
 */

/** Small enough to embed in a note, roughly 2–3 minutes of speech. */
const MAX_BYTES = MEDIA_LIMITS.audio;
/** Opus at this rate is clear for voice and about 240 KB per minute. */
const BITS_PER_SECOND = 32_000;

function pickMimeType(): string | null {
	if (typeof MediaRecorder === 'undefined') return null;
	// Safari produces mp4/aac rather than webm/opus, so ask rather than assume.
	for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
		if (MediaRecorder.isTypeSupported(type)) return type;
	}
	return null;
}

export function recordingSupported(): boolean {
	return (
		typeof MediaRecorder !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia &&
		pickMimeType() !== null
	);
}

export type VoiceClip = { src: string; duration: string; transcript: string; bytes: number };

export class VoiceRecorder {
	recording = $state(false);
	seconds = $state(0);
	/** Live transcript, so there is feedback while speaking. */
	transcript = $state('');
	error = $state<string | null>(null);

	#recorder: MediaRecorder | null = null;
	#stream: MediaStream | null = null;
	#chunks: Blob[] = [];
	#tick: ReturnType<typeof setInterval> | undefined;
	#wasDictating = false;

	async start(): Promise<boolean> {
		if (this.recording) return false;
		const mimeType = pickMimeType();
		if (!mimeType) {
			this.error = "This browser can't record audio.";
			return false;
		}

		try {
			this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			this.error = 'Microphone access was blocked. Allow it in your browser settings.';
			return false;
		}

		try {
			this.#recorder = new MediaRecorder(this.#stream, {
				mimeType,
				audioBitsPerSecond: BITS_PER_SECOND
			});
		} catch {
			this.#teardown();
			this.error = "This browser can't record in a supported format.";
			return false;
		}

		this.#chunks = [];
		this.#recorder.ondataavailable = (event) => {
			if (event.data.size) this.#chunks.push(event.data);
		};
		this.#recorder.start(1000);

		this.seconds = 0;
		this.transcript = '';
		this.error = null;
		this.recording = true;
		this.#tick = setInterval(() => {
			this.seconds += 1;
			// Stop at the ceiling rather than let the clip grow past what a note can
			// carry and fail only at insert time.
			if (this.seconds >= 180) void this.stop();
		}, 1000);

		// Transcribe the same speech. If the engine refuses — the common iOS case —
		// keep recording: a clip without a transcript still beats no clip.
		this.#wasDictating = speech.listening;
		if (speech.supported && !this.#wasDictating) {
			speech.onupdate = () => (this.transcript = speech.previewText);
			speech.start();
		}
		return true;
	}

	async stop(): Promise<VoiceClip | null> {
		if (!this.recording || !this.#recorder) return null;
		clearInterval(this.#tick);

		const finalTranscript = speech.finalText || this.transcript;
		if (speech.listening && !this.#wasDictating) speech.stop();
		speech.onupdate = null;

		const seconds = this.seconds;
		const recorder = this.#recorder;
		const blob = await new Promise<Blob>((resolve) => {
			recorder.onstop = () => resolve(new Blob(this.#chunks, { type: recorder.mimeType }));
			recorder.stop();
		});
		this.#teardown();

		if (blob.size > MAX_BYTES) {
			this.error = `That clip is ${formatBytes(blob.size)}; a note can hold ${formatBytes(MAX_BYTES)}.`;
			return null;
		}

		const src = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(blob);
		});

		return {
			src,
			duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
			transcript: finalTranscript.trim(),
			bytes: blob.size
		};
	}

	cancel() {
		clearInterval(this.#tick);
		if (speech.listening && !this.#wasDictating) speech.stop();
		speech.onupdate = null;
		try {
			this.#recorder?.stop();
		} catch {
			/* already stopped */
		}
		this.#teardown();
	}

	#teardown() {
		// Releasing the tracks is what turns the browser's recording indicator off.
		// Leaving them open looks like the app is still listening.
		this.#stream?.getTracks().forEach((track) => track.stop());
		this.#stream = null;
		this.#recorder = null;
		this.#chunks = [];
		this.recording = false;
	}
}
