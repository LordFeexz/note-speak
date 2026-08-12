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
	import CheckListIcon from '@hugeicons/core-free-icons/CheckListIcon';
	import LeftToRightListBulletIcon from '@hugeicons/core-free-icons/LeftToRightListBulletIcon';
	import LeftToRightListNumberIcon from '@hugeicons/core-free-icons/LeftToRightListNumberIcon';
	import TextIcon from '@hugeicons/core-free-icons/TextIcon';
	import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import * as Empty from '$lib/components/ui/empty';
	import { notes } from '$lib/stores/notes.svelte';
	import { speech } from '$lib/stores/speech.svelte';
	import { dur } from '$lib/motion.svelte';
	import { createNoteEditor, getMarkdown, setMarkdown, toContent } from '$lib/editor/create';
	import { setInterim } from '$lib/editor/interim';
	import type { Note } from '$lib/types';
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
	};

	let { note, compact, onback, oncreate, ontrash }: Props = $props();

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
	let identity = $state<Identity | null>(null);

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
				if (note) notes.updateBody(note.id, markdown);
			}
		});
		loadedId = note?.id ?? null;
		// Transactions include selection moves, which is exactly when the toolbar
		// needs to re-check which block the caret is in.
		editor.on('transaction', () => (revision += 1));
		ready = true;
		return () => {
			editor?.destroy();
			editor = null;
		};
	});

	// Load content only when the *note* changes. Reacting to `note.body` would
	// fight the editor: every keystroke writes the body, which would reload it.
	$effect(() => {
		const id = note?.id ?? null;
		if (!ready || !editor || id === loadedId) return;
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

	/** Typing wins: manual edits move the span out from under the recogniser. */
	function onEditorKeydown() {
		if (!speech.listening) return;
		speech.stop();
		const editor = target();
		if (editor) setInterim(editor, null);
		spanFrom = spanTo;
		toast('Dictation stopped', { description: 'Typing takes over from your voice.' });
	}

	const isActive = (name: string, attrs?: Record<string, unknown>) => {
		void revision;
		const editor = target();
		return ready && editor ? editor.isActive(name, attrs) : false;
	};
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
				seedMarkdown={note.body}
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

	{#if note && !isTrashed}
		<div class="flex items-center gap-0.5 border-t px-2 py-1">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Checklist"
				aria-pressed={isActive('taskList')}
				class={isActive('taskList') ? 'bg-muted text-foreground' : 'text-muted-foreground'}
				onclick={() => target()?.chain().focus().toggleTaskList().run()}
			>
				<HugeiconsIcon icon={CheckListIcon} strokeWidth={2} />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Bulleted list"
				aria-pressed={isActive('bulletList')}
				class={isActive('bulletList') ? 'bg-muted text-foreground' : 'text-muted-foreground'}
				onclick={() => target()?.chain().focus().toggleBulletList().run()}
			>
				<HugeiconsIcon icon={LeftToRightListBulletIcon} strokeWidth={2} />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Numbered list"
				aria-pressed={isActive('orderedList')}
				class={isActive('orderedList') ? 'bg-muted text-foreground' : 'text-muted-foreground'}
				onclick={() => target()?.chain().focus().toggleOrderedList().run()}
			>
				<HugeiconsIcon icon={LeftToRightListNumberIcon} strokeWidth={2} />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Heading"
				aria-pressed={isActive('heading', { level: 2 })}
				class={isActive('heading', { level: 2 })
					? 'bg-muted text-foreground'
					: 'text-muted-foreground'}
				onclick={() => target()?.chain().focus().toggleHeading({ level: 2 }).run()}
			>
				<HugeiconsIcon icon={TextIcon} strokeWidth={2} />
			</Button>
		</div>
	{/if}

	{#if note && speech.listening}
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

<ShareDialog bind:open={shareOpen} {note} />
