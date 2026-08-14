import { get, set } from 'idb-keyval';
import { LANG, isLang, resolveLang, type Lang } from './lang';

/**
 * The app's interface language.
 *
 * Kept in its own IndexedDB key rather than on `notes.prefs`, for two reasons
 * that both matter:
 *
 * - The notes store seeds a welcome note on first launch, so it needs to *read*
 *   the locale. Putting the locale inside that same store would be a circular
 *   import.
 * - This has to resolve before the first paint, and prefs load alongside every
 *   note in the database. A single small key loads in its own time.
 *
 * The marketing and docs pages do not use this: they are prerendered per
 * language and take the locale from the route, because a server has no idea what
 * is in this device's IndexedDB.
 */

const KEY = 'note-speak:locale';

class LocaleStore {
	/**
	 * Starts at English and is corrected once storage answers.
	 *
	 * A synchronous default is needed because components render before the load
	 * resolves; English is the safer guess to flash than a language the reader may
	 * not have chosen.
	 */
	current = $state<Lang>(LANG.EN);
	loaded = $state(false);

	async load() {
		if (this.loaded) return;
		const saved = await get<string>(KEY);
		// A saved choice always wins. Only a first-time visitor is guessed at, from
		// the browser's own language — the same rule the dictation picker uses.
		this.current = isLang(saved)
			? saved
			: resolveLang(typeof navigator === 'undefined' ? null : navigator.language);
		this.loaded = true;
		this.#reflect();
	}

	set(lang: Lang) {
		if (this.current === lang) return;
		this.current = lang;
		this.#reflect();
		void set(KEY, lang);
	}

	/**
	 * Keep `<html lang>` in step.
	 *
	 * Screen readers pick a voice from it, and browsers pick hyphenation and
	 * spell-check dictionaries — so leaving it at the `app.html` default would
	 * have an Indonesian interface read aloud in an English voice.
	 */
	#reflect() {
		if (typeof document !== 'undefined') document.documentElement.lang = this.current;
	}
}

export const locale = new LocaleStore();
