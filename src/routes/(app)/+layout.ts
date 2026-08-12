// Everything here runs in the browser: notes live in IndexedDB and dictation
// uses the device's own speech engine, so there is nothing meaningful to render
// on the server. Prerendered as a shell that the client fills in.
export const ssr = false;
export const prerender = true;
