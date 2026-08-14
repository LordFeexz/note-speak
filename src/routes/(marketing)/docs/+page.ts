import { redirect } from '@sveltejs/kit';
import { LANG } from '$lib/i18n/lang';

/**
 * `/docs` is a convenience, not a page.
 *
 * Every real documentation URL carries its language, so this exists only so a
 * bare `/docs` typed by hand — or printed in the README — lands somewhere.
 * English is the default because it is the language the app was written in, not
 * because of anything about the reader; the switcher is in the sidebar.
 */
export const prerender = true;

export function load() {
	redirect(308, `/${LANG.EN}/docs`);
}
