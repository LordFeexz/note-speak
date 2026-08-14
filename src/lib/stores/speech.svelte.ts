import { browser } from '$app/environment';
import { renderTranscript } from '$lib/speech/transcript';

/**
 * Minimal typings for the Web Speech API. It is not in every TS DOM lib and the
 * vendor-prefixed Safari/Chrome constructor is not typed at all.
 */
interface SRAlternative {
	transcript: string;
	confidence: number;
}
interface SRResult {
	readonly length: number;
	isFinal: boolean;
	item(index: number): SRAlternative;
	[index: number]: SRAlternative;
}
interface SRResultList {
	readonly length: number;
	item(index: number): SRResult;
	[index: number]: SRResult;
}
interface SREvent extends Event {
	resultIndex: number;
	results: SRResultList;
}
interface SRErrorEvent extends Event {
	error: string;
	message: string;
}
interface SpeechRecognitionLike extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((e: SREvent) => void) | null;
	onerror: ((e: SRErrorEvent) => void) | null;
	onend: (() => void) | null;
	onstart: (() => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SRConstructor | null {
	if (!browser) return null;
	const w = window as unknown as {
		SpeechRecognition?: SRConstructor;
		webkitSpeechRecognition?: SRConstructor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechUnsupportedReason = 'no-api' | 'insecure-context' | null;

export const LANGUAGES = [
	{ value: 'en-US', label: 'English (US)' },
	{ value: 'en-GB', label: 'English (UK)' },
	{ value: 'id-ID', label: 'Bahasa Indonesia' },
	{ value: 'es-ES', label: 'Español' },
	{ value: 'fr-FR', label: 'Français' },
	{ value: 'de-DE', label: 'Deutsch' },
	{ value: 'it-IT', label: 'Italiano' },
	{ value: 'pt-BR', label: 'Português (BR)' },
	{ value: 'nl-NL', label: 'Nederlands' },
	{ value: 'ja-JP', label: '日本語' },
	{ value: 'ko-KR', label: '한국어' },
	{ value: 'zh-CN', label: '中文 (简体)' },
	{ value: 'hi-IN', label: 'हिन्दी' },
	{ value: 'ar-SA', label: 'العربية' },
	{ value: 'ru-RU', label: 'Русский' }
];

/**
 * What went wrong, as a code the UI can translate.
 *
 * `null` means swallow it silently — `no-speech` and `aborted` fire during
 * ordinary use and a toast for either would be noise.
 */
export type SpeechErrorCode =
	| 'mic-blocked'
	| 'no-microphone'
	| 'needs-network'
	| 'no-language-model'
	| 'keeps-stopping'
	| 'cannot-start'
	| 'unknown';

function errorCode(code: string): SpeechErrorCode | null {
	switch (code) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'mic-blocked';
		case 'audio-capture':
			return 'no-microphone';
		case 'network':
			return 'needs-network';
		case 'language-not-supported':
			return 'no-language-model';
		case 'no-speech':
		case 'aborted':
			return null;
		default:
			return 'unknown';
	}
}

/**
 * Wraps the browser's native speech recognition. Nothing is sent to our own
 * servers — the engine is whatever the browser provides.
 */
class SpeechController {
	listening = $state(false);
	/**
	 * What the engine is doing right now, for the UI:
	 * - `starting`    — asked to listen; the mic permission / engine handshake is pending
	 * - `listening`   — running, nothing part-heard
	 * - `hearing`     — words are arriving and still changing
	 * - `processing`  — speech has stopped but the engine hasn't settled the text yet
	 */
	phase = $state<'idle' | 'starting' | 'listening' | 'hearing' | 'processing'>('idle');
	/** The not-yet-final tail, verbatim, replaced wholesale on every event. */
	interim = $state('');
	lang = $state('en-US');
	/** Map spoken tokens ("titik" / "period") to punctuation. */
	commands = $state(true);
	/** Capitalize sentences and tidy spacing. */
	autoPunctuate = $state(true);

	/**
	 * Finalized utterances this run, in order.
	 *
	 * Kept as separate segments rather than one joined string because
	 * "scratch that" means "drop the previous utterance" — joining first would
	 * destroy the only reliable boundary the engine gives us.
	 */
	#segments = $state<string[]>([]);

	#options() {
		return { lang: this.lang, commands: this.commands, autoPunctuate: this.autoPunctuate };
	}

	get segments(): string[] {
		return this.#segments;
	}

	/** Everything finalized this run, rendered. */
	get finalText(): string {
		return renderTranscript(this.#segments, this.#options());
	}

	/**
	 * Finalized text plus the part-heard tail, rendered as one piece.
	 *
	 * Commands apply to the interim tail too, so "titik" shows as "." as soon as
	 * it is heard rather than jumping when the segment settles. Safe because
	 * rendering is pure — this is only ever a preview of the same computation.
	 */
	get previewText(): string {
		const tail = this.interim.trim();
		return renderTranscript(tail ? [...this.#segments, tail] : this.#segments, this.#options());
	}

	readonly supported: boolean;
	readonly unsupportedReason: SpeechUnsupportedReason;

	/** Fired whenever `finalText`/`interim` change; the consumer rewrites the whole span. */
	onupdate: (() => void) | null = null;
	onerror: ((code: SpeechErrorCode) => void) | null = null;

	#recognition: SpeechRecognitionLike | null = null;
	/** What the *user* wants, as opposed to whether the engine happens to be running. */
	#intent: 'idle' | 'listening' = 'idle';
	/** Guards against a restart hot-loop when the engine fails immediately. */
	#restarts = 0;
	#lastStart = 0;
	/** Finalized transcripts by result index — a Map so a re-reported index overwrites. */
	#finals = new Map<number, string>();
	/** Segments finalized in earlier engine sessions, whose indices restarted at 0. */
	#carry: string[] = [];
	/** Flips `hearing` → `processing` once part-heard words stop changing. */
	#settleTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * The engine goes quiet between the last interim result and the final one — on a
	 * slow connection that gap is seconds long, and without this it looks frozen.
	 */
	#markSettling() {
		clearTimeout(this.#settleTimer);
		this.#settleTimer = setTimeout(() => {
			if (this.listening && this.interim) this.phase = 'processing';
		}, 700);
	}

	/** Carry-over plus this session's finals, ordered by result index. */
	#collect(): string[] {
		const parts = [...this.#finals.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t);
		return [...this.#carry, ...parts].map((part) => part.trim()).filter(Boolean);
	}

	constructor() {
		const Ctor = getConstructor();
		if (!browser) {
			this.supported = false;
			this.unsupportedReason = null;
		} else if (!Ctor) {
			this.supported = false;
			this.unsupportedReason = 'no-api';
		} else if (!window.isSecureContext) {
			this.supported = false;
			this.unsupportedReason = 'insecure-context';
		} else {
			this.supported = true;
			this.unsupportedReason = null;
		}
		if (browser) {
			const preferred = LANGUAGES.find((l) => l.value === navigator.language);
			const fallback = LANGUAGES.find((l) => l.value.startsWith(navigator.language.slice(0, 2)));
			this.lang = preferred?.value ?? fallback?.value ?? 'en-US';
		}
	}

	setLang(lang: string) {
		this.lang = lang;
		if (this.#recognition) this.#recognition.lang = lang;
	}

	/**
	 * Toggle transcript processing. Safe mid-run: rendering is pure, so the
	 * editor's next span rewrite simply reflects the new setting.
	 */
	setOption(key: 'commands' | 'autoPunctuate', value: boolean) {
		this[key] = value;
		this.onupdate?.();
	}

	#create(): SpeechRecognitionLike | null {
		const Ctor = getConstructor();
		if (!Ctor) return null;
		const rec = new Ctor();
		rec.lang = this.lang;
		rec.continuous = true;
		rec.interimResults = true;
		rec.maxAlternatives = 1;

		rec.onstart = () => {
			this.#restarts = 0;
			if (this.phase === 'starting') this.phase = 'listening';
		};

		rec.onresult = (event) => {
			// Results are keyed by their index rather than appended: Chrome re-reports
			// earlier results (sometimes with resultIndex back at 0), and appending them
			// duplicated the transcript — "simpan" / "simpan gambar" / "simpan gambar ini"
			// stacking up instead of each replacing the last.
			let interimText = '';
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				const transcript = result[0]?.transcript ?? '';
				if (result.isFinal) this.#finals.set(i, transcript);
				else interimText += transcript;
			}
			this.#segments = this.#collect();
			this.interim = interimText.trim();
			if (this.interim) {
				this.phase = 'hearing';
				this.#markSettling();
			} else {
				clearTimeout(this.#settleTimer);
				this.phase = 'listening';
			}
			this.onupdate?.();
		};

		rec.onerror = (event) => {
			const message = errorCode(event.error);
			if (message) {
				this.onerror?.(message);
				// Permission and hardware failures are terminal — don't fight them.
				if (event.error !== 'network') this.#intent = 'idle';
				this.#stopEngine();
			}
		};

		rec.onend = () => {
			// Chrome ends the session after a silence gap; keep going if the user hasn't stopped.
			if (this.#intent !== 'listening') {
				this.listening = false;
				this.phase = 'idle';
				this.interim = '';
				return;
			}
			const immediate = Date.now() - this.#lastStart < 500;
			this.#restarts = immediate ? this.#restarts + 1 : 0;
			if (this.#restarts >= 3) {
				this.#intent = 'idle';
				this.listening = false;
				this.phase = 'idle';
				this.onerror?.('keeps-stopping');
				return;
			}
			try {
				// A new session numbers its results from 0 again, so fold whatever is
				// already finalized into the carry before the map gets reused.
				this.#carry = this.#collect();
				this.#finals.clear();
				this.#lastStart = Date.now();
				this.#recognition?.start();
			} catch {
				this.#intent = 'idle';
				this.listening = false;
				this.phase = 'idle';
			}
		};

		return rec;
	}

	#stopEngine() {
		clearTimeout(this.#settleTimer);
		this.listening = false;
		this.phase = 'idle';
		this.interim = '';
		const rec = this.#recognition;
		this.#recognition = null;
		if (!rec) return;
		rec.onend = null;
		rec.onerror = null;
		rec.onresult = null;
		try {
			rec.abort();
		} catch {
			/* engine already torn down */
		}
	}

	/** Must be called synchronously from a user gesture. */
	start() {
		if (!this.supported || this.listening) return;
		const rec = this.#create();
		if (!rec) return;
		this.#recognition = rec;
		this.#intent = 'listening';
		this.#restarts = 0;
		this.#lastStart = Date.now();
		// Fresh run: previous transcripts are already committed to the note.
		this.#finals.clear();
		this.#carry = [];
		this.#segments = [];
		this.interim = '';
		try {
			rec.start();
			this.listening = true;
			// `onstart` clears this once the engine (and mic permission) is actually ready.
			this.phase = 'starting';
		} catch {
			this.#intent = 'idle';
			this.#stopEngine();
			this.onerror?.('cannot-start');
		}
	}

	stop() {
		this.#intent = 'idle';
		this.#stopEngine();
	}

	toggle() {
		if (this.listening) this.stop();
		else this.start();
	}
}

export const speech = new SpeechController();
