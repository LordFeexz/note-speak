<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
	import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
	import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
	import ArrowUpDownIcon from '@hugeicons/core-free-icons/ArrowUpDownIcon';
	import ListViewIcon from '@hugeicons/core-free-icons/ListViewIcon';
	import Menu02Icon from '@hugeicons/core-free-icons/Menu02Icon';
	import GridViewIcon from '@hugeicons/core-free-icons/GridViewIcon';
	import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
	import KanbanIcon from '@hugeicons/core-free-icons/KanbanIcon';
	import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Empty from '$lib/components/ui/empty';
	import {
		notes,
		effectiveLayout,
		LIST_LAYOUTS,
		SORT_LABELS,
		WORKSPACE_PREFIX,
		type ListLayout,
		type SortBy
	} from '$lib/stores/notes.svelte';
	import NoteCard from './note-card.svelte';
	import NoteBoard from './note-board.svelte';
	import { workspaces } from '$lib/workspace/store.svelte';
	import { connectionChip, connectionOf } from '$lib/workspace/connection';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	import { noteTitle, type Note } from '$lib/types';
	import { dur } from '$lib/motion.svelte';

	const DICT: Dict<{
		trash: string;
		allNotes: string;
		notes: string;
		showFolders: string;
		membersOnline: (n: number) => string;
		noneOnline: string;
		connecting: string;
		empty: string;
		sortBy: (label: string) => string;
		sortGroup: string;
		sortLabels: Record<SortBy, string>;
		newNote: string;
		searchPlaceholder: string;
		searchLabel: string;
		clearSearch: string;
		noMatches: string;
		trashEmpty: string;
		nothingHere: string;
		noNotes: string;
		noMatchesFor: (q: string) => string;
		trashHint: string;
		workspaceEmpty: string;
		workspaceOffline: string;
		startTyping: string;
		emptyTrashTitle: string;
		emptyTrashBody: (n: number) => string;
		cancel: string;
		emptyTrashAction: string;
		layoutGroup: string;
		layoutBy: (label: string) => string;
		layoutLabels: Record<ListLayout, string>;
		pinnedGroup: string;
		today: string;
		yesterday: string;
		last7: string;
		last30: string;
		older: string;
	}> = {
		en: {
			trash: 'Trash',
			allNotes: 'All Notes',
			notes: 'Notes',
			showFolders: 'Show folders',
			membersOnline: (n) => `${n} online`,
			noneOnline: 'No one else here',
			connecting: 'Connecting…',
			empty: 'Empty',
			sortBy: (label) => `Sort notes by ${label}`,
			sortGroup: 'Sort by',
			sortLabels: { updated: 'Date edited', created: 'Date created', title: 'Title' },
			newNote: 'New note',
			searchPlaceholder: 'Search',
			searchLabel: 'Search notes',
			clearSearch: 'Clear search',
			noMatches: 'No matches',
			trashEmpty: 'Trash is empty',
			nothingHere: 'Nothing here yet',
			noNotes: 'No notes yet',
			noMatchesFor: (q) => `Nothing here matches “${q}”.`,
			trashHint: 'Deleted notes land here so you can restore them.',
			workspaceEmpty: 'This workspace is empty. Add a note, and every member gets it.',
			workspaceOffline:
				'Nobody else is here yet. Either no member is online right now, or the passphrase does not match theirs — from this side the two look identical, because there is no server that could tell them apart. Notes you have opened before stay available offline.',
			startTyping: 'Start typing, or dictate one with your voice.',
			emptyTrashTitle: 'Empty Trash?',
			emptyTrashBody: (n) =>
				`${n} note${n === 1 ? '' : 's'} will be deleted from this device permanently. This can't be undone.`,
			cancel: 'Cancel',
			emptyTrashAction: 'Empty Trash',
			layoutGroup: 'Layout',
			layoutBy: (label) => `Note layout: ${label}`,
			layoutLabels: {
				rows: 'Rows',
				compact: 'Compact',
				grid: 'Grid',
				grouped: 'Grouped',
				board: 'Board'
			},
			pinnedGroup: 'Pinned',
			today: 'Today',
			yesterday: 'Yesterday',
			last7: 'Previous 7 days',
			last30: 'Previous 30 days',
			older: 'Older'
		},
		id: {
			trash: 'Sampah',
			allNotes: 'Semua Catatan',
			notes: 'Catatan',
			showFolders: 'Tampilkan folder',
			membersOnline: (n) => `${n} online`,
			noneOnline: 'Belum ada orang lain',
			connecting: 'Menyambung…',
			empty: 'Kosongkan',
			sortBy: (label) => `Urutkan catatan menurut ${label}`,
			sortGroup: 'Urutkan menurut',
			sortLabels: { updated: 'Tanggal disunting', created: 'Tanggal dibuat', title: 'Judul' },
			newNote: 'Catatan baru',
			searchPlaceholder: 'Cari',
			searchLabel: 'Cari catatan',
			clearSearch: 'Bersihkan pencarian',
			noMatches: 'Tidak ada yang cocok',
			trashEmpty: 'Sampah kosong',
			nothingHere: 'Belum ada apa-apa di sini',
			noNotes: 'Belum ada catatan',
			noMatchesFor: (q) => `Tidak ada yang cocok dengan “${q}”.`,
			trashHint: 'Catatan yang dihapus mendarat di sini supaya bisa Anda pulihkan.',
			workspaceEmpty:
				'Ruang kerja ini masih kosong. Tambahkan catatan, dan semua anggota akan menerimanya.',
			workspaceOffline:
				'Belum ada orang lain di sini. Entah tidak ada anggota yang sedang online, atau frasa sandinya tidak sama dengan milik mereka — dari sisi ini keduanya terlihat identik, karena tidak ada server yang bisa membedakannya. Catatan yang pernah Anda buka tetap tersedia offline.',
			startTyping: 'Mulai mengetik, atau diktekan dengan suara Anda.',
			emptyTrashTitle: 'Kosongkan Sampah?',
			emptyTrashBody: (n) =>
				`${n} catatan akan dihapus permanen dari perangkat ini. Ini tidak bisa dibatalkan.`,
			cancel: 'Batal',
			emptyTrashAction: 'Kosongkan Sampah',
			layoutGroup: 'Tata letak',
			layoutBy: (label) => `Tata letak catatan: ${label}`,
			layoutLabels: {
				rows: 'Baris',
				compact: 'Ringkas',
				grid: 'Kisi',
				grouped: 'Dikelompokkan',
				board: 'Papan'
			},
			pinnedGroup: 'Disematkan',
			today: 'Hari ini',
			yesterday: 'Kemarin',
			last7: '7 hari terakhir',
			last30: '30 hari terakhir',
			older: 'Lebih lama'
		}
	};
	const t = $derived(DICT[locale.current]);

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
	const workspaceId = $derived(
		typeof folderId === 'string' && folderId.startsWith(WORKSPACE_PREFIX)
			? folderId.slice(WORKSPACE_PREFIX.length)
			: null
	);
	const workspace = $derived(workspaceId ? workspaces.get(workspaceId) : undefined);
	const heading = $derived(
		folderId === 'trash'
			? t.trash
			: folderId === null
				? t.allNotes
				: (workspace?.name ?? notes.folders.find((f) => f.id === folderId)?.name ?? t.notes)
	);

	const layout = $derived(notes.prefs.listLayout ?? 'rows');
	const effective = $derived(effectiveLayout(layout, folderId));
	// The board is not offered where it would render one degenerate column.
	const boardAllowed = $derived(folderId === null);
	const layouts = $derived(LIST_LAYOUTS.filter((value) => value !== 'board' || boardAllowed));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hugeicons ships no icon type
	const LAYOUT_ICONS: Record<ListLayout, any> = {
		rows: ListViewIcon,
		compact: Menu02Icon,
		grid: GridViewIcon,
		grouped: Calendar03Icon,
		board: KanbanIcon
	};

	/** The one thing that differs per layout: how the single `<ul>` flows. */
	const listClass = $derived(
		effective === 'grid'
			? 'grid gap-2 px-2 pb-3 [grid-template-columns:repeat(auto-fill,minmax(11rem,1fr))]'
			: 'flex flex-col gap-0.5 px-2 pb-3'
	);

	const DAY = 24 * 60 * 60 * 1000;

	/**
	 * Bucket a note for the grouped layout.
	 *
	 * Grouping follows whatever the list is *sorted* by, so the headings can never
	 * disagree with the order underneath them: date buckets when sorting by a
	 * date, and the first letter when sorting by title. Pinned notes get their own
	 * leading group, which is exactly what the pins-first rule already produces.
	 */
	function groupOf(note: Note, midnight: number): string {
		if (note.pinnedAt !== null) return t.pinnedGroup;
		const sortBy = notes.prefs.sortBy ?? 'updated';
		if (sortBy === 'title') return (noteTitle(note, t.notes)[0] ?? '').toUpperCase();

		const at = sortBy === 'created' ? note.createdAt : note.updatedAt;
		if (at >= midnight) return t.today;
		if (at >= midnight - DAY) return t.yesterday;
		if (at >= midnight - 7 * DAY) return t.last7;
		if (at >= midnight - 30 * DAY) return t.last30;
		return t.older;
	}

	/**
	 * The list with a header row before each change of group.
	 *
	 * Built as one flat array rather than nested lists so a single `<ul>` still
	 * holds every note — which is what keeps `animate:flip` working across a
	 * layout change instead of tearing every row down and rebuilding it.
	 */
	const rendered = $derived.by(() => {
		if (effective !== 'grouped')
			return list.map((note, index) => ({ kind: 'note' as const, note, index }));
		const out: ({ kind: 'note'; note: Note; index: number } | { kind: 'header'; label: string })[] =
			[];
		// Note entries carry their own running index, so the group headers woven in
		// below never shift the index space the keyboard walks.
		let index = 0;
		// Today's boundary, computed once rather than per note. Constructed rather
		// than mutated with `setHours`, which would make it a mutable Date.
		const today = new Date();
		const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
		let current: string | null = null;
		for (const note of list) {
			const group = groupOf(note, midnight);
			if (group !== current) {
				out.push({ kind: 'header', label: group });
				current = group;
			}
			out.push({ kind: 'note', note, index: index++ });
		}
		return out;
	});

	/**
	 * Keyboard navigation of the list.
	 *
	 * A roving tabindex rather than `role="listbox"`: each row holds two focusable
	 * controls — the card and its ⋯ menu — and an `option` containing a button is
	 * not valid ARIA. So the list keeps ordinary buttons and moves focus itself.
	 *
	 * The handler lives on the `<ul>`, never on `window`. Scoping it here is what
	 * keeps arrow keys from firing while you are typing in the editor or the search
	 * box — a window handler would have to guess at that, and guess wrong.
	 */
	let listEl = $state<HTMLElement | null>(null);
	let activeIndex = $state(0);

	// The list shrinks under you — a search, a delete, switching to Trash. An index
	// past the end must fall back to the last note rather than focusing nothing.
	$effect(() => {
		if (activeIndex > list.length - 1) activeIndex = Math.max(0, list.length - 1);
	});

	function cardButtons(): HTMLElement[] {
		return listEl ? [...listEl.querySelectorAll<HTMLElement>('[data-card-button]')] : [];
	}

	function focusCard(index: number) {
		const buttons = cardButtons();
		const target = buttons[Math.max(0, Math.min(index, buttons.length - 1))];
		if (!target) return;
		activeIndex = buttons.indexOf(target);
		target.focus();
		target.scrollIntoView({ block: 'nearest' });
	}

	/** Cards per row, so ↑/↓ in the grid move by a visual row and not by one card. */
	function columns(): number {
		if (effective !== 'grid' || !listEl) return 1;
		const template = getComputedStyle(listEl).gridTemplateColumns;
		return Math.max(1, template.split(' ').filter(Boolean).length);
	}

	function onListKeydown(event: KeyboardEvent) {
		// Let the ⋯ menu, and anything else that opens over the list, have its keys.
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const step = columns();
		const last = cardButtons().length - 1;
		// Every branch below either assigns or returns, so no initial value is needed.
		let next: number;

		switch (event.key) {
			case 'ArrowDown':
				next = activeIndex + step;
				// A partial last row would otherwise trap you one row short of the end.
				if (next > last) next = last;
				break;
			case 'ArrowUp':
				next = activeIndex - step;
				if (next < 0) next = 0;
				break;
			case 'ArrowRight':
				if (effective !== 'grid') return;
				next = activeIndex + 1;
				break;
			case 'ArrowLeft':
				if (effective !== 'grid') return;
				next = activeIndex - 1;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = last;
				break;
			default:
				return;
		}

		// Enter needs no case of its own: a focused `<button>` already fires click.
		event.preventDefault();
		focusCard(next);
	}

	/**
	 * Keep `activeIndex` on whatever actually has focus.
	 *
	 * Clicking a card, tabbing in, or focusing one programmatically all land here,
	 * so arrow keys always continue from where you are rather than from where the
	 * list last thought you were.
	 */
	function onListFocusIn(event: FocusEvent) {
		const button = (event.target as HTMLElement | null)?.closest('[data-card-button]');
		if (!button) return;
		const index = cardButtons().indexOf(button as HTMLElement);
		if (index !== -1) activeIndex = index;
	}

	/** Words for a connection state; the colours and the state itself are shared. */
	/** Words come from this component's `Dict`; the state and colours are shared. */
	function connection(id: string) {
		return connectionChip(id, t);
	}

	/**
	 * ↓ from the search box walks into the list — where you were heading anyway.
	 *
	 * The board renders its own component instead of the `<ul>`, so there is no
	 * `listEl` to walk; its first card is focused directly. Without that branch
	 * this swallowed the key and did nothing at all in board layout, which is
	 * worse than leaving the default alone.
	 */
	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' || list.length === 0) return;
		if (effective === 'board') {
			const first = document.querySelector<HTMLElement>('[data-note-card] [data-card-button]');
			if (!first) return;
			event.preventDefault();
			first.focus();
			return;
		}
		event.preventDefault();
		focusCard(activeIndex);
	}
