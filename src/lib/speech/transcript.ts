/**
 * Turns raw recognition segments into text a person would actually write.
 *
 * Every function here is **pure**. That is a correctness requirement, not a
 * style preference: the editor replaces its whole dictation span with the
 * rendered result on every recognition event, so a re-delivered segment has to
 * produce identical output rather than a duplicate. (Chrome re-reports earlier
 * results, sometimes with `resultIndex` back at 0 — appending instead of
 * replacing is what produced "simpan simpan gambar simpan gambar ini".)
 */

type Command =
	| { kind: 'text'; value: string }
	/** Removes the preceding segment entirely. */
	| { kind: 'scratch' };

/**
 * Spoken phrases mapped to what they should produce.
 *
 * Keyed by the *primary subtag* so regional variants share a table — `en-GB`
 * and `en-US` want the same words, and `id-ID` is the only Indonesian tag.
 */
const COMMANDS: Record<string, Record<string, Command>> = {
	en: {
		period: { kind: 'text', value: '.' },
		'full stop': { kind: 'text', value: '.' },
		comma: { kind: 'text', value: ',' },
		'question mark': { kind: 'text', value: '?' },
		'exclamation mark': { kind: 'text', value: '!' },
		'exclamation point': { kind: 'text', value: '!' },
		colon: { kind: 'text', value: ':' },
		semicolon: { kind: 'text', value: ';' },
		'new line': { kind: 'text', value: '\n' },
		newline: { kind: 'text', value: '\n' },
		'new paragraph': { kind: 'text', value: '\n\n' },
		'scratch that': { kind: 'scratch' }
	},
	id: {
		titik: { kind: 'text', value: '.' },
		koma: { kind: 'text', value: ',' },
		'tanda tanya': { kind: 'text', value: '?' },
		'tanda seru': { kind: 'text', value: '!' },
		'titik dua': { kind: 'text', value: ':' },
		'titik koma': { kind: 'text', value: ';' },
		'baris baru': { kind: 'text', value: '\n' },
		'paragraf baru': { kind: 'text', value: '\n\n' },
		'hapus itu': { kind: 'scratch' }
	}
};

/**
 * Scripts where inserting capital letters would be wrong or meaningless.
 *
 * Japanese, Chinese, Korean, Arabic and Hindi have no letter case at all.
 * Russian has case but different sentence conventions, so it is left alone
 * rather than guessed at. German noun capitalization is deliberately not
 * attempted — getting it wrong is worse than not trying.
 */
const NO_CASE = new Set(['ja', 'zh', 'ko', 'ar', 'hi', 'ru', 'th', 'he']);

function primary(lang: string): string {
	return lang.toLowerCase().split('-')[0];
}

/** Longest phrases first, so "new paragraph" wins over "new". */
function phrasesFor(lang: string): [string, Command][] {
	const table = COMMANDS[primary(lang)];
	if (!table) return [];
	return Object.entries(table).sort((a, b) => b[0].length - a[0].length);
}

/**
 * Replace spoken command phrases inside one segment.
 *
 * Returns `null` when the segment is *only* a scratch command, which the caller
 * turns into "drop the previous segment".
 */
function applyCommandsToSegment(segment: string, phrases: [string, Command][]): string | null {
	let text = segment;
	let scratched = false;

	for (const [phrase, command] of phrases) {
		// Word-boundary match so "period" in "periodically" survives untouched.
		const pattern = new RegExp(`(^|[\\s,.!?])${escapeRegExp(phrase)}(?=$|[\\s,.!?])`, 'gi');
		if (command.kind === 'scratch') {
			if (pattern.test(text)) {
				scratched = true;
				text = text.replace(pattern, '$1');
			}
			continue;
		}
		text = text.replace(pattern, (_match, lead: string) =>
			// Drop a whitespace lead: punctuation attaches to the previous word, and a
			// newline shouldn't carry a trailing space. A non-space lead (another
			// punctuation mark) is real text and stays. Without this, turning
			// auto-punctuation off yields "hello there ." instead of "hello there.".
			/\s/.test(lead) ? command.value : lead + command.value
		);
	}

	if (scratched && text.trim() === '') return null;
	return text;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tidy the joined transcript: spacing around punctuation, sentence case, and
 * the doubled terminators that appear when the engine already auto-punctuated.
 */
function tidy(text: string, lang: string): string {
	let out = text;

	// Chrome auto-punctuates some locales (notably en-US), so a spoken "period"
	// lands next to one the engine already inserted: ". ." or "..".
	out = out.replace(/([.,!?;:])[\s]*(?=\1)/g, '');
	out = out.replace(/\s+([.,!?;:])/g, '$1');
	out = out.replace(/([.,!?;:])(?=[^\s.,!?;:\n])/g, '$1 ');
	out = out.replace(/[ \t]{2,}/g, ' ');
	out = out.replace(/[ \t]+\n/g, '\n');
	out = out.replace(/\n[ \t]+/g, '\n');

	if (!NO_CASE.has(primary(lang))) {
		// First letter of the text, and of anything following a terminator or newline.
		out = out.replace(/(^|[.!?]\s+|\n\s*)([\p{Ll}])/gu, (_m, lead: string, letter: string) =>
			lead === '' || /[.!?]\s+|\n/.test(lead) ? lead + letter.toUpperCase() : lead + letter
		);
	}

	return out;
}

export type TranscriptOptions = {
	lang: string;
	/** Map spoken tokens like "titik"/"period" to punctuation. */
	commands: boolean;
	/** Capitalize sentences and normalise spacing. */
	autoPunctuate: boolean;
};

/**
 * Render finalized recognition segments into note text.
 *
 * `segments` must be the *complete* list for the run, in order — the caller
 * rebuilds it from scratch on every event rather than appending, which is what
 * makes re-delivered results idempotent.
 */
export function renderTranscript(segments: string[], opts: TranscriptOptions): string {
	const phrases = opts.commands ? phrasesFor(opts.lang) : [];
	const kept: string[] = [];

	for (const raw of segments) {
		if (!opts.commands) {
			if (raw.trim()) kept.push(raw.trim());
			continue;
		}
		const processed = applyCommandsToSegment(raw, phrases);
		if (processed === null) {
			// A bare "scratch that" removes the utterance before it.
			kept.pop();
			continue;
		}
		if (processed.trim()) kept.push(processed.trim());
	}

	// Join on a space, but never introduce one before punctuation or after a
	// segment that ended in a newline command.
	let joined = '';
	for (const part of kept) {
		if (!joined) {
			joined = part;
			continue;
		}
		const needsSpace = !joined.endsWith('\n') && !/^[.,!?;:]/.test(part);
		joined += (needsSpace ? ' ' : '') + part;
	}

	return opts.autoPunctuate ? tidy(joined, opts.lang) : joined;
}
