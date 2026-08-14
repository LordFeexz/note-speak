<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
	import SquareArrowUp01Icon from '@hugeicons/core-free-icons/SquareArrowUp01Icon';
	import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		install: string;
		title: string;
		description: string;
		share: string;
		shareStep: [string, string];
		addToHome: string;
		addStep: [string, string];
		add: string;
		addFinal: [string, string];
	}> = {
		en: {
			install: 'Install app',
			title: 'Install Note Speak',
			description: 'Safari installs web apps from the Share menu rather than a prompt.',
			share: 'Share',
			shareStep: ['Tap the ', ' button in the toolbar.'],
			addToHome: 'Add to Home Screen',
			addStep: ['Choose ', '.'],
			add: 'Add',
			addFinal: ['Tap ', ' — it launches like a native app.']
		},
		id: {
			install: 'Pasang aplikasi',
			title: 'Pasang Note Speak',
			description: 'Safari memasang aplikasi web lewat menu Bagikan, bukan lewat prompt.',
			share: 'Bagikan',
			shareStep: ['Ketuk tombol ', ' di bilah alat.'],
			addToHome: 'Tambahkan ke Layar Utama',
			addStep: ['Pilih ', '.'],
			add: 'Tambah',
			addFinal: ['Ketuk ', ' — aplikasinya terbuka seperti aplikasi asli.']
		}
	};
	const t = $derived(DICT[locale.current]);

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
		{t.install}
	</Button>
{/if}

<Dialog.Root bind:open={iosHelpOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{t.title}</Dialog.Title>
			<Dialog.Description>{t.description}</Dialog.Description>
		</Dialog.Header>
		<!--
			Each step is a [before, after] pair around the button name, because the
			name sits mid-sentence and Indonesian puts it in a different position.
		-->
		<ol class="flex flex-col gap-3 text-sm text-muted-foreground">
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={SquareArrowUp01Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span
					>{t.shareStep[0]}<strong class="font-medium text-foreground">{t.share}</strong>{t
						.shareStep[1]}</span
				>
			</li>
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} class="size-4 shrink-0" />
				<span
					>{t.addStep[0]}<strong class="font-medium text-foreground">{t.addToHome}</strong>{t
						.addStep[1]}</span
				>
			</li>
			<li class="flex items-center gap-2">
				<HugeiconsIcon icon={Download04Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span
					>{t.addFinal[0]}<strong class="font-medium text-foreground">{t.add}</strong>{t
						.addFinal[1]}</span
				>
			</li>
		</ol>
	</Dialog.Content>
</Dialog.Root>
