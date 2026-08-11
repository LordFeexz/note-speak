<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	import * as Resizable from '$lib/components/ui/resizable';
	import * as Sheet from '$lib/components/ui/sheet';
	import FolderRail from '$lib/components/folder-rail.svelte';
	import NoteList from '$lib/components/note-list.svelte';
	import NoteEditor from '$lib/components/note-editor.svelte';
	import ShortcutsDialog from '$lib/components/shortcuts-dialog.svelte';
	import { notes } from '$lib/stores/notes.svelte';
	import { speech } from '$lib/stores/speech.svelte';
	import { isCompact, dur } from '$lib/motion.svelte';
	import { trackViewportHeight } from '$lib/viewport.svelte';
	import type { Note } from '$lib/types';

	let folderId = $state<string | null | 'trash'>(null);
	let noteId = $state<string | null>(null);
	/** Which pane is on screen below `md`. Ignored on wide viewports. */
	let view = $state<'list' | 'editor'>('list');
	let foldersSheetOpen = $state(false);
	let shortcutsOpen = $state(false);

	let editor = $state<ReturnType<typeof NoteEditor> | null>(null);
	let searchRef = $state<HTMLInputElement | null>(null);

	const compact = $derived(isCompact.current);
	const note = $derived(notes.getNote(noteId));

	onMount(() => {
		void notes.load().then(() => {
			// Restore selection from the URL so reload and back/forward behave.
			const urlFolder = page.url.searchParams.get('folder');
			const urlNote = page.url.searchParams.get('note');
			if (urlFolder === 'trash') folderId = 'trash';
			else if (urlFolder && notes.folders.some((f) => f.id === urlFolder)) folderId = urlFolder;
			if (urlNote && notes.notes.some((n) => n.id === urlNote)) {
				noteId = urlNote;
				view = 'editor';
			}
			if (notes.prefs.speechLang) speech.setLang(notes.prefs.speechLang);
		});

		const untrackViewport = trackViewportHeight();

		// Persist immediately when the tab goes away — debounced writes can be pending.
		const onHide = () => notes.flush();
		window.addEventListener('pagehide', onHide);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				speech.stop();
				notes.flush();
			}
		});
		return () => {
			window.removeEventListener('pagehide', onHide);
			untrackViewport();
		};
	});

	// On wide viewports the editor pane is always visible, so an empty one reads as
	// broken — keep the newest note of the current folder selected.
	$effect(() => {
		if (!notes.loaded || compact || noteId) return;
		const first = notes.listFor(folderId)[0];
		if (first) noteId = first.id;
	});

	// Mirror selection into the URL without adding history noise on every keystroke.
	$effect(() => {
		if (!notes.loaded) return;
		const parts: string[] = [];
		if (folderId !== null) parts.push(`folder=${encodeURIComponent(folderId)}`);
		if (noteId) parts.push(`note=${encodeURIComponent(noteId)}`);
		const search = parts.length ? `?${parts.join('&')}` : '';
		// The rule can't see through the template literal, but the path *is* resolve('/').
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (search !== page.url.search) replaceState(`${resolve('/')}${search}`, {});
	});

	function selectFolder(next: string | null | 'trash') {
		folderId = next;
		foldersSheetOpen = false;
		notes.query = '';
		noteId = compact ? null : (notes.listFor(next)[0]?.id ?? null);
		view = 'list';
	}

	function selectNote(id: string) {
		noteId = id;
		view = 'editor';
	}

	function createNote() {
		if (folderId === 'trash') folderId = null;
		notes.query = '';
		const created = notes.createNote(typeof folderId === 'string' ? folderId : null);
		noteId = created.id;
		view = 'editor';
		setTimeout(() => editor?.focusEditor(), 0);
	}

	function trashNote(target: Note) {
		const wasSelected = noteId === target.id;
		notes.trashNote(target.id);
		if (wasSelected) {
			noteId = compact ? null : (notes.listFor(folderId)[0]?.id ?? null);
			if (compact) view = 'list';
		}
		toast('Note moved to Trash', {
			action: { label: 'Undo', onClick: () => notes.restoreNote(target.id) }
		});
	}

	function onKeydown(event: KeyboardEvent) {
		const mod = event.metaKey || event.ctrlKey;
		if (mod && event.shiftKey && event.key.toLowerCase() === 'd') {
			event.preventDefault();
			editor?.toggleDictation();
			return;
		}
		if (mod && event.key.toLowerCase() === 'n') {
			event.preventDefault();
			createNote();
			return;
		}
		if (mod && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			if (compact) view = 'list';
			searchRef?.focus();
			searchRef?.select();
			return;
		}
		if (event.key === 'Escape') {
			if (speech.listening) editor?.toggleDictation();
			else if (notes.query) notes.query = '';
		}
	}
