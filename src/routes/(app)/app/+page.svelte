<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { toggleMode } from 'mode-watcher';

	import * as Resizable from '$lib/components/ui/resizable';
	import * as Sheet from '$lib/components/ui/sheet';
	import FolderRail from '$lib/components/folder-rail.svelte';
	import NoteList from '$lib/components/note-list.svelte';
	import NoteEditor from '$lib/components/note-editor.svelte';
	import ShortcutsDialog from '$lib/components/shortcuts-dialog.svelte';
	import CommandPalette from '$lib/components/command-palette.svelte';
	import {
		notes,
		effectiveLayout,
		isWideLayout,
		workspacePane,
		WORKSPACE_PREFIX
	} from '$lib/stores/notes.svelte';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { speech } from '$lib/stores/speech.svelte';
	import { micPermissionGranted } from '$lib/speech/permission';
	import { isCompact, dur } from '$lib/motion.svelte';
	import { trackViewportHeight } from '$lib/viewport.svelte';
	import { history } from '$lib/history/store.svelte';
	import type { Note } from '$lib/types';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		readyTitle: string;
		readyBody: string;
		dictate: string;
		movedToTrash: string;
		undo: string;
	}> = {
		en: {
			readyTitle: 'Ready when you are',
			readyBody: 'Tap to start dictating this note.',
			dictate: 'Dictate',
			movedToTrash: 'Note moved to Trash',
			undo: 'Undo'
		},
		id: {
			readyTitle: 'Siap kapan pun Anda mau',
			readyBody: 'Ketuk untuk mulai mendikte catatan ini.',
			dictate: 'Dikte',
			movedToTrash: 'Catatan dipindahkan ke Sampah',
			undo: 'Urungkan'
		}
	};
	const t = $derived(DICT[locale.current]);

	let folderId = $state<string | null | 'trash'>(null);
	let noteId = $state<string | null>(null);
	/** Which pane is on screen below `md`. Ignored on wide viewports. */
	let view = $state<'list' | 'editor'>('list');
	let foldersSheetOpen = $state(false);
	let shortcutsOpen = $state(false);
	let paletteOpen = $state(false);

	let editor = $state<ReturnType<typeof NoteEditor> | null>(null);
	let searchRef = $state<HTMLInputElement | null>(null);

	const compact = $derived(isCompact.current);
	const note = $derived(notes.getNote(noteId));

	/**
	 * Grid and board need more room than a reading list does.
	 *
	 * Done purely by giving those layouts a different set of pane constraints,
	 * with no imperative resizing at all — because paneforge already stores one
	 * layout *per constraint tuple*: `getPaneKey()` in
	 * `paneforge/dist/internal/utils/storage.js` serialises every pane's
	 * constraints into the storage key. So each width bucket remembers its own
	 * divider positions for free, and dragging the divider in grid does not
	 * disturb the width you chose for rows.
	 *
	 * The narrow numbers are byte-identical to what shipped before, which is what
	 * keeps every existing saved layout working untouched.
	 *
	 * Two things this must not do. It must not remount the pane group — that would
	 * rebuild the editor, and `note-editor.svelte` keeps ProseMirror alive across
	 * note switches so undo history survives; a shared note would also drop its
	 * peer connections. And each bucket's `defaultSize`s must total 100, or
	 * `validatePaneGroupLayout` rescales them all proportionally.
	 */
	const wide = $derived(isWideLayout(effectiveLayout(notes.prefs.listLayout ?? 'rows', folderId)));
	const panes = $derived(
		wide
			? { list: { size: 44, min: 30, max: 58 }, editor: 40 }
			: { list: { size: 26, min: 18, max: 40 }, editor: 58 }
	);

	onMount(() => {
		void notes.load().then(() => {
			// Restore selection from the URL so reload and back/forward behave.
			const urlFolder = page.url.searchParams.get('folder');
			const urlNote = page.url.searchParams.get('note');
			if (urlFolder === 'trash') folderId = 'trash';
			else if (urlFolder && notes.folders.some((f) => f.id === urlFolder)) folderId = urlFolder;
			else if (urlFolder?.startsWith(WORKSPACE_PREFIX)) {
				// Workspaces load after notes, so this pane may not exist yet; the rail
				// simply shows nothing selected until it does, which is honest.
				folderId = urlFolder;
			}
			if (urlNote && notes.notes.some((n) => n.id === urlNote)) {
				noteId = urlNote;
				view = 'editor';
			}
			if (notes.prefs.speechLang) speech.setLang(notes.prefs.speechLang);
			// Seed the quick-switch with whatever we start on, so the *second*
			// language a user picks is enough to make the toggle appear.
			notes.noteLangUse(speech.lang);
			// Both default to on, so only an explicit `false` turns them off.
			if (notes.prefs.voiceCommands === false) speech.commands = false;
			if (notes.prefs.autoPunctuate === false) speech.autoPunctuate = false;
			void handleLaunchParams();
			// After notes, because the index mirrors entries into the note list and
			// would otherwise race the initial load.
			void workspaces.load();
		});

		const untrackViewport = trackViewportHeight();

		// Persist immediately when the tab goes away — debounced writes can be pending.
		const onHide = () => {
			// Close the open editing session too — leaving the tab is the clearest
			// signal that a session ended.
			const open = notes.getNote(noteId);
			if (open) void history.commit(open.id, open.body);
			notes.flush();
		};
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
		// The rule can't see through the template literal, but the path *is* resolve('/app').
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (search !== page.url.search) replaceState(`${resolve('/app')}${search}`, {});
	});

	function selectFolder(next: string | null | 'trash') {
		// Flush current note before switching to prevent content loss
		if (noteId) {
			const current = notes.getNote(noteId);
			if (current) void history.commit(current.id, current.body);
		}
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

	/**
	 * Open a note from anywhere, moving the list pane to wherever it lives.
	 *
	 * The command palette searches every active note, so a result is often in a
	 * different folder than the one on screen. Setting `noteId` alone would leave
	 * the editor showing a note the list does not contain — nothing highlighted,
	 * arrow keys walking a different set, and Back on a phone returning to a list
	 * without it.
	 */
	function openNoteAnywhere(id: string) {
		const note = notes.getNote(id);
		if (note) {
			const pane = note.workspaceId
				? workspacePane(note.workspaceId)
				: note.deletedAt !== null
					? 'trash'
					: note.folderId;
			if (pane !== folderId) {
				folderId = pane;
				notes.query = '';
			}
		}
		selectNote(id);
	}

	function createNote(body?: string) {
		if (folderId === 'trash') folderId = null;
		notes.query = '';
		const inWorkspace =
			typeof folderId === 'string' && folderId.startsWith(WORKSPACE_PREFIX)
				? folderId.slice(WORKSPACE_PREFIX.length)
				: null;
		// A workspace is not a folder, so a note created in one belongs to no folder.
		const created = notes.createNote(
			typeof folderId === 'string' && !inWorkspace ? folderId : null
		);
		if (typeof body === 'string' && body) notes.updateBody(created.id, body);
		// Shared from birth: creating it here means it is meant for the workspace.
		if (inWorkspace) void workspaces.addNote(inWorkspace, created);
		noteId = created.id;
		view = 'editor';
		setTimeout(() => editor?.focusEditor(), 0);
	}

	/**
	 * Handle the manifest's `shortcuts` and `share_target` entries.
	 *
	 * Both arrive as query params on a cold start, so this runs once after the
	 * store loads. The URL-sync effect below rewrites `search` from the current
	 * selection, which clears these params without any extra work.
	 */
	async function handleLaunchParams() {
		const params = page.url.searchParams;
		const shared = [params.get('shared_title'), params.get('shared_text'), params.get('shared_url')]
			.filter(Boolean)
			.join('\n');

		if (shared) createNote(shared);
		else if (params.get('new')) createNote();

		if (!params.get('dictate') || !speech.supported) return;

		// `start()` needs user activation, and a shortcut launch isn't a gesture.
		// Chrome often allows it once mic permission is granted, so try — but never
		// leave a note that promised to be listening and silently isn't.
		if (await micPermissionGranted()) editor?.toggleDictation();

		setTimeout(() => {
			if (speech.listening) return;
			toast(t.readyTitle, {
				description: t.readyBody,
				duration: 12_000,
				// A toast action *is* a user gesture, so this path always works.
				action: { label: t.dictate, onClick: () => editor?.toggleDictation() }
			});
		}, 600);
	}

	function trashNote(target: Note) {
		const wasSelected = noteId === target.id;
		notes.trashNote(target.id);
		if (wasSelected) {
			noteId = compact ? null : (notes.listFor(folderId)[0]?.id ?? null);
			if (compact) view = 'list';
		}
		toast(t.movedToTrash, {
			action: { label: t.undo, onClick: () => notes.restoreNote(target.id) }
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
		if (mod && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}
		if (event.key === 'Escape') {
			// Dismissing an overlay must be the *only* thing that Escape does, or
			// closing the palette would also stop dictation and clear the search box.
			//
			// `defaultPrevented` rather than `paletteOpen`: this runs on `window`, so
			// every handler closer to the target — including the dialog's, which lives
			// on `document` — has already run and set `paletteOpen` back to false. The
			// flag is always stale here; the prevented default is not.
			if (event.defaultPrevented || paletteOpen) return;
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
						onopennote={selectNote}
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
			<Resizable.Pane
				defaultSize={panes.list.size}
				minSize={panes.list.min}
				maxSize={panes.list.max}
				class="min-w-0"
			>
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
			<Resizable.Pane defaultSize={panes.editor} minSize={30} class="min-w-0">
				<NoteEditor
					bind:this={editor}
					{note}
					compact={false}
					onback={() => {}}
					oncreate={createNote}
					ontrash={trashNote}
					onopennote={selectNote}
				/>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{/if}
</main>

<ShortcutsDialog bind:open={shortcutsOpen} />

<CommandPalette
	bind:open={paletteOpen}
	context={{
		createNote: () => createNote(),
		selectFolder,
		selectNote: openNoteAnywhere,
		openShortcuts: () => (shortcutsOpen = true),
		// Both are replaced by the palette's own dialog instances; see the comment
		// there. They are in the type because the context describes the whole surface.
		openBackup: () => {},
		openNewFolder: () => {},
		toggleDictation: () => editor?.toggleDictation(),
		toggleTheme: toggleMode,
		speechSupported: speech.supported,
		listening: speech.listening
	}}
/>
