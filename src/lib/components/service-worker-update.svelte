<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// The service worker is registered with `registerType: 'prompt'`, so a new
	// version waits until the user opts in rather than reloading under them.
	onMount(async () => {
		const { registerSW } = await import('virtual:pwa-register');
		const updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				toast('A new version is ready', {
					duration: Infinity,
					// `updateSW(true)` skips waiting *and* reloads — a bare reload would
					// keep serving the old worker.
					action: { label: 'Reload', onClick: () => void updateSW(true) }
				});
			},
			onOfflineReady() {
				toast.success('Ready to work offline');
			}
		});
	});
</script>
