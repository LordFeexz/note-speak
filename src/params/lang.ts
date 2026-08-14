import type { ParamMatcher } from '@sveltejs/kit';
import { isLang } from '$lib/i18n/lang';

/**
 * Only `en` and `id` are languages.
 *
 * Without this, `/docs` would also match `[lang]/…` with `lang = "docs"`, and
 * any typo would render an empty page rather than a 404. The reference project
 * this pattern comes from validates the segment in middleware and then casts;
 * a matcher does the same job at the routing layer, where a miss is a real 404.
 */
export const match: ParamMatcher = (param) => isLang(param);
