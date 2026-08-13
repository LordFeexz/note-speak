<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import DeletePutBackIcon from '@hugeicons/core-free-icons/DeletePutBackIcon';
	import MicOff01Icon from '@hugeicons/core-free-icons/MicOff01Icon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
	import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';
	import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
	import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
	import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
	import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import * as Empty from '$lib/components/ui/empty';
	import { notes } from '$lib/stores/notes.svelte';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { speech } from '$lib/stores/speech.svelte';
	import { dur } from '$lib/motion.svelte';
	import { createNoteEditor, getMarkdown, setMarkdown, toContent } from '$lib/editor/create';
	import { setInterim } from '$lib/editor/interim';
	import { SlashController } from '$lib/editor/slash-controller.svelte';
	import { BLOCKS, GROUP_LABELS, activeBlock, type BlockDef } from '$lib/editor/blocks';
	import { MEDIA_ACCEPT, prepareMedia, storagePressure, type MediaKind } from '$lib/editor/media';
	import { history } from '$lib/history/store.svelte';
	import HistoryPanel from './history-panel.svelte';
	import VoiceRecorderBar from './voice-recorder.svelte';
	import { recordingSupported } from '$lib/editor/recorder.svelte';
	import BlockMenu from './block-menu.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { noteTitle, type Note } from '$lib/types';
	import DictationButton from './dictation-button.svelte';
	import ShareDialog from './share-dialog.svelte';
	import CollabEditor from './collab-editor.svelte';
	import type { Identity } from '$lib/share/session';

	type Props = {
		note: Note | undefined;
		compact: boolean;
		onback: () => void;
		oncreate: () => void;
		ontrash: (note: Note) => void;
		/** Follow a [[wiki link]] to another note. */
		onopennote?: (noteId: string) => void;
	};

	let { note, compact, onback, oncreate, ontrash, onopennote }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	/** Not `$state`: the Editor is a large mutable object and nothing renders from it directly. */
	let editor: Editor | null = null;
	/** The collaborative instance, when this note is shared. */
	let collabEditor: Editor | null = null;

	/**
	 * Whichever editor is on screen.
	 *
	 * Dictation and the toolbar must follow the note into a share rather than
	 * writing into the hidden local instance — losing voice input on shared notes
	 * would cut out the whole point of the app.
	 */
	function target(): Editor | null {
		return note?.share ? collabEditor : editor;
	}
	let ready = $state(false);
	/** Bumped on every transaction so toolbar active-states re-evaluate. */
	let revision = $state(0);
	/** The note the editor currently holds, so we only reload content on a real switch. */
	let loadedId: string | null = null;

	/**
	 * The stretch of the document this dictation run owns.
	 *
	 * ProseMirror positions rather than string offsets: they survive concurrent
	 * edits by being mapped through transactions, which string offsets cannot do.
	 */
	let spanFrom = 0;
	let spanTo = 0;

	let shareOpen = $state(false);
	let historyOpen = $state(false);
	let recorderActive = $state(false);
	let recorderBar = $state<ReturnType<typeof VoiceRecorderBar> | null>(null);
	let identity = $state<Identity | null>(null);

	const slash = new SlashController({
		onBeforeSelect: () => stopDictationForEdit('A block was inserted.'),
		onNeeds: (block) => runBlock(block)
	});

	const basicBlocks = BLOCKS.filter((block) => block.group === 'basic');
	const advancedBlocks = BLOCKS.filter((block) => block.group === 'advanced');
	const currentBlock = $derived.by(() => {
		void revision;
		return activeBlock(target());
	});

	/**
	 * Run a block, handling the one that needs an argument.
	 *
	 * Image is by URL: with no backend, a local file could only be inlined as a
	 * base64 data URI inside the note's own markdown, which would bloat storage
	 * and be re-signed and relayed on every shared-note update.
	 */
	let mediaInput = $state<HTMLInputElement | null>(null);
	let pendingKind: MediaKind | null = null;

	/**
	 * Insert a picked file as a base64 data URI.
	 *
	 * Nothing is uploaded anywhere — the point of embedding is that a note needs
	 * no third-party host and no network to render. `prepareMedia` downscales
	 * images and refuses oversized video, because the payload ends up inside the
	 * note body, which is searched and, once shared, signed and relayed per edit.
	 */
	async function onMediaPicked(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		const kind = pendingKind;
		// Reset first so picking the same file twice still fires a change event.
		event.currentTarget.value = '';
		pendingKind = null;
		const editor = target();
		if (!file || !kind || !editor) return;

		const result = await prepareMedia(file, kind);
		if (!result.ok) {
			toast.error(result.reason);
			return;
		}
		const pressure = await storagePressure(result.bytes);
		if (pressure) {
			toast.warning(pressure);
		}

		if (kind === 'image') {
			editor.chain().focus().setImage({ src: result.src, alt: result.name }).run();
		} else {
			editor
				.chain()
				.focus()
				.insertContent({
					type: kind,
					attrs: { src: result.src, name: result.name, size: result.size }
				})
				.run();
		}
	}

	function pickMedia(kind: MediaKind) {
		pendingKind = kind;
		if (mediaInput) mediaInput.accept = MEDIA_ACCEPT[kind];
		mediaInput?.click();
	}

	function promptForEmbed() {
		const editor = target();
		if (!editor) return;
		const url = window.prompt('Paste a link (YouTube, Instagram, or any URL)')?.trim();
		if (!url) return;
		// Insert the node directly for immediate feedback; it serializes back to a
		// bare URL, so storage stays plain Markdown either way.
		editor
			.chain()
			.focus()
			.insertContent({ type: 'embed', attrs: { href: url } })
			.run();
	}

	function runBlock(block: BlockDef) {
		const editor = target();
		if (!editor) return;
		stopDictationForEdit();
		if (block.needs === 'url') return promptForEmbed();
		if (block.needs === 'record') {
			if (!recordingSupported()) {
				// Dictation keeps working regardless; only the clip is unavailable.
				toast.error("This browser can't record audio. Dictation still works.");
				return;
			}
			void recorderBar?.begin();
			return;
		}
		if (block.needs) return pickMedia(block.needs);
		block.run(editor);
	}

	const words = $derived(note ? note.body.trim().split(/\s+/).filter(Boolean).length : 0);
	const isTrashed = $derived(!!note?.deletedAt);
	/**
	 * A shared note is edited through the collaborative editor instead.
	 *
	 * The two cannot be the same instance: collaboration replaces the document
	 * source and disables local history, so switching modes means a new editor.
	 * Keyed on docId so starting or stopping a share rebuilds it cleanly.
	 */
	const shareLink = $derived(
		note?.share
			? {
					docId: note.share.docId,
					symKey: note.share.symKey,
					signSeed: note.share.signSeed ?? undefined,
					signPub: note.share.signPub
				}
			: null
	);
	/** Notes pointing at this one. Derived, so a rename can never leave it stale. */
	const backlinks = $derived(note ? notes.backlinksTo(noteTitle(note)) : []);
	const showUnsupportedBanner = $derived(
		!speech.supported && speech.unsupportedReason !== null && !notes.prefs.speechBannerDismissed
	);

	function formatFull(ts: number) {
		return new Date(ts).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
	}

	onMount(() => {
		void notes.identity().then((value) => (identity = value));
		if (!host) return;
		editor = createNoteEditor({
			element: host,
			content: note?.body ?? '',
			editable: !isTrashed,
			onUpdate: (markdown) => {
				if (!note) return;
				// `note.body` is still the pre-edit text here, which is exactly the
				// session base history needs. `touch` keeps only the first one, so a
				// burst of typing becomes a single version.
				void history.touch(note.id, note.body);
				notes.updateBody(note.id, markdown);
				// A workspace index entry carries the title, so other members' lists
				// stay current without them opening the note. No-ops unless it changed.
				workspaces.touchTitle(note);
			},
			slash: slash.extension()
		});
		loadedId = note?.id ?? null;
		// Transactions include selection moves, which is exactly when the toolbar
		// needs to re-check which block the caret is in.
		//
		// Deferred to a microtask, because ProseMirror dispatches transactions from
		// DOM events — a blur in particular — which can land while Svelte is
		// computing a derived. Writing state there throws `state_unsafe_mutation`
		// and leaves the render half-finished; it was breaking the slash menu.
		// Guarding at the write site covers every dispatch source at once.
		editor.on('transaction', () => queueMicrotask(() => (revision += 1)));

		// Wiki links raise an event rather than reaching into the store themselves.
		const onWikiLink = (event: Event) => {
			const title = (event as CustomEvent<{ title: string }>).detail?.title ?? '';
			const found = notes.findByTitle(title);
			if (found) {
				onopennote?.(found.id);
				return;
			}
			// An unresolved link is an invitation: make the note it points at.
			const created = notes.createNote(note?.folderId ?? null);
			notes.updateBody(created.id, title);
			onopennote?.(created.id);
			toast.success(`Created “${title}”`);
		};
		host.addEventListener('wikilink', onWikiLink);
		ready = true;
		return () => {
			host?.removeEventListener('wikilink', onWikiLink);
			editor?.destroy();
			editor = null;
		};
	});

	// Load content only when the *note* changes. Reacting to `note.body` would
	// fight the editor: every keystroke writes the body, which would reload it.
	$effect(() => {
		const id = note?.id ?? null;
		if (!ready || !editor || id === loadedId) return;
		// Switching notes ends the previous note's editing session.
		const previous = loadedId;
		if (previous) {
			const body = notes.getNote(previous)?.body;
			if (body !== undefined) void history.commit(previous, body);
		}
		loadedId = id;
		// setMarkdown uses emitUpdate: false — swapping notes is not an edit and
		// must not bump updatedAt.
		setMarkdown(editor, note?.body ?? '');
	});

	$effect(() => {
		if (ready && editor) editor.setEditable(!isTrashed);
	});

	// Switching notes must not leave the recogniser writing into the previous one.
	$effect(() => {
		const id = note?.id;
		return () => {
			if (speech.listening && id) speech.stop();
		};
	});

	/**
	 * Rewrite the finalized part of the dictation span.
	 *
	 * The span is always *replaced* with the complete transcript, never appended
	 * to — that pairing is what makes a re-delivered recognition result a no-op
	 * instead of a duplicate.
	 */
	function writeSpan(text: string) {
		const editor = target();
		if (!editor) return;
		editor
			.chain()
			.setMeta('addToHistory', false)
			.insertContentAt({ from: spanFrom, to: spanTo }, toContent(text), { updateSelection: true })
			.run();
		// Read the end back from the document rather than computing it from string
		// length: inserted blocks carry node boundaries that text length can't see.
		spanTo = editor.state.selection.from;
	}

	/**
	 * Commit the transcript as a single undoable edit.
	 *
	 * Live writes are deliberately kept out of history, so at this point the text
	 * is in the document but unrecorded — leaving it there would make ⌘Z skip the
	 * dictation entirely and undo whatever the user typed *before* it. Removing
	 * the live text (still off-history) and re-inserting it once with history
	 * yields exactly one entry, whose inverse drops the whole utterance.
	 */
	function commitSpan() {
		const editor = target();
		if (!editor || !note) return;
		setInterim(editor, null);
		const committed = speech.finalText;

		if (spanTo > spanFrom) {
			editor
				.chain()
				.setMeta('addToHistory', false)
				.deleteRange({ from: spanFrom, to: spanTo })
				.run();
			spanTo = spanFrom;
		}
		if (committed) {
			editor
				.chain()
				.insertContentAt(spanFrom, toContent(committed), { updateSelection: true })
				.run();
			spanTo = editor.state.selection.from;
			notes.updateBody(note.id, getMarkdown(editor));
		}
		spanFrom = spanTo;
	}

	function startDictation() {
		const editor = target();
		if (!editor || !note || isTrashed) return;
		editor.commands.focus();
		let caret = editor.state.selection.from;
		// Don't glue dictated words onto the previous one.
		const before = editor.state.doc.textBetween(Math.max(0, caret - 1), caret);
		if (before && !/\s/.test(before)) {
			editor.chain().insertContentAt(caret, ' ').run();
			caret = editor.state.selection.from;
		}
		spanFrom = caret;
		spanTo = caret;
		speech.start();
	}

	function stopDictation() {
		// Read before stopping: keep what the engine finalised, drop the half-heard tail.
		speech.stop();
		commitSpan();
	}

	export function toggleDictation() {
		if (!speech.supported) {
			toast.error(
				speech.unsupportedReason === 'insecure-context'
					? 'Voice notes need a secure (https) connection.'
					: "This browser doesn't support voice notes."
			);
			return;
		}
		if (speech.listening) stopDictation();
		else startDictation();
	}

	export function focusEditor() {
		target()?.commands.focus();
	}

	$effect(() => {
		speech.onupdate = () => {
			const editor = target();
			if (!editor) return;
			const settled = speech.finalText;
			writeSpan(settled);

			// Show the pending tail as the difference between the full preview and
			// what has settled, so spoken punctuation appears in the right place.
			// If tidying reflowed earlier text the prefix won't match — fall back to
			// the raw tail rather than showing something misleading.
			const preview = speech.previewText;
			const tail = preview.startsWith(settled)
				? preview.slice(settled.length)
				: speech.interim
					? ` ${speech.interim}`
					: '';
			setInterim(editor, tail ? { pos: spanTo, text: tail } : null);
			void tick().then(() => editor?.commands.scrollIntoView());
		};
		speech.onerror = (message) => {
			toast.error(message);
			stopDictation();
		};
		return () => {
			speech.onupdate = null;
			speech.onerror = null;
		};
	});

	/**
	 * Manual edits win over dictation.
	 *
	 * Typing *and* inserting a block both move the span offsets out from under
	 * the recogniser, so both take this path rather than only keystrokes.
	 */
	function stopDictationForEdit(reason = 'Typing takes over from your voice.') {
		if (!speech.listening) return;
		speech.stop();
		const editor = target();
		if (editor) setInterim(editor, null);
		spanFrom = spanTo;
		toast('Dictation stopped', { description: reason });
	}

	function onEditorKeydown() {
		stopDictationForEdit();
	}
