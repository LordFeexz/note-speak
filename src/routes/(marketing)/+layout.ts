// The opposite of the app group: these pages exist to be read by people who
// have not installed anything, and by crawlers. `ssr = true` is the whole point
// — prerendering with SSR off would emit an empty shell with no content in it.
export const ssr = true;
export const prerender = true;
