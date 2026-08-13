// The invite lives in the URL fragment, which never reaches a server — so there
// is nothing to render server-side and nothing to prerender per workspace. The
// page is a shell that reads `location.hash` in the browser.
export const prerender = true;
export const ssr = false;
