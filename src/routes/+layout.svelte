<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import ServiceWorkerUpdate from '$lib/components/service-worker-update.svelte';

	let { children } = $props();
</script>

<!-- The wash every glass surface blurs. One fixed layer, so panes composite
     against a continuous gradient rather than each carrying its own. -->
<div class="ambient-backdrop" aria-hidden="true"></div>

<ModeWatcher />
<Toaster position="bottom-center" richColors closeButton />
<ServiceWorkerUpdate />
{@render children()}