</script>

<div class="flex h-full min-h-0 flex-col glass-strong">
	{#if !note}
		<div class="grid h-full place-items-center p-6">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<HugeiconsIcon icon={Note01Icon} strokeWidth={2} />
					</Empty.Media>
					<Empty.Title>No note selected</Empty.Title>
					<Empty.Description>Pick a note from the list, or start a new one.</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button size="sm" onclick={oncreate}>
						<HugeiconsIcon icon={NoteAddIcon} strokeWidth={2} data-icon="inline-start" />
						New note
					</Button>
				</Empty.Content>
			</Empty.Root>
		</div>
	{:else}
		<header class="flex items-center gap-2 border-b px-3 py-2 safe-t">
			{#if compact}
				<Button variant="ghost" size="icon-sm" onclick={onback} aria-label="Back to notes">
					<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
				</Button>
			{/if}
			<p class="flex-1 truncate text-xs text-muted-foreground">
				Edited {formatFull(note.updatedAt)}
			</p>
			{#if isTrashed}
				<Button variant="ghost" size="sm" onclick={() => notes.restoreNote(note.id)}>
					<HugeiconsIcon icon={DeletePutBackIcon} strokeWidth={2} data-icon="inline-start" />
					Restore
				</Button>
			{:else}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Version history"
					onclick={() => (historyOpen = true)}
				>
					<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
				</Button>
				<Button
					variant={note.share ? 'secondary' : 'ghost'}
					size={note.share ? 'sm' : 'icon-sm'}
					aria-label={note.share ? 'Sharing options' : 'Share note'}
					onclick={() => (shareOpen = true)}
				>
					<HugeiconsIcon
						icon={Share08Icon}
						strokeWidth={2}
						data-icon={note.share ? 'inline-start' : undefined}
					/>
					{#if note.share}Shared{/if}
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Move note to Trash"
					onclick={() => ontrash(note)}
				>
					<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
				</Button>
			{/if}
		</header>

		{#if showUnsupportedBanner}
			<div class="px-4 pt-3" transition:fade={{ duration: dur(150) }}>
				<Alert.Root class="pr-10">
					<HugeiconsIcon icon={MicOff01Icon} strokeWidth={2} />
					<Alert.Title>Voice notes aren't available here</Alert.Title>
					<Alert.Description>
						{#if speech.unsupportedReason === 'insecure-context'}
							Speech recognition only runs over a secure (https) connection. You can still type
							notes normally.
						{:else}
							This browser has no built-in speech recognition. Try Chrome, Edge, or Safari — you can
							still type notes normally.
						{/if}
					</Alert.Description>
					<Button
						variant="ghost"
						size="icon-xs"
						class="absolute top-2 right-2"
						aria-label="Dismiss"
						onclick={() => notes.setPref('speechBannerDismissed', true)}
					>
						<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
					</Button>
				</Alert.Root>
			</div>
		{/if}

		{#if isTrashed}
			<div class="px-4 pt-3">
				<Alert.Root variant="destructive">
					<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
					<Alert.Title>This note is in the Trash</Alert.Title>
					<Alert.Description>Restore it to keep editing.</Alert.Description>
				</Alert.Root>
			</div>
		{/if}
	{/if}

	<!--
		The editor host stays mounted across note switches — tearing down ProseMirror
		per note would drop undo history and cost a full re-init on every click.
		It is only hidden when there is no note to show.
	-->
	{#if note && shareLink && identity}
		{#key shareLink.docId}
			<CollabEditor
				link={shareLink}
				{identity}
				onmarkdown={(markdown) => note && notes.updateBody(note.id, markdown)}
				oneditor={(instance) => (collabEditor = instance)}
				{...{
					/*
					 * Only a note this device actually holds may seed the shared
					 * document. A workspace note is published once, by the member who
					 * added it; for everyone else `body` is a placeholder holding the
					 * title, and seeding it would overwrite the real note with its own
					 * title the first time it was opened before the content arrived.
					 */
					seedMarkdown: note.workspaceId ? undefined : note.body
				}}
			/>
		{/key}
	{/if}

	<div
		class="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-4 md:px-6 {note && !shareLink
			? ''
			: 'hidden'}"
		onkeydowncapture={onEditorKeydown}
		role="presentation"
	>
		<div bind:this={host} class="h-full"></div>
	</div>

	{#if note && backlinks.length > 0}
		<div class="border-t px-4 py-2 text-xs">
			<span class="text-muted-foreground">Linked from</span>
			<span class="ml-1 inline-flex flex-wrap gap-x-3 gap-y-1">
				{#each backlinks as link (link.id)}
					<button
						type="button"
						class="cursor-pointer text-note-accent hover:underline"
						onclick={() => onopennote?.(link.id)}
					>
						{noteTitle(link)}
					</button>
				{/each}
			</span>
		</div>
	{/if}

	{#if note && !isTrashed}
		<div class="flex items-center gap-1 border-t px-2 py-1">
			<!-- Format: converts the current block, and is labelled with it. -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="sm"
							class="min-h-9 gap-1 text-muted-foreground"
							aria-label="Block format: {currentBlock?.title ?? 'Text'}"
						>
							{#if currentBlock}
								<HugeiconsIcon icon={currentBlock.icon} strokeWidth={2} data-icon="inline-start" />
							{/if}
							<span class="max-w-24 truncate">{currentBlock?.title ?? 'Text'}</span>
							<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} class="size-3.5 opacity-60" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-56">
					<DropdownMenu.Group>
						<DropdownMenu.Label>{GROUP_LABELS.basic}</DropdownMenu.Label>
						{#each basicBlocks as block (block.id)}
							<DropdownMenu.CheckboxItem
								checked={currentBlock?.id === block.id}
								onCheckedChange={() => runBlock(block)}
							>
								<HugeiconsIcon icon={block.icon} strokeWidth={2} />
								{block.title}
							</DropdownMenu.CheckboxItem>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Insert: adds a new node. No active state — it is not a mode. -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="sm"
							class="min-h-9 gap-1 text-muted-foreground"
							aria-label="Insert a block"
						>
							<HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
							Insert
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-56">
					<DropdownMenu.Group>
						<DropdownMenu.Label>{GROUP_LABELS.advanced}</DropdownMenu.Label>
						{#each advancedBlocks as block (block.id)}
							<DropdownMenu.Item onSelect={() => runBlock(block)}>
								<HugeiconsIcon icon={block.icon} strokeWidth={2} />
								{block.title}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<span class="flex-1"></span>
			<!--
				Quick toggles for the three most-used list types. Hidden below `sm`:
				the editor pane is 390px wide on a phone, where these plus the two
				dropdowns would overflow the row.
			-->
			<div class="hidden items-center gap-0.5 sm:flex">
				{#each basicBlocks.filter((block) => block.id.endsWith('List')) as block (block.id)}
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={block.title}
						aria-pressed={currentBlock?.id === block.id}
						class={currentBlock?.id === block.id
							? 'bg-muted text-foreground'
							: 'text-muted-foreground'}
						onclick={() => runBlock(block)}
					>
						<HugeiconsIcon icon={block.icon} strokeWidth={2} />
					</Button>
				{/each}
			</div>
		</div>
	{/if}

	{#if note}
		<VoiceRecorderBar
			bind:this={recorderBar}
			bind:active={recorderActive}
			oninsert={(clip) => {
				target()
					?.chain()
					.focus()
					.insertContent({
						type: 'voice',
						attrs: { src: clip.src, transcript: clip.transcript, duration: clip.duration }
					})
					.run();
			}}
		/>
	{/if}

	{#if note && speech.listening && !recorderActive}
		<div
			class="flex items-center gap-2 border-t border-recording/30 bg-recording/5 px-4 py-2"
			transition:fly={{ y: 8, duration: dur(180) }}
		>
			{#if speech.phase === 'starting' || speech.phase === 'processing'}
				<HugeiconsIcon
					icon={Loading03Icon}
					strokeWidth={2}
					class="size-3.5 shrink-0 animate-spin text-recording"
				/>
			{:else}
				<span class="size-2 shrink-0 animate-pulse rounded-full bg-recording" aria-hidden="true"
				></span>
			{/if}
			<p
				data-slot="dictation-status"
				class="min-w-0 flex-1 truncate text-xs {speech.phase === 'hearing'
					? 'text-foreground'
					: 'text-muted-foreground'}"
				aria-live="polite"
			>
				{#if speech.phase === 'starting'}
					Starting microphone…
				{:else if speech.phase === 'processing'}
					Transcribing “{speech.interim}”…
				{:else if speech.interim}
					{speech.interim}
				{:else}
					Listening…
				{/if}
			</p>
			<Button variant="ghost" size="xs" onclick={stopDictation}>Stop</Button>
		</div>
	{/if}

	{#if note}
		<footer class="flex items-center justify-between gap-2 border-t px-3 py-2 safe-b">
			<p class="text-xs text-muted-foreground tabular-nums">
				{words} word{words === 1 ? '' : 's'}
			</p>
			<DictationButton ontoggle={toggleDictation} disabled={isTrashed} />
		</footer>
	{/if}
</div>

<!-- One picker reused by every media block; `accept` is set per kind. -->
<input bind:this={mediaInput} type="file" class="hidden" onchange={onMediaPicked} />

<ShareDialog bind:open={shareOpen} {note} />

<HistoryPanel
	bind:open={historyOpen}
	{note}
	onrestore={(body) => {
		if (!note) return;
		// Applied through the normal edit path, so the restore is itself undoable
		// and the text it replaced becomes a version of its own.
		const editor = target();
		if (editor) setMarkdown(editor, body);
		notes.updateBody(note.id, body);
	}}
/>

<!-- Rendered outside the editor's overflow container so it is never clipped. -->
<BlockMenu slash={slash.state} selected={slash.index} onselect={(block) => slash.select(block)} />
