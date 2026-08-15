<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
	import DeletePutBackIcon from '@hugeicons/core-free-icons/DeletePutBackIcon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
	import PinIcon from '@hugeicons/core-free-icons/PinIcon';
	import PinOffIcon from '@hugeicons/core-free-icons/PinOffIcon';
	import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon';
	import DragDropVerticalIcon from '@hugeicons/core-free-icons/DragDropVerticalIcon';

	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { notes, type ListLayout } from '$lib/stores/notes.svelte';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { exportNoteMarkdown } from '$lib/data/transfer';
	import { noteTitle, notePreview, noteThumbnail, type Note } from '$lib/types';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	/**
	 * One note, in whichever shape the current layout calls for.
	 *
	 * Every layout shows the same note with the same actions, so they share one
	 * component rather than four copies of the selected-state colours and the ⋯
	 * menu. The layouts differ in exactly two ways: `row` shapes stack a title
	 * over a meta line, `card` shapes add a thumbnail and a longer excerpt.
	 */
	type Props = {
		note: Note;
		selected: boolean;
		layout: ListLayout;
		isTrash: boolean;
		onselect: (noteId: string) => void;
		/**
		 * Board only. When given, the card grows a drag handle — a handle rather
		 * than a long-press because a column scrolls vertically inside a board that
		 * scrolls horizontally, and `touch-action: none` scoped to the handle leaves
		 * both of those working everywhere else on the card.
		 */
		onhandledown?: (event: PointerEvent, note: Note) => void;
		/** True while this card is the one being dragged, so it can dim in place. */
		dragging?: boolean;
		/**
		 * Board only. A drag ends with a `click` on the card underneath it, which
		 * would otherwise open the note you just filed somewhere else.
		 */
		suppressClick?: () => boolean;
		/**
		 * The card the list would focus if you tabbed into it — the moving half of a
		 * roving tabindex.
		 *
		 * Every card being a tab stop means Tab through a hundred notes is a hundred
		 * stops, and each card has *two* controls, so it is really two hundred. Only
		 * the active card is reachable by Tab; arrow keys move which one that is.
		 */
		active?: boolean;
	};
	let {
		note,
		selected,
		layout,
		isTrash,
		onselect,
		onhandledown,
		dragging = false,
		suppressClick,
		active = false
	}: Props = $props();

	const DICT: Dict<{
		untitled: string;
		noPreview: string;
		pinned: string;
		optionsFor: (title: string) => string;
		restore: string;
		deleteForever: string;
		moveTo: string;
		allNotes: string;
		workspaceGroup: string;
		removeFrom: (name: string) => string;
		addTo: (name: string) => string;
		pin: string;
		unpin: string;
		exportMd: string;
		moveToTrash: string;
		stillConnecting: string;
		addedTo: (name: string) => string;
		addedBody: string;
		theWorkspace: string;
		movedToTrash: string;
		undo: string;
	}> = {
		en: {
			untitled: 'New Note',
			noPreview: 'No additional text',
			pinned: 'Pinned',
			optionsFor: (title) => `Options for ${title}`,
			restore: 'Restore',
			deleteForever: 'Delete permanently',
			moveTo: 'Move to',
			allNotes: 'All Notes',
			workspaceGroup: 'Workspace',
			removeFrom: (name) => `Remove from ${name}`,
			addTo: (name) => `Add to ${name}`,
			pin: 'Pin to top',
			unpin: 'Unpin',
			exportMd: 'Export as Markdown',
			moveToTrash: 'Move to Trash',
			stillConnecting: 'That workspace is still connecting. Try again in a moment.',
			addedTo: (name) => `Added to ${name}`,
			addedBody: 'Members can now edit this note. It stays on your device too.',
			theWorkspace: 'the workspace',
			movedToTrash: 'Note moved to Trash',
			undo: 'Undo'
		},
		id: {
			untitled: 'Catatan Baru',
			noPreview: 'Tidak ada teks lain',
			pinned: 'Disematkan',
			optionsFor: (title) => `Opsi untuk ${title}`,
			restore: 'Pulihkan',
			deleteForever: 'Hapus permanen',
			moveTo: 'Pindahkan ke',
			allNotes: 'Semua Catatan',
			workspaceGroup: 'Ruang kerja',
			removeFrom: (name) => `Keluarkan dari ${name}`,
			addTo: (name) => `Tambahkan ke ${name}`,
			pin: 'Sematkan di atas',
			unpin: 'Lepas sematan',
			exportMd: 'Ekspor sebagai Markdown',
			moveToTrash: 'Pindahkan ke Sampah',
			stillConnecting: 'Ruang kerja itu masih menyambung. Coba lagi sebentar.',
			addedTo: (name) => `Ditambahkan ke ${name}`,
			addedBody:
				'Anggota kini bisa menyunting catatan ini. Salinannya tetap ada di perangkat Anda.',
			theWorkspace: 'ruang kerja',
			movedToTrash: 'Catatan dipindahkan ke Sampah',
			undo: 'Urungkan'
		}
	};
	const t = $derived(DICT[locale.current]);

	const isCard = $derived(layout === 'grid' || layout === 'board');
	const title = $derived(noteTitle(note, t.untitled));
	// Cards clamp to three lines in CSS, so they only need enough text to fill them.
	const preview = $derived(notePreview(note, isCard ? 400 : 160, t.noPreview));
	const thumbnail = $derived(layout === 'grid' ? noteThumbnail(note) : null);

	function formatDate(ts: number) {
		const date = new Date(ts);
		const now = new Date();
		if (date.toDateString() === now.toDateString())
			return date.toLocaleTimeString(locale.current, { hour: 'numeric', minute: '2-digit' });
		if (date.getFullYear() === now.getFullYear())
			return date.toLocaleDateString(locale.current, { month: 'short', day: 'numeric' });
		return date.toLocaleDateString(locale.current, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function addToWorkspace(id: string) {
		const ok = await workspaces.addNote(id, note);
		if (!ok) {
			toast(t.stillConnecting);
			return;
		}
		toast(t.addedTo(workspaces.get(id)?.name ?? t.theWorkspace), { description: t.addedBody });
	}

	function trash() {
		notes.trashNote(note.id);
		toast(t.movedToTrash, {
			action: { label: t.undo, onClick: () => notes.restoreNote(note.id) }
		});
	}

	/**
	 * The ⋯ menu is not built until you reach for it.
	 *
	 * A `DropdownMenu.Root` per card is the single most expensive thing in a long
	 * list. Measured over 500 notes: 343 MB of JS heap with them, 113 MB without,
	 * and a layout switch in the grouped view dropping from 1301 ms to 288 ms. The
	 * menu's *content* was already lazy — it is the root and trigger machinery,
	 * multiplied by the note count, that costs.
	 *
	 * Arming is split by pointer type, and that split is load-bearing.
	 *
	 * With a mouse, hovering the card arms it — a hover always precedes the click,
	 * so the real trigger exists by the time you press.
	 *
	 * Touch cannot use that. The browser fires `pointerenter` immediately *before*
	 * `pointerdown` for a finger, so arming there swapped the placeholder out
	 * mid-tap: the press landed on a node that was being replaced, the click was
	 * dispatched on the wrapper instead of either button, and the first tap on ⋯
	 * did nothing at all — on the layout where that button is permanently visible.
	 * So touch arms from the placeholder's own `pointerdown` and opens the menu
	 * directly, never depending on a click surviving the swap.
	 */
	let menuReady = $state(false);
	let menuOpen = $state(false);
	let triggerEl = $state<HTMLElement | null>(null);

	function armMenu(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		menuReady = true;
	}

	async function armAndOpen() {
		menuReady = true;
		await tick();
		menuOpen = true;
		triggerEl?.focus();
	}

	/** Keep focus on the button when arming replaces it mid-tab. */
	async function armAndKeepFocus() {
		if (menuReady) return;
		menuReady = true;
		await tick();
		triggerEl?.focus();
	}

	const base =
		'flex w-full cursor-pointer flex-col text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
	// Cards carry no padding of their own: the thumbnail is full-bleed, so the
	// padding belongs to the content beside it. `h-full` makes every card in a
	// grid row the same height, which is what stops a row of cards looking ragged
	// when one of them has an image.
	const shape = $derived(
		isCard
			? 'h-full min-h-24 items-stretch overflow-hidden rounded-lg border glass-hairline'
			: 'min-h-11 items-start gap-0.5 rounded-md px-2.5 py-2 pr-9'
	);
	const body = $derived(isCard ? 'flex w-full flex-1 flex-col gap-1.5 p-2.5 pr-9' : 'contents');
	const selectedClass = 'bg-note-accent text-note-accent-foreground hover:bg-note-accent';

	/**
	 * Skip the work for cards that are off screen.
	 *
	 * `content-visibility: auto` lets the browser drop layout, paint *and image
	 * decode* for anything scrolled out of view — which is the cost a grid of
	 * base64 thumbnails adds, and the one measurement showed the lazy ⋯ menu does
	 * not touch. Every card stays in the DOM, so find-in-page and the FLIP
	 * animations keep working; only the rendering is deferred.
	 *
	 * `contain-intrinsic-size` is what makes it safe: without a placeholder size
	 * the scrollbar would resize as cards render, so it is set per layout to the
	 * height that layout's cards actually have.
	 */
	const skipOffscreen = $derived(
		layout === 'compact'
			? 'content-visibility:auto;contain-intrinsic-size:auto 36px'
			: isCard
				? `content-visibility:auto;contain-intrinsic-size:auto ${thumbnail ? 260 : 120}px`
				: 'content-visibility:auto;contain-intrinsic-size:auto 52px'
	);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	data-note-card={note.id}
	class="group/note relative {dragging ? 'opacity-40' : ''}"
	style={skipOffscreen}
	onpointerenter={armMenu}
	onfocusin={() => (menuReady = true)}
>
	<button
		type="button"
		data-card-button
		tabindex={active ? 0 : -1}
		class="{base} {shape} {selected ? selectedClass : ''}"
		aria-current={selected ? 'true' : undefined}
		onclick={() => {
			if (suppressClick?.()) return;
			onselect(note.id);
		}}
	>
		{#if thumbnail}
			<!--
				Lazy and aspect-fixed: an embedded image is up to ~300 KB of base64, and
				a grid can hold a lot of cards. The fixed ratio also stops the grid
				reflowing as images decode.
			-->
			<img
				src={thumbnail}
				alt=""
				loading="lazy"
				decoding="async"
				class="aspect-[16/10] w-full shrink-0 object-cover"
			/>
		{/if}

		<span class={body}>
			<span class="flex w-full items-center gap-1.5">
				{#if note.pinnedAt !== null}
					<HugeiconsIcon
						icon={PinIcon}
						strokeWidth={2}
						class="size-3 shrink-0 {selected
							? 'text-note-accent-foreground/80'
							: 'text-muted-foreground'}"
						aria-label={t.pinned}
					/>
				{/if}
				<span class="truncate text-sm font-medium">{title}</span>
			</span>

			{#if layout !== 'compact'}
				<span
					class="flex w-full flex-1 text-xs {isCard
						? 'flex-col gap-1'
						: 'items-baseline gap-1.5'} {selected
						? 'text-note-accent-foreground/75'
						: 'text-muted-foreground'}"
				>
					{#if isCard}
						<span class="line-clamp-3 text-pretty">{preview}</span>
						<span class="mt-auto tabular-nums">{formatDate(note.updatedAt)}</span>
					{:else}
						<span class="shrink-0 tabular-nums">{formatDate(note.updatedAt)}</span>
						<span class="truncate">{preview}</span>
					{/if}
				</span>
			{/if}
		</span>
	</button>

	{#if onhandledown}
		<!--
			`touch-action: none` is scoped to the handle alone. Putting it on the card
			would stop the column scrolling under a finger; here it only suppresses the
			browser's own gesture for the few pixels you actually grab.
		-->
		<!--
			Not a tab stop, and hidden from assistive tech. A focusable control that
			answers no keyboard event would be a control that lies — and the ⋯ menu
			above already lists every folder under "Move to", by keyboard, in every
			layout including this one. `-webkit-touch-callout` stops iOS opening its
			own long-press menu on the grip.
		-->
		<button
			type="button"
			tabindex="-1"
			aria-hidden="true"
			class="absolute bottom-1 left-1 touch-none rounded-md p-1 text-muted-foreground opacity-0 select-none [-webkit-touch-callout:none] group-hover/note:opacity-100 max-md:opacity-100 {selected
				? 'text-note-accent-foreground'
				: ''}"
			onpointerdown={(event) => onhandledown(event, note)}
		>
			<HugeiconsIcon icon={DragDropVerticalIcon} strokeWidth={2} class="size-3.5" />
		</button>
	{/if}

	{#if !menuReady}
		<!--
			A stand-in until the card is hovered or focused. Identical in class, label
			and tab behaviour, so nothing moves or changes name when the real trigger
			replaces it.
		-->
		<Button
			variant="ghost"
			size="icon-sm"
			tabindex={active ? 0 : -1}
			class="absolute top-1.5 right-1 opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100 max-md:opacity-100 {selected
				? 'text-note-accent-foreground hover:bg-black/15 hover:text-note-accent-foreground'
				: ''}"
			aria-label={t.optionsFor(title)}
			onfocus={armAndKeepFocus}
			onpointerdown={armAndOpen}
			onclick={armAndOpen}
		>
			<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
		</Button>
	{:else}
		<DropdownMenu.Root bind:open={menuOpen}>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						bind:ref={triggerEl}
						variant="ghost"
						size="icon-sm"
						tabindex={active ? 0 : -1}
						class="absolute top-1.5 right-1 opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100 max-md:opacity-100 {selected
							? 'text-note-accent-foreground hover:bg-black/15 hover:text-note-accent-foreground'
							: ''}"
						aria-label={t.optionsFor(title)}
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
							{t.restore}
						</DropdownMenu.Item>
						<DropdownMenu.Item variant="destructive" onSelect={() => notes.purgeNote(note.id)}>
							<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
							{t.deleteForever}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				{:else}
					<!--
					This menu is the keyboard and screen-reader way to move a note, and it
					stays exactly as it was when the board gained dragging. Dragging is an
					addition; it is never the only route.
				-->
					<DropdownMenu.Group>
						<DropdownMenu.Label>{t.moveTo}</DropdownMenu.Label>
						<DropdownMenu.Item
							disabled={note.folderId === null}
							onSelect={() => notes.moveNote(note.id, null)}
						>
							<HugeiconsIcon icon={Note01Icon} strokeWidth={2} />
							{t.allNotes}
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
					{#if workspaces.workspaces.length > 0}
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Label>{t.workspaceGroup}</DropdownMenu.Label>
							{#each workspaces.workspaces as workspace (workspace.id)}
								{#if note.workspaceId === workspace.id}
									<DropdownMenu.Item
										onSelect={() =>
											note.share && workspaces.removeNote(workspace.id, note.share.docId)}
									>
										<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
										{t.removeFrom(workspace.name)}
									</DropdownMenu.Item>
								{:else}
									<DropdownMenu.Item
										disabled={!!note.workspaceId}
										onSelect={() => addToWorkspace(workspace.id)}
									>
										<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
										{t.addTo(workspace.name)}
									</DropdownMenu.Item>
								{/if}
							{/each}
						</DropdownMenu.Group>
					{/if}
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.Item onSelect={() => notes.togglePin(note.id)}>
							<HugeiconsIcon icon={note.pinnedAt === null ? PinIcon : PinOffIcon} strokeWidth={2} />
							{note.pinnedAt === null ? t.pin : t.unpin}
						</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={() => exportNoteMarkdown(note)}>
							<HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
							{t.exportMd}
						</DropdownMenu.Item>
						<DropdownMenu.Item variant="destructive" onSelect={trash}>
							<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
							{t.moveToTrash}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>
