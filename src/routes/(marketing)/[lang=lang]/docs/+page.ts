import type { EntryGenerator } from './$types';
import { LANGS } from '$lib/i18n/lang';

/**
 * Prerender both languages.
 *
 * The crawler would find these by following links, but declaring them means the
 * build fails loudly if a nav link is ever dropped, rather than quietly shipping
 * one language.
 */
export const entries: EntryGenerator = () => LANGS.map((lang) => ({ lang }));
