<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import ServiceWorkerUpdate from '$lib/components/service-worker-update.svelte';

	let { children } = $props();
</script>

<ModeWatcher />
<Toaster position="bottom-center" richColors closeButton />
<ServiceWorkerUpdate />
{@render children()}
