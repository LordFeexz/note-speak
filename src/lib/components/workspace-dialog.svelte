<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { parseInvite } from '$lib/workspace/keys';
	import { toBase64Url } from '$lib/share/crypto';

	type Props = {
		open: boolean;
		mode: 'create' | 'join';
		/** Pre-filled when arriving from an invite link, so `/w` reuses this dialog. */
		invite?: string;
		onjoined?: (id: string) => void;
	};

	let { open = $bindable(), mode = $bindable(), invite = '', onjoined }: Props = $props();

	let name = $state('');
	let passphrase = $state('');
	let confirmPhrase = $state('');
	let link = $state('');
	let busy = $state(false);

	// There is no shadcn Label primitive in this project; these are the classes it
	// would apply, kept in one place so the three fields stay consistent.
	const labelClass = 'text-sm font-medium leading-none';

	/** Short enough not to nag, long enough to rule out a single dictionary word. */
	const MIN_PASSPHRASE = 12;
	let error = $state('');

	$effect(() => {
		if (!open) return;
		if (invite && !link) link = invite;
	});

	/** Accepts a full invite URL or a bare `#s=…` fragment. */
	const parsed = $derived.by(() => {
		const value = link.trim();
		if (!value) return null;
		const hash = value.includes('#') ? value.slice(value.indexOf('#')) : value;
		return parseInvite(hash);
	});

	$effect(() => {
		if (mode === 'join' && parsed?.name && !name) name = parsed.name;
	});

	function reset() {
		name = '';
		passphrase = '';
		confirmPhrase = '';
		link = '';
		error = '';
		busy = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (!passphrase.trim()) {
			error = 'A passphrase is required.';
			return;
		}
		// Enforced on create only — joining must accept whatever the workspace was
		// made with. The floor matters because the room id is derived from this
		// phrase: a guess can be tested by deriving it and looking for members, so
		// a short passphrase is guessable online rather than merely weak.
		if (mode === 'create' && passphrase.trim().length < MIN_PASSPHRASE) {
			error = `Use at least ${MIN_PASSPHRASE} characters — four or five unrelated words works well.`;
			return;
		}
		if (mode === 'create' && passphrase !== confirmPhrase) {
			error = 'The two passphrases do not match.';
			return;
		}
		if (mode === 'join' && !parsed) {
			error = 'That does not look like an invite link.';
			return;
		}
		busy = true;
		try {
			const record =
				mode === 'create'
					? await workspaces.create(name, passphrase)
					: await workspaces.join(name || parsed!.name, toBase64Url(parsed!.salt), passphrase);
			onjoined?.(record.id);
			open = false;
			reset();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not open the workspace.';
			busy = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o) reset();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<form onsubmit={submit}>
			<Dialog.Header>
				<Dialog.Title>
					{mode === 'create' ? 'New workspace' : 'Join a workspace'}
				</Dialog.Title>
				<Dialog.Description>
					{#if mode === 'create'}
						A shared note list. Members connect directly to each other — nothing is stored on a
						server, so there is no workspace to find without the passphrase.
					{:else}
						You need both the invite link and the passphrase. The link on its own identifies
						nothing.
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4 py-4">
				{#if mode === 'join'}
					<div class="grid gap-2">
						<label for="ws-link" class={labelClass}>Invite link</label>
						<Input
							id="ws-link"
							bind:value={link}
							placeholder="https://…/w#s=…"
							autocomplete="off"
							spellcheck={false}
						/>
					</div>
				{/if}

				<div class="grid gap-2">
					<label for="ws-name" class={labelClass}>Name</label>
					<Input
						id="ws-name"
						bind:value={name}
						placeholder="Design team"
						autocomplete="off"
						maxlength={60}
					/>
					<p class="text-xs text-muted-foreground">Shown only to you and other members.</p>
				</div>

				<div class="grid gap-2">
					<label for="ws-phrase" class={labelClass}>Passphrase</label>
					<Input
						id="ws-phrase"
						type="password"
						bind:value={passphrase}
						autocomplete="off"
						placeholder="Four or five unrelated words"
					/>
				</div>

				{#if mode === 'create'}
					<div class="grid gap-2">
						<label for="ws-confirm" class={labelClass}>Confirm passphrase</label>
						<Input id="ws-confirm" type="password" bind:value={confirmPhrase} autocomplete="off" />
					</div>
					<!--
						Stated up front rather than discovered later. There is no server to
						check a role against, so a workspace cannot have read-only members —
						a per-note view link is the way to share without granting edits.
					-->
					<p
						class="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground"
					>
						<HugeiconsIcon
							icon={Alert02Icon}
							strokeWidth={2}
							class="size-4 shrink-0 text-amber-600 dark:text-amber-400"
						/>
						<span>
							Everyone with the passphrase can edit every note here, and it cannot be reset — if you
							lose it, the workspace is unreachable. Write it down.
						</span>
					</p>
				{/if}

				{#if error}
					<p class="text-sm text-destructive" role="alert">{error}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={busy}>
					{#if busy}
						Unlocking…
					{:else}
						{mode === 'create' ? 'Create workspace' : 'Join'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
