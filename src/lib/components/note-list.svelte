<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
	import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import DeletePutBackIcon from '@hugeicons/core-free-icons/DeletePutBackIcon';
	import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
	import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';
	import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Empty from '$lib/components/ui/empty';
	import { notes } from '$lib/stores/notes.svelte';
	import { noteTitle, notePreview, type Note } from '$lib/types';
	import { dur } from '$lib/motion.svelte';

	type Props = {
		folderId: string | null | 'trash';
		selectedId: string | null;
		compact: boolean;
		onselect: (noteId: string) => void;
		oncreate: () => void;
		onopenfolders: () => void;
		searchRef?: HTMLInputElement | null;
	};

	let {
		folderId,
		selectedId,
		compact,
		onselect,
		oncreate,
		onopenfolders,
		searchRef = $bindable(null)
	}: Props = $props();

	let confirmEmptyTrash = $state(false);

	const list = $derived(notes.listFor(folderId));
	const isTrash = $derived(folderId === 'trash');
	const heading = $derived(
		folderId === 'trash'
			? 'Trash'
			: folderId === null
				? 'All Notes'
				: (notes.folders.find((f) => f.id === folderId)?.name ?? 'Notes')
	);

	function formatDate(ts: number) {
		const date = new Date(ts);
		const now = new Date();
		const sameDay = date.toDateString() === now.toDateString();
		if (sameDay) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
		if (date.getFullYear() === now.getFullYear())
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function trash(note: Note) {
		notes.trashNote(note.id);
		toast('Note moved to Trash', {
			action: { label: 'Undo', onClick: () => notes.restoreNote(note.id) }
		});
	}
</script>

<div class="flex h-full min-h-0 flex-col bg-background">
	<header class="flex flex-col gap-2 px-3 pt-3 safe-t pb-2">
		<div class="flex items-center gap-1">
			{#if compact}
				<Button variant="ghost" size="icon-sm" onclick={onopenfolders} aria-label="Show folders">
					<HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
				</Button>
			{/if}
			<h2 class="flex-1 truncate text-sm font-semibold">{heading}</h2>
			{#if isTrash}
				{#if list.length > 0}
					<Button variant="ghost" size="sm" onclick={() => (confirmEmptyTrash = true)}>Empty</Button
					>
				{/if}
			{:else}
				<Button variant="ghost" size="icon-sm" onclick={oncreate} aria-label="New note">
					<HugeiconsIcon icon={NoteAddIcon} strokeWidth={2} />
				</Button>
			{/if}
		</div>
		<div class="relative">
			<HugeiconsIcon
				icon={Search01Icon}
				strokeWidth={2}
				class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				bind:ref={searchRef}
				bind:value={notes.query}
				type="search"
				placeholder="Search"
				aria-label="Search notes"
				class="h-9 pl-8"
			/>
			{#if notes.query}
				<Button
					variant="ghost"
					size="icon-xs"
					class="absolute top-1/2 right-1.5 -translate-y-1/2"
					aria-label="Clear search"
					onclick={() => (notes.query = '')}
				>
					<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
				</Button>
			{/if}
		</div>
	</header>

	<ScrollArea class="min-h-0 flex-1 scroll-slim">
		{#if list.length === 0}
			<div class="p-4" in:fade={{ duration: dur(200) }}>
				<Empty.Root>
					<Empty.Header>
						<Empty.Media variant="icon">
							<HugeiconsIcon
								icon={notes.query ? Search01Icon : isTrash ? Delete02Icon : Note01Icon}
								strokeWidth={2}
							/>
						</Empty.Media>
						<Empty.Title>
							{#if notes.query}
								No matches
							{:else if isTrash}
								Trash is empty
							{:else}
								No notes yet
							{/if}
						</Empty.Title>
						<Empty.Description>
							{#if notes.query}
								Nothing here matches “{notes.query}”.
							{:else if isTrash}
								Deleted notes land here so you can restore them.
							{:else}
								Start typing, or dictate one with your voice.
							{/if}
						</Empty.Description>
					</Empty.Header>
					{#if !isTrash}
						<Empty.Content>
							<Button
								size="sm"
								onclick={() => {
									notes.query = '';
									oncreate();
								}}
							>
								<HugeiconsIcon icon={NoteAddIcon} strokeWidth={2} data-icon="inline-start" />
								New note
							</Button>
						</Empty.Content>
					{/if}
				</Empty.Root>
			</div>
		{:else}
			<ul class="flex flex-col gap-0.5 px-2 pb-3">
				{#each list as note (note.id)}
					<li animate:flip={{ duration: dur(180) }} class="group/note relative">
						<button
							type="button"
							class="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2.5 py-2 pr-9 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
								{note.id === selectedId ? 'bg-note-accent text-note-accent-foreground hover:bg-note-accent' : ''}"
							aria-current={note.id === selectedId ? 'true' : undefined}
							onclick={() => onselect(note.id)}
						>
							<span class="w-full truncate text-sm font-medium">{noteTitle(note)}</span>
							<span
								class="flex w-full items-baseline gap-1.5 text-xs {note.id === selectedId
									? 'text-note-accent-foreground/75'
									: 'text-muted-foreground'}"
							>
								<span class="shrink-0 tabular-nums">{formatDate(note.updatedAt)}</span>
								<span class="truncate">{notePreview(note)}</span>
							</span>
						</button>

						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="ghost"
										size="icon-sm"
										class="absolute top-1.5 right-1 opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100 max-md:opacity-100 {note.id ===
										selectedId
											? 'text-note-accent-foreground hover:bg-black/15 hover:text-note-accent-foreground'
											: ''}"
										aria-label="Options for {noteTitle(note)}"
									>
										<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								{#if isTrash}
									<DropdownMenu.Group>
										<DropdownMenu.Item onSelect={() => notes.restoreNote(note.id)}>
											<HugeiconsIcon icon={DeletePutBackIcon} strokeWidth={2} />
											Restore
										</DropdownMenu.Item>
										<DropdownMenu.Item
											variant="destructive"
											onSelect={() => notes.purgeNote(note.id)}
										>
											<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
											Delete permanently
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								{:else}
									<DropdownMenu.Group>
										<DropdownMenu.Label>Move to</DropdownMenu.Label>
										<DropdownMenu.Item
											disabled={note.folderId === null}
											onSelect={() => notes.moveNote(note.id, null)}
										>
											<HugeiconsIcon icon={Note01Icon} strokeWidth={2} />
											All Notes
										</DropdownMenu.Item>
										{#each notes.folders as folder (folder.id)}
											<DropdownMenu.Item
												disabled={note.folderId === folder.id}
												onSelect={() => notes.moveNote(note.id, folder.id)}
											>
												<HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
												{folder.name}
											</DropdownMenu.Item>
										{/each}
									</DropdownMenu.Group>
									<DropdownMenu.Separator />
									<DropdownMenu.Group>
										<DropdownMenu.Item variant="destructive" onSelect={() => trash(note)}>
											<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
											Move to Trash
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</li>
				{/each}
			</ul>
		{/if}
	</ScrollArea>
</div>

<AlertDialog.Root bind:open={confirmEmptyTrash}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Empty Trash?</AlertDialog.Title>
			<AlertDialog.Description>
				{notes.countIn('trash')} note{notes.countIn('trash') === 1 ? '' : 's'} will be deleted from this
				device permanently. This can't be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					notes.emptyTrash();
					confirmEmptyTrash = false;
				}}>Empty Trash</AlertDialog.Action
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