</script>

<svelte:head>
	<title>Note Speak — voice notes that stay on your device</title>
	<meta
		name="description"
		content="A fast, private note app with built-in voice dictation. Works offline, installs to your device, and never sends your notes anywhere."
	/>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<!--
	Height comes from the visual viewport rather than the layout viewport, so the footer
	and its dictate button stay above the on-screen keyboard instead of behind it.
-->
<main
	class="w-full overflow-hidden safe-x"
	style="height: var(--app-height, 100dvh); transform: translateY(var(--app-offset, 0px));"
>
	{#if compact}
		<div class="relative h-full overflow-hidden">
			{#if view === 'list'}
				<div class="absolute inset-0" in:fly={{ x: -24, duration: dur(200) }}>
					<NoteList
						{folderId}
						selectedId={noteId}
						compact
						bind:searchRef
						onselect={selectNote}
						oncreate={createNote}
						onopenfolders={() => (foldersSheetOpen = true)}
					/>
				</div>
			{:else}
				<div class="absolute inset-0" in:fly={{ x: 24, duration: dur(200) }}>
					<NoteEditor
						bind:this={editor}
						{note}
						compact
						onback={() => (view = 'list')}
						oncreate={createNote}
						ontrash={trashNote}
					/>
				</div>
			{/if}
		</div>

		<Sheet.Root bind:open={foldersSheetOpen}>
			<Sheet.Content side="left" class="w-72 p-0">
				<Sheet.Header class="sr-only">
					<Sheet.Title>Folders</Sheet.Title>
					<Sheet.Description>Switch between folders and Trash.</Sheet.Description>
				</Sheet.Header>
				<FolderRail
					inSheet
					selected={folderId}
					onselect={selectFolder}
					onshortcuts={() => {
						foldersSheetOpen = false;
						shortcutsOpen = true;
					}}
				/>
			</Sheet.Content>
		</Sheet.Root>
	{:else}
		<Resizable.PaneGroup direction="horizontal" class="h-full w-full" autoSaveId="note-speak-panes">
			<Resizable.Pane defaultSize={16} minSize={12} maxSize={26} class="min-w-0">
				<FolderRail
					selected={folderId}
					onselect={selectFolder}
					onshortcuts={() => (shortcutsOpen = true)}
				/>
			</Resizable.Pane>
			<Resizable.Handle />
			<Resizable.Pane defaultSize={26} minSize={18} maxSize={40} class="min-w-0">
				<NoteList
					{folderId}
					selectedId={noteId}
					compact={false}
					bind:searchRef
					onselect={selectNote}
					oncreate={createNote}
					onopenfolders={() => {}}
				/>
			</Resizable.Pane>
			<Resizable.Handle />
			<Resizable.Pane defaultSize={58} minSize={30} class="min-w-0">
				<NoteEditor
					bind:this={editor}
					{note}
					compact={false}
					onback={() => {}}
					oncreate={createNote}
					ontrash={trashNote}
				/>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{/if}
</main>

<ShortcutsDialog bind:open={shortcutsOpen} />
