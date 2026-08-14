<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { parseInvite } from '$lib/workspace/keys';
	import { toBase64Url } from '$lib/share/crypto';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		createTitle: string;
		joinTitle: string;
		createDescription: string;
		joinDescription: string;
		linkLabel: string;
		nameLabel: string;
		nameHint: string;
		namePlaceholder: string;
		passphraseLabel: string;
		passphrasePlaceholder: string;
		confirmLabel: string;
		warning: string;
		cancel: string;
		create: string;
		join: string;
		busy: string;
		errRequired: string;
		errShort: (min: number) => string;
		errMismatch: string;
		errBadLink: string;
		errGeneric: string;
	}> = {
		en: {
			createTitle: 'New workspace',
			joinTitle: 'Join a workspace',
			createDescription:
				'A shared note list. Members connect directly to each other — nothing is stored on a server, so there is no workspace to find without the passphrase.',
			joinDescription:
				'You need both the invite link and the passphrase. The link on its own identifies nothing.',
			linkLabel: 'Invite link',
			nameLabel: 'Name',
			nameHint: 'Shown only to you and other members.',
			namePlaceholder: 'Design team',
			passphraseLabel: 'Passphrase',
			passphrasePlaceholder: 'Four or five unrelated words',
			confirmLabel: 'Confirm passphrase',
			warning:
				'Everyone with the passphrase can edit every note here, and it cannot be reset — if you lose it, the workspace is unreachable. Write it down.',
			cancel: 'Cancel',
			create: 'Create workspace',
			join: 'Join',
			busy: 'Unlocking…',
			errRequired: 'A passphrase is required.',
			errShort: (min) =>
				`Use at least ${min} characters — four or five unrelated words works well.`,
			errMismatch: 'The two passphrases do not match.',
			errBadLink: 'That does not look like an invite link.',
			errGeneric: 'Could not open the workspace.'
		},
		id: {
			createTitle: 'Ruang kerja baru',
			joinTitle: 'Gabung ke ruang kerja',
			createDescription:
				'Daftar catatan bersama. Anggota terhubung langsung satu sama lain — tidak ada yang disimpan di server, jadi tidak ada ruang kerja yang bisa ditemukan tanpa frasa sandi.',
			joinDescription:
				'Anda perlu tautan undangan sekaligus frasa sandinya. Tautan saja tidak menunjukkan apa pun.',
			linkLabel: 'Tautan undangan',
			nameLabel: 'Nama',
			nameHint: 'Hanya terlihat oleh Anda dan anggota lain.',
			namePlaceholder: 'Tim desain',
			passphraseLabel: 'Frasa sandi',
			passphrasePlaceholder: 'Empat atau lima kata yang tidak berkaitan',
			confirmLabel: 'Konfirmasi frasa sandi',
			warning:
				'Semua orang yang punya frasa sandi bisa menyunting setiap catatan di sini, dan frasa itu tidak bisa disetel ulang — jika Anda lupa, ruang kerjanya tidak bisa dijangkau lagi. Catatlah.',
			cancel: 'Batal',
			create: 'Buat ruang kerja',
			join: 'Gabung',
			busy: 'Membuka…',
			errRequired: 'Frasa sandi wajib diisi.',
			errShort: (min) =>
				`Gunakan minimal ${min} karakter — empat atau lima kata yang tidak berkaitan sudah bagus.`,
			errMismatch: 'Kedua frasa sandi tidak sama.',
			errBadLink: 'Itu sepertinya bukan tautan undangan.',
			errGeneric: 'Ruang kerja tidak bisa dibuka.'
		}
	};
	const t = $derived(DICT[locale.current]);

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
			error = t.errRequired;
			return;
		}
		// Enforced on create only — joining must accept whatever the workspace was
		// made with. The floor matters because the room id is derived from this
		// phrase: a guess can be tested by deriving it and looking for members, so
		// a short passphrase is guessable online rather than merely weak.
		if (mode === 'create' && passphrase.trim().length < MIN_PASSPHRASE) {
			error = t.errShort(MIN_PASSPHRASE);
			return;
		}
		if (mode === 'create' && passphrase !== confirmPhrase) {
			error = t.errMismatch;
			return;
		}
		if (mode === 'join' && !parsed) {
			error = t.errBadLink;
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
			error = e instanceof Error ? e.message : t.errGeneric;
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
					{mode === 'create' ? t.createTitle : t.joinTitle}
				</Dialog.Title>
				<Dialog.Description>
					{mode === 'create' ? t.createDescription : t.joinDescription}
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4 py-4">
				{#if mode === 'join'}
					<div class="grid gap-2">
						<label for="ws-link" class={labelClass}>{t.linkLabel}</label>
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
					<label for="ws-name" class={labelClass}>{t.nameLabel}</label>
					<Input
						id="ws-name"
						bind:value={name}
						placeholder={t.namePlaceholder}
						autocomplete="off"
						maxlength={60}
					/>
					<p class="text-xs text-muted-foreground">{t.nameHint}</p>
				</div>

				<div class="grid gap-2">
					<label for="ws-phrase" class={labelClass}>{t.passphraseLabel}</label>
					<Input
						id="ws-phrase"
						type="password"
						bind:value={passphrase}
						autocomplete="off"
						placeholder={t.passphrasePlaceholder}
					/>
				</div>

				{#if mode === 'create'}
					<div class="grid gap-2">
						<label for="ws-confirm" class={labelClass}>{t.confirmLabel}</label>
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
						<span>{t.warning}</span>
					</p>
				{/if}

				{#if error}
					<p class="text-sm text-destructive" role="alert">{error}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>{t.cancel}</Button>
				<Button type="submit" disabled={busy}>
					{#if busy}
						{t.busy}
					{:else}
						{mode === 'create' ? t.create : t.join}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
