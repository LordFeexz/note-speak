<script lang="ts">
	import { flip } from 'svelte/animate';
	import { Portal } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';
	import { notes } from '$lib/stores/notes.svelte';
	import { noteTitle, type Note } from '$lib/types';
	import { BoardDrag, type ColumnId, type DragPhase } from '$lib/list/drag.svelte';
	import { dur } from '$lib/motion.svelte';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';
	import NoteCard from './note-card.svelte';

	/**
	 * Every folder side by side, with notes draggable between them.
	 *
	 * The columns come from the same `listFor()` result the other layouts render,
	 * partitioned by `folderId` — so pins-first and the chosen sort hold inside
	 * every column without any extra sorting here.
	 */
	type Props = {
		list: Note[];
		selectedId: string | null;
		onselect: (noteId: string) => void;
	};
	let { list, selectedId, onselect }: Props = $props();

	const DICT: Dict<{
		unfiled: string;
		board: string;
		column: (name: string, count: number) => string;
		empty: string;
		lifted: (title: string) => string;
		over: (folder: string) => string;
		moved: (title: string, folder: string) => string;
		cancelled: (title: string) => string;
	}> = {
		en: {
			unfiled: 'All Notes',
			board: 'Notes by folder',
			column: (name, count) => `${name}, ${count} note${count === 1 ? '' : 's'}`,
			empty: 'Drop a note here',
			lifted: (title) => `Picked up ${title}`,
			over: (folder) => `Over ${folder}`,
			moved: (title, folder) => `Moved ${title} to ${folder}`,
			cancelled: (title) => `Left ${title} where it was`
		},
		id: {
			unfiled: 'Semua Catatan',
			board: 'Catatan menurut folder',
			column: (name, count) => `${name}, ${count} catatan`,
			empty: 'Lepaskan catatan di sini',
			lifted: (title) => `${title} diangkat`,
			over: (folder) => `Di atas ${folder}`,
			moved: (title, folder) => `${title} dipindahkan ke ${folder}`,
			cancelled: (title) => `${title} dibiarkan di tempatnya`
		}
	};
	const t = $derived(DICT[locale.current]);

	const drag = new BoardDrag();

	let board = $state<HTMLElement | null>(null);
	let row = $state<HTMLElement | null>(null);
	const columnEls: Record<string, HTMLElement | null> = {};
	const scrollerEls: Record<string, HTMLElement | null> = {};

	const columns = $derived([
		{ id: null as ColumnId, name: t.unfiled, icon: Note01Icon },
		...notes.folders.map((folder) => ({
			id: folder.id as ColumnId,
			name: folder.name,
			icon: Folder01Icon
		}))
	]);

	const grouped = $derived(
		new Map(
			columns.map((column) => [
				key(column.id),
				list.filter((note) => (note.folderId ?? null) === column.id)
			])
		)
	);

	/** `null` is a legitimate column id, so it needs a string form for map keys. */
	function key(id: ColumnId): string {
		return id ?? ' unfiled';
	}

	function geometry() {
		return {
			board,
			row,
			columns: columns.flatMap((column) => {
				const element = columnEls[key(column.id)];
				return element
					? [{ id: column.id, element, scroller: scrollerEls[key(column.id)] ?? null }]
					: [];
			})
		};
	}

	/**
	 * Say which column the note is over, but only as it changes.
	 *
	 * `over` only updates when the pointer crosses a boundary, so this is
	 * inherently throttled — no debounce needed to keep the live region calm.
	 */
	let spoken = $state<ColumnId | undefined>(undefined);
	$effect(() => {
		if (!drag.note) {
			spoken = undefined;
			return;
		}
		if (drag.over === spoken) return;
		spoken = drag.over;
		if (drag.over !== undefined && drag.over !== drag.from) {
			drag.announcement = announce(drag.note, drag.over, 'over');
		}
	});

	/**
	 * Keyboard navigation across columns.
	 *
	 * Tracked by note id rather than by index: columns have different lengths, and
	 * an index that means row 3 of Work means nothing in a column with two notes.
	 * `lastRow` remembers how far down you were in each column, so stepping away
	 * and back lands where you left rather than at the top.
	 */
	let activeId = $state<string | null>(null);
	const lastRow: Record<string, number> = {};

	const active = $derived.by(() => {
		const first = columns.find((column) => (grouped.get(key(column.id)) ?? []).length > 0);
		const fallback = first
			? { column: key(first.id), row: 0, note: grouped.get(key(first.id))![0].id }
			: null;
		if (!activeId) return fallback;
		for (const column of columns) {
			const items = grouped.get(key(column.id)) ?? [];
			const row = items.findIndex((note) => note.id === activeId);
			if (row !== -1) return { column: key(column.id), row, note: activeId };
		}
		// The active note was moved, trashed or filtered away.
		return fallback;
	});

	function focusNote(id: string) {
		activeId = id;
		const card = board?.querySelector<HTMLElement>(
			`[data-note-card="${CSS.escape(id)}"] [data-card-button]`
		);
		if (!card) return;
		card.focus();
		card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	function onBoardKeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || !active) return;
		const order = columns.map((column) => key(column.id));
		const columnIndex = order.indexOf(active.column);
		const items = (id: string) => grouped.get(id) ?? [];
		let target: string | null = null;

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				const list = items(active.column);
				const row = Math.min(
					list.length - 1,
					Math.max(0, active.row + (event.key === 'ArrowDown' ? 1 : -1))
				);
				target = list[row]?.id ?? null;
				break;
			}
			case 'ArrowRight':
			case 'ArrowLeft': {
				lastRow[active.column] = active.row;
				// Step over empty columns rather than stalling on one you cannot enter.
				const direction = event.key === 'ArrowRight' ? 1 : -1;
				for (let i = columnIndex + direction; i >= 0 && i < order.length; i += direction) {
					const list = items(order[i]);
					if (list.length === 0) continue;
					target = list[Math.min(lastRow[order[i]] ?? 0, list.length - 1)]?.id ?? null;
					break;
				}
				break;
			}
			case 'Home':
				target = items(active.column)[0]?.id ?? null;
				break;
			case 'End': {
				const list = items(active.column);
				target = list[list.length - 1]?.id ?? null;
				break;
			}
			default:
				return;
		}

		event.preventDefault();
		if (target) focusNote(target);
	}

	function onBoardFocusIn(event: FocusEvent) {
		const card = (event.target as HTMLElement | null)?.closest('[data-note-card]');
		const id = card?.getAttribute('data-note-card');
		if (id) activeId = id;
	}

	function announce(note: Note, column: ColumnId | undefined, phase: DragPhase): string {
		const title = noteTitle(note);
		const name = columns.find((entry) => entry.id === column)?.name ?? t.unfiled;
		if (phase === 'lift') return t.lifted(title);
		if (phase === 'over') return t.over(name);
		if (phase === 'drop') return t.moved(title, name);
		return t.cancelled(title);
	}
