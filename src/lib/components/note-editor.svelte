<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import DeletePutBackIcon from '@hugeicons/core-free-icons/DeletePutBackIcon';
	import MicOff01Icon from '@hugeicons/core-free-icons/MicOff01Icon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
	import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import * as Empty from '$lib/components/ui/empty';
	import { notes } from '$lib/stores/notes.svelte';
	import { speech } from '$lib/stores/speech.svelte';
	import { dur } from '$lib/motion.svelte';
	import type { Note } from '$lib/types';
	import DictationButton from './dictation-button.svelte';

	type Props = {
		note: Note | undefined;
		compact: boolean;
		onback: () => void;
		oncreate: () => void;
		ontrash: (note: Note) => void;
	};

	let { note, compact, onback, oncreate, ontrash }: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);

	/** The stretch of `body` this dictation run owns: where it starts and how long it is. */
	let spanStart = 0;
	let spanLength = 0;

	const words = $derived(note ? note.body.trim().split(/\s+/).filter(Boolean).length : 0);
	const isTrashed = $derived(!!note?.deletedAt);
	const showUnsupportedBanner = $derived(
		!speech.supported && speech.unsupportedReason !== null && !notes.prefs.speechBannerDismissed
	);

	function formatFull(ts: number) {
		return new Date(ts).toLocaleString(undefined, {
			dateStyle: 'long',
			timeStyle: 'short'
		});
	}

	/**
	 * Rewrite the whole dictation span with `text`.
	 *
	 * The span is always *replaced*, never appended to, and `text` is always the
	 * complete transcript so far — that combination is what makes a re-delivered
	 * result harmless instead of a duplicate.
	 */
	function writeSpan(text: string) {
		if (!note) return;
		const body = note.body;
		const before = body.slice(0, spanStart);
		const after = body.slice(spanStart + spanLength);
		notes.updateBody(note.id, before + text + after);
		spanLength = text.length;
	}

	/** Park the caret at the end of the dictated span once the DOM has caught up. */
	async function restoreCaret() {
		await tick();
		const caret = spanStart + spanLength;
		textarea?.setSelectionRange(caret, caret);
	}

	function startDictation() {
		if (!note || isTrashed) return;
		const body = note.body;
		let caret = textarea?.selectionStart ?? body.length;
		// Don't glue dictated words onto the previous one.
		if (caret > 0 && !/\s/.test(body[caret - 1])) {
			notes.updateBody(note.id, body.slice(0, caret) + ' ' + body.slice(caret));
			caret += 1;
		}
		spanStart = caret;
		spanLength = 0;
		speech.start();
		if (speech.listening) textarea?.focus();
	}

	function stopDictation() {
		// Read before stopping: keep what the engine finalised, drop the half-heard tail.
		const committed = speech.finalText;
		speech.stop();
		if (note) {
			writeSpan(committed ? committed + ' ' : '');
			spanStart += spanLength;
			spanLength = 0;
		}
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
		textarea?.focus();
	}

	$effect(() => {
		speech.onupdate = () => {
			const parts = [speech.finalText, speech.interim].filter(Boolean);
			writeSpan(parts.join(' '));
			void restoreCaret();
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

	// Switching notes must not leave the recogniser writing into the previous one.
	$effect(() => {
		const id = note?.id;
		return () => {
			if (speech.listening && id) speech.stop();
		};
	});

	function onInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
		if (!note) return;
		if (speech.listening) {
			// Manual edits move the span's offsets out from under us, so typing wins.
			// The transcript already in the textarea stays as typed — hence no writeSpan here.
			speech.stop();
			spanLength = 0;
			toast('Dictation stopped', { description: 'Typing takes over from your voice.' });
		}
		notes.updateBody(note.id, event.currentTarget.value);
	}
</script>

<div class="flex h-full min-h-0 flex-col bg-background">
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

		<!-- border-0/ring-0 undo @tailwindcss/forms, which gives textareas a border and a blue focus ring. -->
		<textarea
			bind:this={textarea}
			value={note.body}
			oninput={onInput}
			readonly={isTrashed}
			spellcheck="true"
			placeholder="Start writing, or tap Dictate to speak…"
			aria-label="Note text"
			class="min-h-0 w-full flex-1 resize-none scroll-slim border-0 bg-transparent px-4 py-4 text-base leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/70 read-only:opacity-70 focus:border-0 focus:ring-0 focus:outline-none md:px-6"
		></textarea>

		{#if speech.listening}
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

		<footer class="flex items-center justify-between gap-2 border-t px-3 py-2 safe-b">
			<p class="text-xs text-muted-foreground tabular-nums">
				{words} word{words === 1 ? '' : 's'}
			</p>
			<DictationButton ontoggle={toggleDictation} disabled={isTrashed} />
		</footer>
	{/if}
</div>
