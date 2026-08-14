<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{ ready: string; reload: string; offline: string }> = {
		en: {
			ready: 'A new version is ready',
			reload: 'Reload',
			offline: 'Ready to work offline'
		},
		id: {
			ready: 'Versi baru sudah siap',
			reload: 'Muat ulang',
			offline: 'Siap dipakai offline'
		}
	};
	// Read at call time rather than through `$derived`: this component renders
	// nothing, and both toasts fire long after mount.
	const t = () => DICT[locale.current];

	// The service worker is registered with `registerType: 'prompt'`, so a new
	// version waits until the user opts in rather than reloading under them.
	onMount(async () => {
		const { registerSW } = await import('virtual:pwa-register');
		const updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				toast(t().ready, {
					duration: Infinity,
					// `updateSW(true)` skips waiting *and* reloads — a bare reload would
					// keep serving the old worker.
					action: { label: t().reload, onClick: () => void updateSW(true) }
				});
			},
			onOfflineReady() {
				toast.success(t().offline);
			}
		});
	});
</script>
