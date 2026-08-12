import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, type PluginOption } from 'vite';
import { attachSignaling } from './server/signaling.js';

/**
 * Runs the same signaling gateway under `vite dev`.
 *
 * Without this, sharing only works against a production build — and the one
 * thing that most needs live iteration is the peer handshake.
 */
function signalingDev(): PluginOption {
	return {
		name: 'note-speak-signaling',
		configureServer(server) {
			// Vite widens httpServer to include the http2 variants; dev is always http1.
			if (server.httpServer) attachSignaling(server.httpServer as never, { path: '/signal' });
		},
		configurePreviewServer(server) {
			if (server.httpServer) attachSignaling(server.httpServer as never, { path: '/signal' });
		}
	};
}

export default defineConfig({
	plugins: [
		signalingDev(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		SvelteKitPWA({
			// New versions wait for the user instead of reloading mid-edit.
			registerType: 'prompt',
			injectRegister: false,
			manifest: {
				name: 'Note Speak',
				short_name: 'Notes',
				description:
					'A fast, private note app with built-in voice dictation. Your notes stay on your device.',
				// The app lives at /app; / is the marketing page. Scope stays at the
				// origin root so /s/<docId> share links still open in the installed app.
				start_url: '/app',
				scope: '/',
				display: 'standalone',
				orientation: 'any',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				categories: ['productivity', 'utilities'],
				// Long-press the installed icon. Chrome/Android and desktop honour these;
				// iOS ignores them, which costs nothing.
				shortcuts: [
					{ name: 'New note', short_name: 'New', url: '/app?new=1' },
					{ name: 'New voice note', short_name: 'Dictate', url: '/app?new=1&dictate=1' }
				],
				// GET rather than POST: a POST target needs a service-worker fetch handler,
				// which means giving up generateSW for injectManifest. GET covers text and
				// links. Aimed at /app so shared text lands in the app, not marketing.
				share_target: {
					action: '/app',
					method: 'GET',
					params: { title: 'shared_title', text: 'shared_text', url: 'shared_url' }
				},
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// woff2 matters: without it the app falls back to a system font offline.
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
				// Unknown routes get the *app* shell, which is what /s/<docId> needs
				// offline. The marketing and legal pages are prerendered HTML files and
				// are precached directly, so they never reach this fallback.
				navigateFallback: '/app',
				// The signaling endpoint must not be answered by the service worker,
				// or it intercepts the WebSocket upgrade.
				navigateFallbackDenylist: [/^\/signal/],
				cleanupOutdatedCaches: true
			},
			devOptions: {
				// Keeps `virtual:pwa-register` resolvable during `vite dev`.
				enabled: true,
				suppressWarnings: true,
				navigateFallback: '/app'
			}
		})
	]
});
