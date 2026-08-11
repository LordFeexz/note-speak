// Everything runs in the browser: notes live in IndexedDB and dictation uses the
// device's own speech engine, so there is nothing meaningful to render on the server.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'never';
