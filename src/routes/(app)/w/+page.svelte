<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon';
	import { Button } from '$lib/components/ui/button';
	import WorkspaceDialog from '$lib/components/workspace-dialog.svelte';
	import { notes, workspacePane } from '$lib/stores/notes.svelte';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { parseInvite } from '$lib/workspace/keys';

	/**
	 * The join landing page for an invite link.
	 *
	 * Everything identifying arrives in the fragment, which the browser never
	 * sends to a server — so this page is rendered entirely on the client and the
	 * gateway never learns which workspace anyone was invited to.
	 */

	let fragment = $state('');
	let ready = $state(false);
	let open = $state(false);
	let mode = $state<'join' | 'create'>('join');

	const invite = $derived(fragment ? parseInvite(fragment) : null);

	onMount(() => {
		fragment = location.hash;
		void notes.load().then(() => workspaces.load());
		ready = true;
		if (parseInvite(location.hash)) open = true;
	});

	function joined(id: string) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${resolve('/app')}?folder=${encodeURIComponent(workspacePane(id))}`);
	}
</script>

<svelte:head>
	<title>Join a workspace · Note Speak</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="ambient-backdrop flex min-h-dvh items-center justify-center p-6">
	<div class="w-full max-w-md glass-panel rounded-2xl p-8 text-center">
		<div
			class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
		>
			<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} class="size-6" />
		</div>

		{#if !ready}
			<p class="text-sm text-muted-foreground">Reading the invite…</p>
		{:else if invite}
			<h1 class="text-xl font-semibold tracking-tight">
				{invite.name || 'A workspace'}
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				You have the link. You also need the passphrase — it never travels with the link, and there
				is no way to recover it or reset it.
			</p>
			<Button class="mt-6 w-full" onclick={() => (open = true)}>Enter the passphrase</Button>
		{:else}
			<h1 class="text-xl font-semibold tracking-tight">This invite link is incomplete</h1>
			<!--
				Specific about the likely cause. The salt lives in the fragment, which is
				exactly the part chat apps and email clients truncate.
			-->
			<p class="mt-2 text-sm text-muted-foreground">
				The part after the <code class="rounded bg-muted px-1 py-0.5 text-xs">#</code> is missing, which
				is the part that carries the invite. Ask for the link again, and paste it rather than retyping
				it.
			</p>
			<Button variant="outline" class="mt-6 w-full" href={resolve('/app')}>Go to my notes</Button>
		{/if}
	</div>
</div>

<WorkspaceDialog bind:open bind:mode invite={fragment} onjoined={joined} />
