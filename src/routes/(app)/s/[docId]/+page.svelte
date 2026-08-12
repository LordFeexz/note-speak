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
	<title>Shared note — Note Speak</title>
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
				Invalid link
			{:else if readOnly}
				Shared note · view only
			{:else}
				Shared note · you can edit
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
					{peerCount} other{peerCount === 1 ? '' : 's'}
				{:else if status === 'waiting'}
					Alone
				{:else}
					Connecting…
				{/if}
			</span>
			{#if readOnly}
				<span
					class="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
				>
					<HugeiconsIcon icon={ViewIcon} strokeWidth={2} class="size-3.5" />
					View only
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
					<Empty.Title>This link is incomplete</Empty.Title>
					<Empty.Description>
						A share link carries its keys after the <code>#</code>. Copying only part of it, or a
						link some apps have trimmed, can't open the note.
					</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button size="sm" href="/">
						<HugeiconsIcon icon={LinkBackwardIcon} strokeWidth={2} data-icon="inline-start" />
						Go to my notes
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
			<span class="truncate text-muted-foreground">
				Syncs directly between devices. Never stored on a server.
			</span>
			<Button variant="ghost" size="xs" href="/">My notes</Button>
		</footer>
	{:else}
		<div class="grid flex-1 place-items-center">
			<p class="text-sm text-muted-foreground">Opening…</p>
		</div>
	{/if}
</main>
