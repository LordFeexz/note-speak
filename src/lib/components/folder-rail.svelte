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

	import { toggleMode, mode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { notes } from '$lib/stores/notes.svelte';
	import type { Folder } from '$lib/types';
	import InstallPrompt from './install-prompt.svelte';

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

	const itemClass =
		'flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
	const activeClass = 'bg-muted text-foreground font-medium';
</script>

<div class="flex h-full min-h-0 flex-col bg-sidebar">
	<!--
		The header holds no controls: inside the mobile Sheet the focus trap lands on
		the first focusable child, and a theme toggle there popped its own tooltip on open.
	-->
	<header class="flex items-center gap-1 px-3 pt-3 safe-t pb-2 {inSheet ? 'min-h-12 pr-12' : ''}">
		<h1 class="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
			Note Speak
		</h1>
	</header>

	<ScrollArea class="min-h-0 flex-1 scroll-slim">
		<nav class="flex flex-col gap-0.5 px-2 pb-2" aria-label="Folders">
			<button
				type="button"
				class="{itemClass} {selected === null ? activeClass : ''}"
				aria-current={selected === null ? 'page' : undefined}
				onclick={() => onselect(null)}
			>
				<HugeiconsIcon icon={Note01Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span class="flex-1 truncate text-left">All Notes</span>
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
									aria-label="Options for {folder.name}"
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
									Rename
								</DropdownMenu.Item>
								<DropdownMenu.Item variant="destructive" onSelect={() => (deleting = folder)}>
									<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
									Delete folder
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
					placeholder="Folder name"
					aria-label="New folder name"
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

			<button
				type="button"
				class="{itemClass} {selected === 'trash' ? activeClass : ''}"
				aria-current={selected === 'trash' ? 'page' : undefined}
				onclick={() => onselect('trash')}
			>
				<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} class="size-4 shrink-0" />
				<span class="flex-1 truncate text-left">Trash</span>
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
			New Folder
		</Button>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" class="flex-1 justify-start" onclick={onshortcuts}>
				<HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} data-icon="inline-start" />
				Shortcuts
			</Button>
			<Tooltip.Provider delayDuration={400}>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								onclick={toggleMode}
								aria-label="Toggle dark mode"
							>
								{#if mode.current === 'dark'}
									<HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
								{:else}
									<HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top">Toggle theme</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	</footer>
</div>

<AlertDialog.Root open={!!renaming} onOpenChange={(o) => !o && (renaming = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Rename folder</AlertDialog.Title>
			<AlertDialog.Description>Choose a new name for this folder.</AlertDialog.Description>
		</AlertDialog.Header>
		<Input
			bind:value={renameValue}
			aria-label="Folder name"
			onkeydown={(e) => e.key === 'Enter' && submitRename()}
		/>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitRename}>Rename</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root open={!!deleting} onOpenChange={(o) => !o && (deleting = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleting?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				The folder is removed, but its notes are kept and moved to All Notes.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDelete}>Delete folder</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
