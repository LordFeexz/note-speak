<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
	import SquareArrowUp01Icon from '@hugeicons/core-free-icons/SquareArrowUp01Icon';
	import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	/** Chromium's install event — not in lib.dom, so it's typed here. */
	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};

	let deferred = $state<BeforeInstallPromptEvent | null>(null);
	let installed = $state(false);
	let iosHelpOpen = $state(false);

	const isStandalone =
		typeof window !== 'undefined' &&
		(window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as unknown as { standalone?: boolean }).standalone === true);

	// Safari fires no beforeinstallprompt, so iOS gets manual instructions instead.
	const isIOS =
		typeof navigator !== 'undefined' &&
		/iphone|ipad|ipod/i.test(navigator.userAgent) &&
		!/crios|fxios/i.test(navigator.userAgent);

	const visible = $derived(!isStandalone && !installed && (!!deferred || isIOS));

	$effect(() => {
		const onPrompt = (event: Event) => {
			event.preventDefault();
			deferred = event as BeforeInstallPromptEvent;
		};
		const onInstalled = () => {
			installed = true;
			deferred = null;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function install() {
		if (!deferred) {
			iosHelpOpen = true;
			return;
		}
		await deferred.prompt();
		const { outcome } = await deferred.userChoice;
		if (outcome === 'accepted') installed = true;
		deferred = null;
	}
</script>

{#if visible}
	<Button variant="secondary" size="sm" class="w-full justify-start" onclick={install}>
		<HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
		Install app
	</Button>
{/if}

<Dialog.Root bind:open={iosHelpOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Install Note Speak</Dialog.Title>
			<Dialog.Description>
				Safari installs web apps from the Share menu rather than a prompt.
			</Dialog.Description>
		</Dialog.Header>
		<ol class="flex flex-col gap-3 text-sm text-muted-foreground">
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={SquareArrowUp01Icon} strokeWidth={2} class="size-4 shrink-0" />
				Tap the <strong class="font-medium text-foreground">Share</strong> button in the toolbar.
			</li>
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} class="size-4 shrink-0" />
				Choose <strong class="font-medium text-foreground">Add to Home Screen</strong>.
			</li>
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={Download04Icon} strokeWidth={2} class="size-4 shrink-0" />
				Tap <strong class="font-medium text-foreground">Add</strong> — it launches like a native app.
			</li>
		</ol>
	</Dialog.Content>
</Dialog.Root>
