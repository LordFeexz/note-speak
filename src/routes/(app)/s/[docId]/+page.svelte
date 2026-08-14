<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import ViewIcon from '@hugeicons/core-free-icons/ViewIcon';
	import LinkBackwardIcon from '@hugeicons/core-free-icons/LinkBackwardIcon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';

	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import CollabEditor from '$lib/components/collab-editor.svelte';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		pageTitle: string;
		invalid: string;
		viewOnlyHeader: string;
		editableHeader: string;
		others: (n: number) => string;
		alone: string;
		connecting: string;
		viewOnly: string;
		brokenTitle: string;
		brokenBefore: string;
		brokenAfter: string;
		goToNotes: string;
		footer: string;
		myNotes: string;
		opening: string;
	}> = {
		en: {
			pageTitle: 'Shared note — Note Speak',
			invalid: 'Invalid link',
			viewOnlyHeader: 'Shared note · view only',
			editableHeader: 'Shared note · you can edit',
			others: (n) => `${n} other${n === 1 ? '' : 's'}`,
			alone: 'Alone',
			connecting: 'Connecting…',
			viewOnly: 'View only',
			brokenTitle: 'This link is incomplete',
			brokenBefore: 'A share link carries its keys after the ',
			brokenAfter:
				". Copying only part of it, or a link some apps have trimmed, can't open the note.",
			goToNotes: 'Go to my notes',
			footer: 'Syncs directly between devices. Never stored on a server.',
			myNotes: 'My notes',
			opening: 'Opening…'
		},
		id: {
			pageTitle: 'Catatan bersama — Note Speak',
			invalid: 'Tautan tidak valid',
			viewOnlyHeader: 'Catatan bersama · hanya baca',
			editableHeader: 'Catatan bersama · Anda bisa menyunting',
			others: (n) => `${n} orang lain`,
			alone: 'Sendirian',
			connecting: 'Menyambung…',
			viewOnly: 'Hanya baca',
			brokenTitle: 'Tautan ini tidak lengkap',
			brokenBefore: 'Tautan berbagi membawa kuncinya setelah ',
			brokenAfter:
				'. Menyalin sebagiannya saja, atau tautan yang dipotong oleh sebagian aplikasi, tidak bisa membuka catatannya.',
			goToNotes: 'Buka catatan saya',
			footer: 'Tersinkron langsung antar perangkat. Tidak pernah disimpan di server.',
			myNotes: 'Catatan saya',
			opening: 'Membuka…'
		}
	};
	const t = $derived(DICT[locale.current]);
	import { notes } from '$lib/stores/notes.svelte';
	import { parseShareFragment, type ShareLink } from '$lib/share/crypto';
	import { trackViewportHeight } from '$lib/viewport.svelte';
	import type { Identity } from '$lib/share/session';

	let link = $state<ShareLink | null>(null);
	let identity = $state<Identity | null>(null);
	let broken = $state(false);
	let peerCount = $state(0);
	let status = $state<'connecting' | 'waiting' | 'connected'>('connecting');

	const docId = $derived(page.params.docId ?? '');
	const readOnly = $derived(link !== null && !link.signSeed);

	onMount(() => {
		void (async () => {
			await notes.load();
			identity = await notes.identity();
			// The fragment carries the keys and is never sent to a server — which is
			// also why this must be read on the client, not in a load function.
			const parsed = await parseShareFragment(docId, location.hash);
			if (!parsed) broken = true;
			else link = parsed;
		})();
		return trackViewportHeight();
	});
</script>

<svelte:head>
	<title>{t.pageTitle}</title>
	<!-- A share link must never reach an index; the fragment is the credential. -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main
	class="flex w-full flex-col overflow-hidden safe-x glass-strong"
	style="height: var(--app-height, 100dvh); transform: translateY(var(--app-offset, 0px));"
>
	<header class="flex items-center gap-2 border-b px-3 py-2 safe-t">
		<HugeiconsIcon
			icon={Note01Icon}
			strokeWidth={2}
			class="size-4 shrink-0 text-muted-foreground"
		/>
		<p class="flex-1 truncate text-xs text-muted-foreground">
			{#if broken}
				{t.invalid}
			{:else if readOnly}
				{t.viewOnlyHeader}
			{:else}
				{t.editableHeader}
			{/if}
		</p>

		{#if link}
			<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
				<span
					class="size-2 shrink-0 rounded-full {status === 'connected'
						? 'bg-emerald-500'
						: status === 'waiting'
							? 'bg-amber-500'
							: 'animate-pulse bg-muted-foreground'}"
					aria-hidden="true"
				></span>
				{#if status === 'connected'}
					{t.others(peerCount)}
				{:else if status === 'waiting'}
					{t.alone}
				{:else}
					{t.connecting}
				{/if}
			</span>
			{#if readOnly}
				<span
					class="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
				>
					<HugeiconsIcon icon={ViewIcon} strokeWidth={2} class="size-3.5" />
					{t.viewOnly}
				</span>
			{/if}
		{/if}
	</header>

	{#if broken}
		<div class="grid flex-1 place-items-center p-6">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
					</Empty.Media>
					<Empty.Title>{t.brokenTitle}</Empty.Title>
					<Empty.Description>
						{t.brokenBefore}<code>#</code>{t.brokenAfter}
					</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button size="sm" href="/">
						<HugeiconsIcon icon={LinkBackwardIcon} strokeWidth={2} data-icon="inline-start" />
						{t.goToNotes}
					</Button>
				</Empty.Content>
			</Empty.Root>
		</div>
	{:else if link && identity}
		<CollabEditor
			{link}
			{identity}
			onstate={(next) => {
				status = next.status;
				peerCount = next.peerCount;
			}}
		/>
		<footer class="flex items-center justify-between gap-2 border-t px-3 py-2 safe-b text-xs">
			<span class="truncate text-muted-foreground">{t.footer}</span>
			<Button variant="ghost" size="xs" href="/">{t.myNotes}</Button>
		</footer>
	{:else}
		<div class="grid flex-1 place-items-center">
			<p class="text-sm text-muted-foreground">{t.opening}</p>
		</div>
	{/if}
</main>
