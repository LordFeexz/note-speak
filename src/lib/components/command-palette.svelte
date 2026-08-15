<script lang="ts">
	import { Command } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import BackupDialog from '$lib/components/backup-dialog.svelte';
	import { notes } from '$lib/stores/notes.svelte';
	import { noteTitle } from '$lib/types';
	import { buildCommands, groupLabel, noteKeywords, type CommandContext } from '$lib/commands';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	/**
	 * ⌘K: one place to reach everything.
	 *
	 * The app had grown a set of actions with no single home — two unlabelled icon
	 * buttons in the list header, a rail footer, and a shortcut nobody was told
	 * about. This does not replace any of them; it makes them findable by typing
	 * what you want.
	 *
	 * Filtering is split, because commands and notes are matched on different
	 * things. Commands go through `Command`'s own matcher, which ranks a label and
	 * its keywords exactly the way every other palette does. Notes cannot: their
	 * text lives in the store behind a cache, and a note's item value is its id,
	 * which would never match what you typed. So note rows are `forceMount`ed past
	 * the built-in filter and chosen by `notes.searchNotes` instead.
	 *
	 * The query itself comes from `onStateChange` rather than a binding on the
	 * input, because the search string is root state — the input is one view of it.
	 */
	type Props = {
		open: boolean;
		context: CommandContext;
	};
	let { open = $bindable(false), context }: Props = $props();

	const DICT: Dict<{
		placeholder: string;
		empty: string;
		label: string;
		notes: string;
		newFolderTitle: string;
		newFolderBody: string;
		folderName: string;
		create: string;
		cancel: string;
	}> = {
		en: {
			placeholder: 'Search commands and notes…',
			empty: 'Nothing matches that.',
			label: 'Command palette',
			notes: 'Notes',
			newFolderTitle: 'New folder',
			newFolderBody: 'Folders live on this device, like everything else.',
			folderName: 'Folder name',
			create: 'Create',
			cancel: 'Cancel'
		},
		id: {
			placeholder: 'Cari perintah dan catatan…',
			empty: 'Tidak ada yang cocok.',
			label: 'Palet perintah',
			notes: 'Catatan',
			newFolderTitle: 'Folder baru',
			newFolderBody: 'Folder tersimpan di perangkat ini, seperti yang lain.',
			folderName: 'Nama folder',
			create: 'Buat',
			cancel: 'Batal'
		}
	};
	const t = $derived(DICT[locale.current]);

	let search = $state('');
	let backupOpen = $state(false);
	let newFolderOpen = $state(false);
	let newFolderName = $state('');

	/**
	 * The palette owns its own Backup and New-folder dialogs.
	 *
	 * Both already exist inside `folder-rail.svelte`, held in that component's
	 * private state. Hoisting them up to the page so two callers could share one
	 * instance would touch three components to save a few lines; two independent
	 * instances of a dialog cost nothing, because only one can be open at a time.
	 */
	const ctx = $derived<CommandContext>({
		...context,
		openBackup: () => (backupOpen = true),
		openNewFolder: () => {
			newFolderName = '';
			newFolderOpen = true;
		}
	});

	const commands = $derived(buildCommands(ctx));

	// Notes are searched by the store, which matches body text as well as titles
	// and keeps its own per-note cache. Only shown once you have typed something:
	// an empty palette listing eight arbitrary notes is noise.
	const noteMatches = $derived(search.trim() ? notes.searchNotes(search) : []);

	// Every group is rendered; `Command` hides the ones whose items all filter out.
	const groups = $derived(
		(['create', 'view', 'go', 'app'] as const)
			.map((group) => ({ group, items: commands.filter((command) => command.group === group) }))
			.filter((entry) => entry.items.length > 0)
	);

	function run(action: () => void) {
		open = false;
		search = '';
		// After the dialog's own close handling, so focus restoration does not fight
		// a command that moves focus itself — creating a note focuses the editor.
		queueMicrotask(action);
	}

	function submitNewFolder() {
		const name = newFolderName.trim();
		newFolderOpen = false;
		if (!name) return;
		const folder = notes.createFolder(name);
		context.selectFolder(folder.id);
	}

	// Reopening should not resume someone else's half-typed query.
	$effect(() => {
		if (!open) search = '';
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
		<Dialog.Header class="sr-only">
			<Dialog.Title>{t.label}</Dialog.Title>
			<Dialog.Description>{t.placeholder}</Dialog.Description>
		</Dialog.Header>

		<Command.Root
			loop
			label={t.label}
			onStateChange={(state) => (search = state.search)}
			class="flex max-h-[60vh] flex-col"
		>
			<div class="relative border-b">
				<HugeiconsIcon
					icon={Search01Icon}
					strokeWidth={2}
					class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Command.Input
					placeholder={t.placeholder}
					class="h-12 w-full bg-transparent pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground"
				/>
			</div>

			<Command.List class="min-h-0 flex-1 scroll-slim overflow-y-auto overscroll-contain p-1.5">
				<!--
					Only when the notes are empty too. `Command.Empty` counts what its own
					filter kept, and the note rows deliberately bypass that filter — so a
					query matching a note but no command would otherwise show the results
					and "nothing matches" at the same time.
				-->
				{#if noteMatches.length === 0}
					<Command.Empty class="px-3 py-8 text-center text-sm text-muted-foreground">
						{t.empty}
					</Command.Empty>
				{/if}

				{#each groups as entry (entry.group)}
					<Command.Group value={entry.group}>
						<Command.GroupHeading
							class="px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
						>
							{groupLabel(entry.group)}
						</Command.GroupHeading>
						<Command.GroupItems>
							{#each entry.items as command (command.id)}
								<Command.Item
									value={command.id}
									keywords={[command.label, ...command.keywords]}
									onSelect={() => run(command.run)}
									class="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm data-selected:bg-note-accent data-selected:text-note-accent-foreground"
								>
									<HugeiconsIcon icon={command.icon} strokeWidth={2} class="size-4 shrink-0" />
									<span class="flex-1 truncate">{command.label}</span>
									{#if command.hint}
										<span class="shrink-0 text-xs opacity-70">{command.hint}</span>
									{/if}
								</Command.Item>
							{/each}
						</Command.GroupItems>
					</Command.Group>
				{/each}

				{#if noteMatches.length > 0}
					<!--
						`forceMount` on both: these rows are already the answer to the query,
						chosen by the store. Left to the built-in filter they would be scored
						against their own note ids and vanish.
					-->
					<Command.Group value="notes" forceMount>
						<Command.GroupHeading
							class="px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
						>
							{t.notes}
						</Command.GroupHeading>
						<Command.GroupItems>
							{#each noteMatches as note (note.id)}
								<Command.Item
									value="note:{note.id}"
									keywords={[noteTitle(note), ...noteKeywords()]}
									forceMount
									onSelect={() => run(() => context.selectNote(note.id))}
									class="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm data-selected:bg-note-accent data-selected:text-note-accent-foreground"
								>
									<HugeiconsIcon icon={Note01Icon} strokeWidth={2} class="size-4 shrink-0" />
									<span class="flex-1 truncate">{noteTitle(note)}</span>
								</Command.Item>
							{/each}
						</Command.GroupItems>
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Dialog.Content>
</Dialog.Root>

<BackupDialog bind:open={backupOpen} />

<AlertDialog.Root bind:open={newFolderOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.newFolderTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.newFolderBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<Input
			bind:value={newFolderName}
			aria-label={t.folderName}
			placeholder={t.folderName}
			onkeydown={(event) => event.key === 'Enter' && submitNewFolder()}
		/>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitNewFolder}>{t.create}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