</script>

<div class="flex h-full min-h-0 flex-col glass">
	<header class="flex flex-col gap-2 px-3 pt-3 safe-t pb-2">
		<div class="flex items-center gap-1">
			{#if compact}
				<Button variant="ghost" size="icon-sm" onclick={onopenfolders} aria-label={t.showFolders}>
					<HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
				</Button>
			{/if}
			<h2 class="truncate text-sm font-semibold">{heading}</h2>
			{#if workspace}
				<!--
					Spelled out here, not just as a dot in the rail. This is the pane
					someone is looking at while wondering whether the app is broken, and
					"Connecting…" answers that where a grey dot does not.
				-->
				{@const state = connection(workspace.id)}
				<span
					data-connection={state.key}
					class="flex shrink-0 items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
				>
					<span
						class="size-1.5 shrink-0 rounded-full {state.tone} {state.pulse ? 'animate-pulse' : ''}"
						aria-hidden="true"
					></span>
					{state.text}
				</span>
			{/if}
			<span class="flex-1"></span>
			{#if isTrash}
				{#if list.length > 0}
					<Button variant="ghost" size="sm" onclick={() => (confirmEmptyTrash = true)}
						>{t.empty}</Button
					>
				{/if}
			{:else}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label={t.sortBy(t.sortLabels[notes.prefs.sortBy ?? 'updated'])}
							>
								<HugeiconsIcon icon={ArrowUpDownIcon} strokeWidth={2} />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Group>
							<DropdownMenu.Label>{t.sortGroup}</DropdownMenu.Label>
							{#each Object.keys(SORT_LABELS) as value (value)}
								<DropdownMenu.CheckboxItem
									checked={(notes.prefs.sortBy ?? 'updated') === value}
									onCheckedChange={() => notes.setPref('sortBy', value as SortBy)}
								>
									{t.sortLabels[value as SortBy]}
								</DropdownMenu.CheckboxItem>
							{/each}
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<!--
					A radio group rather than checkboxes: the layout is one choice among
					several, and `RadioItem` says so to a screen reader. (The sort menu
					above uses checkboxes, which is the weaker fit but is not worth
					changing today.)
				-->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label={t.layoutBy(t.layoutLabels[effective])}
							>
								<HugeiconsIcon icon={LAYOUT_ICONS[effective]} strokeWidth={2} />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Group>
							<DropdownMenu.Label>{t.layoutGroup}</DropdownMenu.Label>
							<DropdownMenu.RadioGroup
								value={effective}
								onValueChange={(value) => notes.setPref('listLayout', value as ListLayout)}
							>
								{#each layouts as value (value)}
									<DropdownMenu.RadioItem {value}>
										<HugeiconsIcon icon={LAYOUT_ICONS[value]} strokeWidth={2} />
										{t.layoutLabels[value]}
									</DropdownMenu.RadioItem>
								{/each}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<Button variant="ghost" size="icon-sm" onclick={oncreate} aria-label={t.newNote}>
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
				placeholder={t.searchPlaceholder}
				aria-label={t.searchLabel}
				class="h-9 pl-8"
				onkeydown={onSearchKeydown}
			/>
			{#if notes.query}
				<Button
					variant="ghost"
					size="icon-xs"
					class="absolute top-1/2 right-1.5 -translate-y-1/2"
					aria-label={t.clearSearch}
					onclick={() => (notes.query = '')}
				>
					<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
				</Button>
			{/if}
		</div>
	</header>

	{#if effective === 'board' && list.length > 0}
		<!--
			Outside the ScrollArea on purpose: the board scrolls horizontally and its
			columns scroll vertically, and the ScrollArea viewport is vertical-only
			with `overflow-x: hidden`. It gets the pane directly.
		-->
		<div class="min-h-0 flex-1">
			<NoteBoard {list} {selectedId} {onselect} />
		</div>
	{:else}
		<ScrollArea class="min-h-0 flex-1 scroll-slim">
			{#if list.length === 0}
				<div class="p-4" in:fade={{ duration: dur(200) }}>
					<Empty.Root>
						<Empty.Header>
							<Empty.Media variant="icon">
								<HugeiconsIcon
									icon={notes.query
										? Search01Icon
										: isTrash
											? Delete02Icon
											: workspace
												? UserGroupIcon
												: Note01Icon}
									strokeWidth={2}
								/>
							</Empty.Media>
							<Empty.Title>
								{#if notes.query}
									{t.noMatches}
								{:else if isTrash}
									{t.trashEmpty}
								{:else if workspace}
									{t.nothingHere}
								{:else}
									{t.noNotes}
								{/if}
							</Empty.Title>
							<Empty.Description>
								{#if notes.query}
									{t.noMatchesFor(notes.query)}
								{:else if isTrash}
									{t.trashHint}
								{:else if workspace}
									<!--
									Two genuinely different situations that look identical from here,
									and neither can be ruled out without a server: an empty
									workspace, and one whose members are all offline. Saying both is
									the only accurate option.
								-->
									<!-- Read through `connectionOf`, the same source the header chip uses:
									     testing `status` here directly made the two disagree, so the header
									     could say "Connecting…" while this text already asserted everyone
									     was offline. -->
									{#if connectionOf(workspace.id).key === 'connected'}
										{t.workspaceEmpty}
									{:else if connectionOf(workspace.id).key === 'connecting'}
										{t.connecting}
									{:else}
										{t.workspaceOffline}
									{/if}
								{:else}
									{t.startTyping}
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
									{t.newNote}
								</Button>
							</Empty.Content>
						{/if}
					</Empty.Root>
				</div>
			{:else}
				<!--
					One `<ul>` for every layout, with only its class swapped. Branching the
					container inside `{#if}` would destroy and recreate every keyed item on
					a layout change, which kills the FLIP animation that makes reordering
					readable.
				-->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<ul
					bind:this={listEl}
					class={listClass}
					onkeydown={onListKeydown}
					onfocusin={onListFocusIn}
				>
					<!--
						`animate:flip` has to sit on the only child of the keyed block, so the
						header/note branch lives inside the `<li>` rather than around it.
					-->
					{#each rendered as entry (entry.kind === 'note' ? entry.note.id : `header:${entry.label}`)}
						<li
							animate:flip={{ duration: dur(180) }}
							class={entry.kind === 'header'
								? 'col-span-full px-2.5 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'
								: ''}
						>
							{#if entry.kind === 'header'}
								{entry.label}
							{:else}
								<NoteCard
									note={entry.note}
									selected={entry.note.id === selectedId}
									layout={effective}
									{isTrash}
									{onselect}
									active={entry.index === activeIndex}
								/>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</ScrollArea>
	{/if}
</div>

<AlertDialog.Root bind:open={confirmEmptyTrash}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.emptyTrashTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.emptyTrashBody(notes.countIn('trash'))}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					notes.emptyTrash();
					confirmEmptyTrash = false;
				}}>{t.emptyTrashAction}</AlertDialog.Action
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
