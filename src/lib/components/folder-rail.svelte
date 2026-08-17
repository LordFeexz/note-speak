<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';
	import FolderAddIcon from '@hugeicons/core-free-icons/FolderAddIcon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
	import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon';
	import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
	import KeyboardIcon from '@hugeicons/core-free-icons/KeyboardIcon';
	import Edit02Icon from '@hugeicons/core-free-icons/Edit02Icon';
	import Database02Icon from '@hugeicons/core-free-icons/Database02Icon';
	import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon';
	import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
	import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
	import Logout01Icon from '@hugeicons/core-free-icons/Logout01Icon';
	import Globe02Icon from '@hugeicons/core-free-icons/Globe02Icon';
	import Book02Icon from '@hugeicons/core-free-icons/Book02Icon';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';

	import { toggleMode, mode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { notes, workspacePane } from '$lib/stores/notes.svelte';
	import { workspaces, type WorkspaceRecord } from '$lib/workspace/store.svelte';
	import { connectionChip } from '$lib/workspace/connection';
	import { locale } from '$lib/i18n/locale.svelte';
	import { docHref } from '$lib/docs/nav';
	import { LANGS, LANG_LABELS } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	import type { Folder } from '$lib/types';
	import InstallPrompt from './install-prompt.svelte';
	import BackupDialog from './backup-dialog.svelte';
	import WorkspaceDialog from './workspace-dialog.svelte';

	const DICT: Dict<{
		foldersNav: string;
		allNotes: string;
		trash: string;
		optionsFor: (name: string) => string;
		rename: string;
		deleteFolder: string;
		folderNamePlaceholder: string;
		newFolderLabel: string;
		workspaces: string;
		addWorkspace: string;
		newWorkspace: string;
		joinWithLink: string;
		workspacesEmpty: string;
		membersOnline: (n: number) => string;
		noneOnline: string;
		connecting: string;
		connectionLabel: (state: string) => string;
		linkCopied: string;
		copyInvite: string;
		leaveWorkspace: string;
		publishFailed: string;
		newFolder: string;
		backup: string;
		docs: string;
		shortcuts: string;
		toggleDarkMode: string;
		toggleTheme: string;
		language: string;
		leaveTitle: (name: string) => string;
		leaveBody: string;
		leave: string;
		cancel: string;
		renameTitle: string;
		renameBody: string;
		folderNameLabel: string;
		deleteTitle: (name: string) => string;
		deleteBody: string;
		checkForUpdates: string;
		checkingUpdates: string;
		updateCheckFailed: string;
		noServiceWorker: string;
	}> = {
		en: {
			foldersNav: 'Folders',
			allNotes: 'All Notes',
			trash: 'Trash',
			optionsFor: (name) => `Options for ${name}`,
			rename: 'Rename',
			deleteFolder: 'Delete folder',
			folderNamePlaceholder: 'Folder name',
			newFolderLabel: 'New folder name',
			workspaces: 'Workspaces',
			addWorkspace: 'Add a workspace',
			newWorkspace: 'New workspace',
			joinWithLink: 'Join with a link',
			workspacesEmpty:
				'A shared note list. Nothing is stored on a server, so notes are reachable while a member who has them is online.',
			membersOnline: (n) => `${n} online`,
			noneOnline: 'No one else here',
			connecting: 'Connecting…',
			connectionLabel: (state) => `Connection: ${state}`,
			linkCopied: 'Link copied',
			copyInvite: 'Copy invite link',
			leaveWorkspace: 'Leave workspace',
			publishFailed: 'A workspace note could not be published',
			newFolder: 'New Folder',
			backup: 'Backup & Restore',
			docs: 'Help & docs',
			shortcuts: 'Shortcuts',
			toggleDarkMode: 'Toggle dark mode',
			toggleTheme: 'Toggle theme',
			language: 'Language',
			leaveTitle: (name) => `Leave “${name}”?`,
			leaveBody:
				'This device stops syncing with the workspace, and its notes move to All Notes — nothing is deleted, for you or anyone else. There is no server to record that you left, so rejoining needs the link and the passphrase again.',
			leave: 'Leave',
			cancel: 'Cancel',
			renameTitle: 'Rename folder',
			renameBody: 'Choose a new name for this folder.',
			folderNameLabel: 'Folder name',
			deleteTitle: (name) => `Delete “${name}”?`,
			deleteBody: 'The folder is deleted, but its notes remain and are moved to All Notes.',
			checkForUpdates: 'Check for updates',
			checkingUpdates: 'Checking for updates...',
			updateCheckFailed: 'Failed to check for updates',
			noServiceWorker: 'App is offline or not installed'
		},
		id: {
			foldersNav: 'Folder',
			allNotes: 'Semua Catatan',
			trash: 'Sampah',
			optionsFor: (name) => `Opsi untuk ${name}`,
			rename: 'Ganti nama',
			deleteFolder: 'Hapus folder',
			folderNamePlaceholder: 'Nama folder',
			newFolderLabel: 'Nama folder baru',
			workspaces: 'Ruang kerja',
			addWorkspace: 'Tambah ruang kerja',
			newWorkspace: 'Ruang kerja baru',
			joinWithLink: 'Gabung lewat tautan',
			workspacesEmpty:
				'Daftar catatan bersama. Tidak ada yang disimpan di server, jadi catatannya bisa dijangkau selama ada anggota yang memilikinya sedang online.',
			membersOnline: (n) => `${n} online`,
			noneOnline: 'Belum ada orang lain',
			connecting: 'Menyambung…',
			connectionLabel: (state) => `Koneksi: ${state}`,
			linkCopied: 'Tautan disalin',
			copyInvite: 'Salin tautan undangan',
			leaveWorkspace: 'Keluar dari ruang kerja',
			publishFailed: 'Sebuah catatan ruang kerja gagal diterbitkan',
			newFolder: 'Folder Baru',
			backup: 'Cadangkan & Pulihkan',
			docs: 'Bantuan & dokumentasi',
			shortcuts: 'Pintasan',
			toggleDarkMode: 'Alihkan mode gelap',
			toggleTheme: 'Alihkan tema',
			language: 'Bahasa',
			leaveTitle: (name) => `Keluar dari “${name}”?`,
			leaveBody:
				'Perangkat ini berhenti tersinkron dengan ruang kerja, dan catatannya pindah ke Semua Catatan — tidak ada yang dihapus, baik untuk Anda maupun orang lain. Tidak ada server yang mencatat bahwa Anda keluar, jadi untuk bergabung lagi Anda perlu tautan dan frasa sandinya.',
			leave: 'Keluar',
			cancel: 'Batal',
			renameTitle: 'Ganti nama folder',
			renameBody: 'Pilih nama baru untuk folder ini.',
			folderNameLabel: 'Nama folder',
			deleteTitle: (name) => `Hapus “${name}”?`,
			deleteBody:
				'Foldernya dihapus, tetapi catatannya tetap ada dan dipindahkan ke Semua Catatan.',
			checkForUpdates: 'Cek pembaruan',
			checkingUpdates: 'Memeriksa pembaruan...',
			updateCheckFailed: 'Gagal memeriksa pembaruan',
			noServiceWorker: 'Aplikasi sedang offline atau belum diinstal'
		}
	};
	const t = $derived(DICT[locale.current]);

	type Props = {
		selected: string | null | 'trash';
		onselect: (folderId: string | null | 'trash') => void;
		onshortcuts: () => void;
		/** Inside the mobile Sheet, leave room for the Sheet's own close button. */
		inSheet?: boolean;
	};

	let { selected, onselect, onshortcuts, inSheet = false }: Props = $props();

	let creating = $state(false);
	let newName = $state('');
	let newFolderRef = $state<HTMLInputElement | null>(null);
	let renaming = $state<Folder | null>(null);
	let renameValue = $state('');
	let deleting = $state<Folder | null>(null);
	let backupOpen = $state(false);
	let wsOpen = $state(false);
	let wsMode = $state<'create' | 'join'>('create');
	let leaving = $state<WorkspaceRecord | null>(null);
	let copied = $state('');

	async function copyInvite(record: WorkspaceRecord) {
		await navigator.clipboard.writeText(workspaces.inviteUrl(record));
		copied = record.id;
		setTimeout(() => (copied = ''), 2000);
	}

	function confirmLeave() {
		if (!leaving) return;
		if (selected === workspacePane(leaving.id)) onselect(null);
		workspaces.leave(leaving.id);
		leaving = null;
	}

	/**
	 * Surface background workspace failures.
	 *
	 * These happen with no user action behind them, so nothing else would ever
	 * mention them — and an unpublished note is indistinguishable from an empty
	 * one for every other member.
	 */
	$effect(() => {
		const failure = workspaces.lastError;
		if (failure) toast.error(t.publishFailed, { description: failure.detail });
	});

	/** Words for a connection state. The colours and the state live in one shared place. */
	/** Words come from this component's `Dict`; the state and colours are shared. */
	function connection(id: string) {
		return connectionChip(id, t);
	}

	$effect(() => {
		if (creating && newFolderRef) newFolderRef.focus();
	});

	function submitNewFolder() {
		if (newName.trim()) {
			const folder = notes.createFolder(newName);
			onselect(folder.id);
		}
		newName = '';
		creating = false;
	}

	function submitRename() {
		if (renaming) notes.renameFolder(renaming.id, renameValue);
		renaming = null;
	}

	function confirmDelete() {
		if (!deleting) return;
		if (selected === deleting.id) onselect(null);
		notes.deleteFolder(deleting.id);
		deleting = null;
	}

	let checkingUpdate = $state(false);
	async function checkForUpdates() {
		checkingUpdate = true;
		toast.loading(t.checkingUpdates, { id: 'update-check' });
		try {
			const reg = await navigator.serviceWorker?.getRegistration();
			if (reg) {
				await reg.update();
				toast.dismiss('update-check');
			} else {
				toast.dismiss('update-check');
				toast.error(t.noServiceWorker);
			}
		} catch {
			toast.dismiss('update-check');
			toast.error(t.updateCheckFailed);
		} finally {
			checkingUpdate = false;
		}
	}

	const itemClass =
		'flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
	const activeClass = 'bg-muted text-foreground font-medium';
</script>

<div class="flex h-full min-h-0 flex-col glass">
	<!--
		The header holds no controls: inside the mobile Sheet the focus trap lands on
		the first focusable child, and a theme toggle there popped its own tooltip on open.
	-->
	<header class="flex items-center gap-1 px-3 safe-t pb-2 {inSheet ? 'min-h-12 pr-12' : ''}">
		<h1 class="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
			Note Speak
		</h1>
	</header>

	<ScrollArea class="min-h-0 flex-1 scroll-slim">
		<nav class="flex flex-col gap-0.5 px-2 pb-2" aria-label={t.foldersNav}>
			<button
				type="button"
				class="{itemClass} {selected === null ? activeClass : ''}"
				aria-current={selected === null ? 'page' : undefined}
				onclick={() => onselect(null)}
			>
				<HugeiconsIcon icon={Note01Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span class="flex-1 truncate text-left">{t.allNotes}</span>
				<span class="text-xs text-muted-foreground tabular-nums">{notes.countIn(null)}</span>
			</button>

			{#each notes.folders as folder (folder.id)}
				<div class="group/folder relative flex items-center">
					<button
						type="button"
						class="{itemClass} pr-9 {selected === folder.id ? activeClass : ''}"
						aria-current={selected === folder.id ? 'page' : undefined}
						onclick={() => onselect(folder.id)}
					>
						<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} class="size-4 shrink-0" />
						<span class="flex-1 truncate text-left">{folder.name}</span>
						<span class="text-xs text-muted-foreground tabular-nums"
							>{notes.countIn(folder.id)}</span
						>
					</button>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="icon-sm"
									class="absolute right-1 opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
									aria-label={t.optionsFor(folder.name)}
								>
									<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Group>
								<DropdownMenu.Item
									onSelect={() => {
										renaming = folder;
										renameValue = folder.name;
									}}
								>
									<HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
									{t.rename}
								</DropdownMenu.Item>
								<DropdownMenu.Item variant="destructive" onSelect={() => (deleting = folder)}>
									<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
									{t.deleteFolder}
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/each}

			{#if creating}
				<!-- `autofocus` is unreliable for elements inserted after load, so focus explicitly. -->
				<Input
					bind:ref={newFolderRef}
					bind:value={newName}
					placeholder={t.folderNamePlaceholder}
					aria-label={t.newFolderLabel}
					class="my-1 h-9"
					onblur={submitNewFolder}
					onkeydown={(e) => {
						if (e.key === 'Enter') submitNewFolder();
						if (e.key === 'Escape') {
							newName = '';
							creating = false;
						}
					}}
				/>
			{/if}

			<Separator class="my-2" />

			<div class="flex items-center justify-between gap-1 px-2 pt-1 pb-1">
				<h2 class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{t.workspaces}
				</h2>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon-sm" aria-label={t.addWorkspace}>
								<HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item
							onSelect={() => {
								wsMode = 'create';
								wsOpen = true;
							}}
						>
							<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
							{t.newWorkspace}
						</DropdownMenu.Item>
						<DropdownMenu.Item
							onSelect={() => {
								wsMode = 'join';
								wsOpen = true;
							}}
						>
							<HugeiconsIcon icon={Link01Icon} strokeWidth={2} />
							{t.joinWithLink}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			{#if workspaces.workspaces.length === 0}
				<p class="px-2 pb-2 text-xs text-muted-foreground">{t.workspacesEmpty}</p>
			{/if}

			{#each workspaces.workspaces as workspace (workspace.id)}
				{@const pane = workspacePane(workspace.id)}
				{@const state = connection(workspace.id)}
				<div class="group/ws relative flex items-center">
					<button
						type="button"
						class="{itemClass} pr-9 {selected === pane ? activeClass : ''}"
						aria-current={selected === pane ? 'page' : undefined}
						onclick={() => onselect(pane)}
					>
						<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} class="size-4 shrink-0" />
						<span class="flex-1 truncate text-left">{workspace.name}</span>
						<!--
							A dot in the rail, where the row is a target rather than a readout.
							The words live in `title` and `aria-label`, and the pane header
							spells the same state out in full — colour is never the only
							carrier of it.
						-->
						<span
							class="size-1.5 shrink-0 rounded-full {state.tone} {state.pulse
								? 'animate-pulse'
								: ''}"
							title={state.text}
							aria-label={t.connectionLabel(state.text)}
							role="img"
						></span>
						<span class="text-xs text-muted-foreground tabular-nums">{notes.countIn(pane)}</span>
					</button>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="icon-sm"
									class="absolute right-1 opacity-0 group-hover/ws:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
									aria-label={t.optionsFor(workspace.name)}
								>
									<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onSelect={() => copyInvite(workspace)}>
								<HugeiconsIcon icon={Link01Icon} strokeWidth={2} />
								{copied === workspace.id ? t.linkCopied : t.copyInvite}
							</DropdownMenu.Item>
							<DropdownMenu.Item variant="destructive" onSelect={() => (leaving = workspace)}>
								<HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
								{t.leaveWorkspace}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/each}

			<Separator class="my-2" />

			<button
				type="button"
				class="{itemClass} {selected === 'trash' ? activeClass : ''}"
				aria-current={selected === 'trash' ? 'page' : undefined}
				onclick={() => onselect('trash')}
			>
				<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span class="flex-1 truncate text-left">{t.trash}</span>
				<span class="text-xs text-muted-foreground tabular-nums">{notes.countIn('trash')}</span>
			</button>
		</nav>
	</ScrollArea>

	<footer class="flex flex-col gap-1 border-t px-2 py-2 safe-b">
		<InstallPrompt />
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start"
			onclick={() => {
				creating = true;
				newName = '';
			}}
		>
			<HugeiconsIcon icon={FolderAddIcon} strokeWidth={2} data-icon="inline-start" />
			{t.newFolder}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start"
			onclick={() => (backupOpen = true)}
		>
			<HugeiconsIcon icon={Database02Icon} strokeWidth={2} data-icon="inline-start" />
			{t.backup}
		</Button>
		<!--
			Opens in a new tab on purpose: installed as a PWA the app has no browser
			chrome, so navigating away in place would replace the notes window with a
			documentation page and no visible way back.
		-->
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start"
			href={docHref(locale.current, '')}
			target="_blank"
			rel="noopener"
		>
			<HugeiconsIcon icon={Book02Icon} strokeWidth={2} data-icon="inline-start" />
			{t.docs}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start"
			onclick={checkForUpdates}
			disabled={checkingUpdate}
		>
			<HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
			{t.checkForUpdates}
		</Button>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" class="flex-1 justify-start" onclick={onshortcuts}>
				<HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} data-icon="inline-start" />
				{t.shortcuts}
			</Button>
			<!--
				The language switcher writes a preference rather than changing the URL:
				the app's path is fixed by the manifest and by every share link already
				sent, so it is the one place a locale cannot live in the address bar.
			-->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon-sm"
							aria-label="{t.language}: {LANG_LABELS[locale.current]}"
						>
							<HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Group>
						<DropdownMenu.Label>{t.language}</DropdownMenu.Label>
						{#each LANGS as lang (lang)}
							<DropdownMenu.CheckboxItem
								checked={locale.current === lang}
								onCheckedChange={() => locale.set(lang)}
							>
								{LANG_LABELS[lang]}
							</DropdownMenu.CheckboxItem>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Tooltip.Provider delayDuration={400}>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								onclick={toggleMode}
								aria-label={t.toggleDarkMode}
							>
								{#if mode.current === 'dark'}
									<HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
								{:else}
									<HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top">{t.toggleTheme}</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	</footer>
</div>

<BackupDialog bind:open={backupOpen} />

<WorkspaceDialog
	bind:open={wsOpen}
	bind:mode={wsMode}
	onjoined={(id) => onselect(workspacePane(id))}
/>

<AlertDialog.Root open={!!leaving} onOpenChange={(o) => !o && (leaving = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.leaveTitle(leaving?.name ?? '')}</AlertDialog.Title>
			<AlertDialog.Description>{t.leaveBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmLeave}>{t.leave}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root open={!!renaming} onOpenChange={(o) => !o && (renaming = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.renameTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.renameBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<Input
			bind:value={renameValue}
			aria-label={t.folderNameLabel}
			onkeydown={(e) => e.key === 'Enter' && submitRename()}
		/>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitRename}>{t.rename}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root open={!!deleting} onOpenChange={(o) => !o && (deleting = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.deleteTitle(deleting?.name ?? '')}</AlertDialog.Title>
			<AlertDialog.Description>{t.deleteBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDelete}>{t.deleteFolder}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
