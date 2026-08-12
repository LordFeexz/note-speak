<script lang="ts">
	import { onMount } from 'svelte';

	let { children } = $props();

	/**
	 * Lock the viewport for the app only.
	 *
	 * The three-pane shell sizes itself to the screen and scrolls internally, so
	 * the document must not scroll behind it. The marketing and legal pages share
	 * the root layout and *do* need to scroll, so the lock is applied here rather
	 * than globally — and removed on the way out, otherwise navigating from the
	 * app to /privacy leaves that page frozen.
	 */
	onMount(() => {
		const root = document.documentElement;
		root.classList.add('app-viewport');
		return () => root.classList.remove('app-viewport');
	});
</script>

{@render children()}