</script>

<!--
	The board scrolls horizontally and each column scrolls itself vertically.
	Columns are full height rather than content height, so the empty space below a
	short column is still somewhere you can drop a note.
-->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={board}
	class="h-full scroll-slim overflow-x-auto overflow-y-hidden"
	role="list"
	aria-label={t.board}
	onkeydown={onBoardKeydown}
	onfocusin={onBoardFocusIn}
>
	<div bind:this={row} class="flex h-full min-h-0 items-stretch gap-2 px-2 pb-3">
		{#each columns as column (key(column.id))}
			{@const items = grouped.get(key(column.id)) ?? []}
			{@const isOver = drag.note !== null && drag.over === column.id && drag.over !== drag.from}
			<section
				bind:this={columnEls[key(column.id)]}
				role="listitem"
				aria-label={t.column(column.name, items.length)}
				class="flex h-full min-h-0 w-56 shrink-0 flex-col rounded-lg transition-colors {isOver
					? 'bg-note-accent/12 ring-2 ring-note-accent'
					: ''}"
			>
				<h3
					class="flex shrink-0 items-center gap-1.5 px-2.5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
				>
					<HugeiconsIcon icon={column.icon} strokeWidth={2} class="size-3.5 shrink-0" />
					<span class="truncate">{column.name}</span>
					<span class="ml-auto tabular-nums">{items.length}</span>
				</h3>

				<div
					bind:this={scrollerEls[key(column.id)]}
					class="flex min-h-0 flex-1 scroll-slim flex-col gap-1.5 overflow-y-auto overscroll-contain px-1.5 pb-1.5"
				>
					{#each items as note (note.id)}
						<div animate:flip={{ duration: dur(180) }}>
							<NoteCard
								{note}
								selected={note.id === selectedId}
								layout="board"
								isTrash={false}
								{onselect}
								dragging={drag.note?.id === note.id}
								suppressClick={() => drag.justDropped()}
								active={note.id === active?.note}
								onhandledown={(event, dragged) =>
									drag.start(event, dragged, { geometry, announce })}
							/>
						</div>
					{/each}

					{#if items.length === 0}
						<p
							class="rounded-md border border-dashed glass-hairline px-2 py-4 text-center text-xs text-muted-foreground"
						>
							{t.empty}
						</p>
					{/if}
				</div>
			</section>
		{/each}
	</div>
</div>

<!--
	Portalled to `<body>` on purpose. `position: fixed` resolves against the
	nearest ancestor with a transform or a backdrop-filter, and this card has both
	above it — `<main>` carries `translateY(var(--app-offset))` and the list pane
	uses the `glass` utility. Left in place, the preview would be offset by a whole
	pane and then clipped by the pane's own `overflow: hidden`.
-->
{#if drag.note}
	<Portal>
		<div
			{@attach (element) => drag.attachPreview(element)}
			aria-hidden="true"
			class="pointer-events-none fixed top-0 left-0 z-50 w-52 rotate-2 opacity-90 will-change-transform"
		>
			<div class="glass-overlay rounded-lg border p-2.5">
				<span class="truncate text-sm font-medium">{noteTitle(drag.note)}</span>
			</div>
		</div>
	</Portal>
{/if}

<!-- The drag is visual; this is how it reaches anyone not watching the screen. -->
<div class="sr-only" role="status" aria-live="polite">{drag.announcement}</div>
