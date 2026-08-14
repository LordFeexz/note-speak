/**
 * The two languages Note Speak speaks.
 *
 * A `const` object rather than a TypeScript `enum`: `enum` emits a runtime value
 * that this project's build would have to erase, and `Lang` is a plain string
 * union either way — which is what makes `Dict<T>` able to demand every locale.
 */
export const LANG = { EN: 'en', ID: 'id' } as const;

export type Lang = (typeof LANG)[keyof typeof LANG];

/** Reading order, and the order the switcher lists them in. */
export const LANGS: Lang[] = [LANG.EN, LANG.ID];

/**
 * Endonyms — each language named in itself.
 *
 * "Bahasa Indonesia", never "Indonesian": someone looking for their own language
 * scans for the word they use for it, not for its English name.
 */
export const LANG_LABELS: Record<Lang, string> = {
	en: 'English',
	id: 'Bahasa Indonesia'
};

export function isLang(value: string | null | undefined): value is Lang {
	return value === LANG.EN || value === LANG.ID;
}

/**
 * Best language for a BCP-47 tag.
 *
 * Matches on the primary subtag, so `id-ID` and a bare `id` both resolve, and
 * anything unrecognised falls back to English rather than throwing. Mirrors how
 * `speech.svelte.ts` already picks the initial dictation language.
 */
export function resolveLang(tag: string | null | undefined): Lang {
	const primary = (tag ?? '').toLowerCase().split('-')[0];
	return isLang(primary) ? primary : LANG.EN;
}
