<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
	import Upload04Icon from '@hugeicons/core-free-icons/Upload04Icon';
	import FileZipIcon from '@hugeicons/core-free-icons/FileZipIcon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { notes } from '$lib/stores/notes.svelte';
	import {
		exportAllZip,
		exportJson,
		ImportError,
		mergeBackup,
		parseBackup,
		replaceWithBackup,
		type Backup
	} from '$lib/data/transfer';

	type Props = { open: boolean };
	let { open = $bindable(false) }: Props = $props();

	let fileRef = $state<HTMLInputElement | null>(null);
	let pending = $state<Backup | null>(null);

	const activeCount = $derived(notes.activeNotes.length);

	function snapshot() {
		// $state.snapshot strips proxies so the data can be structured-cloned/serialised.
		return {
			notes: $state.snapshot(notes.notes),
			folders: $state.snapshot(notes.folders)
		};
	}

	async function onFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		// Reset immediately so picking the same file twice still fires a change event.
		event.currentTarget.value = '';
		if (!file) return;
		try {
			pending = parseBackup(await file.text());
		} catch (error) {
			toast.error(error instanceof ImportError ? error.message : 'That file could not be read.');
		}
	}

	function finish(result: ReturnType<typeof mergeBackup>) {
		if (!notes.applyImport(result.notes, result.folders)) {
			toast.error('Still loading your notes — try again in a moment.');
			return;
		}
		const { added, updated, skipped } = result.summary;
		toast.success(`Imported ${added} note${added === 1 ? '' : 's'}`, {
			description: [
				updated ? `${updated} updated` : null,
				skipped ? `${skipped} already newer here` : null
			]
				.filter(Boolean)
				.join(' · ')
		});
		pending = null;
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Backup & restore</Dialog.Title>
			<Dialog.Description>
				Your notes live only in this browser. Export a copy so clearing site data can't take them
				with it.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-2">
			<Button
				variant="secondary"
				class="justify-start"
				onclick={() => exportJson(notes.notes, notes.folders)}
			>
				<HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">Export backup (.json)</span>
				<span class="text-xs text-muted-foreground tabular-nums">{notes.notes.length}</span>
			</Button>
			<p class="px-1 text-xs text-muted-foreground">
				Everything, including folders and trashed notes. This is the file to import later.
			</p>

			<Button
				variant="secondary"
				class="mt-2 justify-start"
				onclick={() => exportAllZip(notes.notes, notes.folders)}
			>
				<HugeiconsIcon icon={FileZipIcon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">Export notes (.zip)</span>
				<span class="text-xs text-muted-foreground tabular-nums">{activeCount}</span>
			</Button>
			<p class="px-1 text-xs text-muted-foreground">
				One Markdown file per note, arranged in folders — readable in any editor.
			</p>

			<Separator class="my-2" />

			<Button variant="secondary" class="justify-start" onclick={() => fileRef?.click()}>
				<HugeiconsIcon icon={Upload04Icon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">Import a backup…</span>
			</Button>
			<input
				bind:this={fileRef}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={onFile}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root open={!!pending} onOpenChange={(o) => !o && (pending = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Import {pending?.notes.length ?? 0} notes?</AlertDialog.Title>
			<AlertDialog.Description>
				This backup was made on {pending ? new Date(pending.exportedAt).toLocaleDateString() : ''}.
				Choose how it should meet the {notes.notes.length} note{notes.notes.length === 1 ? '' : 's'}
				already here.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<Alert.Root>
			<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
			<Alert.Title>Merge keeps whichever copy is newer</Alert.Title>
			<Alert.Description>
				Replace deletes everything here first, including anything not in the backup.
			</Alert.Description>
		</Alert.Root>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<Button variant="destructive" onclick={() => pending && finish(replaceWithBackup(pending))}>
				Replace all
			</Button>
			<AlertDialog.Action onclick={() => pending && finish(mergeBackup(snapshot(), pending))}>
				Merge
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
