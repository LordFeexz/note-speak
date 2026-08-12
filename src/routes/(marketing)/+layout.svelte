<script lang="ts">
	import { resolve } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
	import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon';
	import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
	import { toggleMode, mode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';

	let { children } = $props();

	const year = new Date().getFullYear();
</script>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-40 safe-t">
		<nav
			class="mx-auto mt-3 flex w-[min(72rem,calc(100%-1.5rem))] items-center gap-3 rounded-full border glass-hairline px-4 py-2 shadow-sm glass"
			aria-label="Main"
		>
			<a href={resolve('/')} class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="grid size-7 place-items-center rounded-full bg-note-accent text-white">
					<HugeiconsIcon icon={Mic01Icon} strokeWidth={2} class="size-4" />
				</span>
				Note Speak
			</a>
			<div class="flex-1"></div>
			<a
				href={resolve('/privacy')}
				class="hidden rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
			>
				Privacy
			</a>
			<Button variant="ghost" size="icon-sm" onclick={toggleMode} aria-label="Toggle dark mode">
				{#if mode.current === 'dark'}
					<HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
				{:else}
					<HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
				{/if}
			</Button>
			<Button size="sm" href={resolve('/app')}>Open app</Button>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-24 border-t border-[var(--glass-border)] safe-b">
		<div
			class="mx-auto flex w-[min(72rem,calc(100%-3rem))] flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center"
		>
			<p class="flex-1">© {year} Note Speak. Your notes stay on your device.</p>
			<nav class="flex gap-5" aria-label="Legal">
				<a href={resolve('/terms')} class="transition-colors hover:text-foreground">Terms</a>
				<a href={resolve('/privacy')} class="transition-colors hover:text-foreground">Privacy</a>
				<a href={resolve('/app')} class="transition-colors hover:text-foreground">Open app</a>
			</nav>
		</div>
	</footer>
</div>
