// Rendering is decided per route group, not globally: the marketing and legal
// pages need real server-rendered HTML for crawlers, while the app itself is
// client-only. See (marketing)/+layout.ts and (app)/+layout.ts.
export const trailingSlash = 'never';
