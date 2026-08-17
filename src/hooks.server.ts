import type { Handle } from '@sveltejs/kit';
import { LANG, isLang } from '$lib/i18n/lang';

/**
 * Fill `<html lang="%lang%">` from the route.
 *
 * The docs are prerendered per language, so each file has to declare its own —
 * a single hardcoded `lang` in `app.html` would tell a screen reader that the
 * Indonesian pages are English, and it would pick an English voice for them.
 *
 * Runs during prerendering as well as at request time, which is the whole point:
 * these pages are static files by the time anyone reads them.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const now = Date.now();
	const [, first] = event.url.pathname.split('/');
	const lang = isLang(first) ? first : LANG.EN;
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
	console.log(
		`[${event.request.method}] ${event.url.pathname} - ${response.status} (${Date.now() - now}ms)`
	);

	return response;
};
