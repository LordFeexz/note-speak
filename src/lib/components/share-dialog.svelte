<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
	import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
	import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { notes } from '$lib/stores/notes.svelte';
	import { buildShareUrl, createShare } from '$lib/share/crypto';
	import type { Note } from '$lib/types';

	type Props = { open: boolean; note: Note | undefined };
	let { open = $bindable(false), note }: Props = $props();

	let busy = $state(false);
	let confirmRotate = $state(false);
	let confirmStop = $state(false);

	const share = $derived(note?.share ?? null);
	const origin = $derived(typeof location === 'undefined' ? '' : location.origin);
	const editUrl = $derived(share ? buildShareUrl(origin, share, true) : '');
	const viewUrl = $derived(share ? buildShareUrl(origin, share, false) : '');

	async function startSharing() {
		if (!note || busy) return;
		busy = true;
		try {
			notes.setShare(note.id, await createShare('link'));
			toast.success('Sharing on', { description: 'Anyone with the link can now open this note.' });
		} finally {
			busy = false;
		}
	}

	async function rotate() {
		if (!note) return;
		notes.setShare(note.id, await createShare(share?.mode ?? 'link'));
		confirmRotate = false;
		toast('New links issued', { description: 'The old links no longer work.' });
	}

	function stopSharing() {
		if (!note) return;
		notes.setShare(note.id, null);
		confirmStop = false;
		open = false;
		toast('Sharing stopped');
	}

	async function copy(url: string, label: string) {
		try {
			await navigator.clipboard.writeText(url);
			toast.success(`${label} link copied`);
		} catch {
			toast.error('Could not copy — select the link and copy it manually.');
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Share this note</Dialog.Title>
			<Dialog.Description>
				{#if share}
					Anyone holding a link can open it. Edits sync live between everyone who has it open.
				{:else}
					Create a link others can open. The note syncs directly between your devices — it is never
					stored on a server.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if !share}
			<Alert.Root>
				<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
				<Alert.Title>Shared notes need someone online</Alert.Title>
				<Alert.Description>
					There's no server copy, so a collaborator sees the note when you — or anyone who has
					already opened it — is online.
				</Alert.Description>
			</Alert.Root>
			<Button onclick={startSharing} disabled={busy}>
				<HugeiconsIcon icon={Share08Icon} strokeWidth={2} data-icon="inline-start" />
				{busy ? 'Creating links…' : 'Start sharing'}
			</Button>
		{:else}
			<div class="flex flex-col gap-3">
				{#each [{ url: editUrl, label: 'Can edit', hint: 'Anyone with this link can change the note.' }, { url: viewUrl, label: 'View only', hint: "Opens read-only. Edits from this link are rejected by everyone else's device." }] as row (row.label)}
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<span class="w-20 shrink-0 text-xs font-medium">{row.label}</span>
							<input
								readonly
								value={row.url}
								aria-label="{row.label} link"
								class="min-w-0 flex-1 rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs"
								onfocus={(e) => e.currentTarget.select()}
							/>
							<Button
								variant="secondary"
								size="icon-sm"
								aria-label="Copy {row.label} link"
								onclick={() => copy(row.url, row.label)}
							>
								<HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
							</Button>
						</div>
						<p class="pl-22 text-xs text-muted-foreground">{row.hint}</p>
					</div>
				{/each}
			</div>

			<Alert.Root>
				<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
				<Alert.Title>The link is the password</Alert.Title>
				<Alert.Description>
					Anyone you send it to can pass it on, and there's no way to revoke one person. Reissue the
					links to cut everyone off at once.
				</Alert.Description>
			</Alert.Root>

			<Separator />
			<div class="flex flex-wrap gap-2">
				<Button variant="secondary" size="sm" onclick={() => (confirmRotate = true)}>
					<HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
					Reissue links
				</Button>
				<Button variant="ghost" size="sm" onclick={() => (confirmStop = true)}>Stop sharing</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={confirmRotate}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Reissue both links?</AlertDialog.Title>
			<AlertDialog.Description>
				Everyone currently using a link loses access, including people you still want. You'll need
				to send the new links out again.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={rotate}>Reissue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmStop}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Stop sharing this note?</AlertDialog.Title>
			<AlertDialog.Description>
				The links stop working and you keep your copy. Anyone who already opened the note keeps the
				copy on their own device — that can't be taken back.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={stopSharing}>Stop sharing</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
