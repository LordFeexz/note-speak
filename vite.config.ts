import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
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
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'any',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				categories: ['productivity', 'utilities'],
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
				navigateFallback: '/',
				cleanupOutdatedCaches: true
			},
			devOptions: {
				// Keeps `virtual:pwa-register` resolvable during `vite dev`.
				enabled: true,
				suppressWarnings: true,
				navigateFallback: '/'
			}
		})
	]
});
