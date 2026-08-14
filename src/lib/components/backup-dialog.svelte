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
		type Backup,
		type ImportErrorCode
	} from '$lib/data/transfer';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	type Props = { open: boolean };
	let { open = $bindable(false) }: Props = $props();

	const DICT: Dict<{
		title: string;
		description: string;
		exportJson: string;
		exportJsonHint: string;
		exportZip: string;
		exportZipHint: string;
		importAction: string;
		confirmTitle: (n: number) => string;
		confirmBody: (date: string, existing: number) => string;
		mergeTitle: string;
		mergeBody: string;
		cancel: string;
		replaceAll: string;
		merge: string;
		imported: (n: number) => string;
		updatedCount: (n: number) => string;
		skippedCount: (n: number) => string;
		notLoaded: string;
		unreadable: string;
		errors: Record<ImportErrorCode, string>;
	}> = {
		en: {
			title: 'Backup & restore',
			description:
				"Your notes live only in this browser. Export a copy so clearing site data can't take them with it.",
			exportJson: 'Export backup (.json)',
			exportJsonHint:
				'Everything, including folders and trashed notes. This is the file to import later.',
			exportZip: 'Export notes (.zip)',
			exportZipHint: 'One Markdown file per note, arranged in folders — readable in any editor.',
			importAction: 'Import a backup…',
			confirmTitle: (n) => `Import ${n} notes?`,
			confirmBody: (date, existing) =>
				`This backup was made on ${date}. Choose how it should meet the ${existing} note${existing === 1 ? '' : 's'} already here.`,
			mergeTitle: 'Merge keeps whichever copy is newer',
			mergeBody: 'Replace deletes everything here first, including anything not in the backup.',
			cancel: 'Cancel',
			replaceAll: 'Replace all',
			merge: 'Merge',
			imported: (n) => `Imported ${n} note${n === 1 ? '' : 's'}`,
			updatedCount: (n) => `${n} updated`,
			skippedCount: (n) => `${n} already newer here`,
			notLoaded: 'Still loading your notes — try again in a moment.',
			unreadable: 'That file could not be read.',
			errors: {
				'not-json': "That file isn't valid JSON.",
				'not-backup': "That file isn't a Note Speak backup.",
				'no-notes': 'That backup has no notes in it.',
				'newer-version': 'That backup came from a newer version of Note Speak.'
			}
		},
		id: {
			title: 'Cadangkan & pulihkan',
			description:
				'Catatan Anda hanya ada di browser ini. Ekspor salinannya agar tidak ikut hilang saat data situs dibersihkan.',
			exportJson: 'Ekspor cadangan (.json)',
			exportJsonHint:
				'Semuanya, termasuk folder dan catatan di Sampah. File inilah yang nanti diimpor.',
			exportZip: 'Ekspor catatan (.zip)',
			exportZipHint:
				'Satu file Markdown per catatan, tertata dalam folder — bisa dibaca di editor mana pun.',
			importAction: 'Impor cadangan…',
			confirmTitle: (n) => `Impor ${n} catatan?`,
			confirmBody: (date, existing) =>
				`Cadangan ini dibuat pada ${date}. Pilih bagaimana ia digabungkan dengan ${existing} catatan yang sudah ada di sini.`,
			mergeTitle: 'Gabungkan menyimpan salinan yang lebih baru',
			mergeBody:
				'Ganti akan menghapus semua yang ada di sini lebih dulu, termasuk yang tidak ada di cadangan.',
			cancel: 'Batal',
			replaceAll: 'Ganti semua',
			merge: 'Gabungkan',
			imported: (n) => `${n} catatan diimpor`,
			updatedCount: (n) => `${n} diperbarui`,
			skippedCount: (n) => `${n} sudah lebih baru di sini`,
			notLoaded: 'Catatan Anda masih dimuat — coba lagi sebentar.',
			unreadable: 'File itu tidak bisa dibaca.',
			errors: {
				'not-json': 'File itu bukan JSON yang valid.',
				'not-backup': 'File itu bukan cadangan Note Speak.',
				'no-notes': 'Cadangan itu tidak berisi catatan.',
				'newer-version': 'Cadangan itu berasal dari Note Speak versi yang lebih baru.'
			}
		}
	};
	const t = $derived(DICT[locale.current]);

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
			toast.error(error instanceof ImportError ? t.errors[error.code] : t.unreadable);
		}
	}

	function finish(result: ReturnType<typeof mergeBackup>) {
		if (!notes.applyImport(result.notes, result.folders)) {
			toast.error(t.notLoaded);
			return;
		}
		const { added, updated, skipped } = result.summary;
		toast.success(t.imported(added), {
			description: [
				updated ? t.updatedCount(updated) : null,
				skipped ? t.skippedCount(skipped) : null
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
			<Dialog.Title>{t.title}</Dialog.Title>
			<Dialog.Description>{t.description}</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-2">
			<Button
				variant="secondary"
				class="justify-start"
				onclick={() => exportJson(notes.notes, notes.folders)}
			>
				<HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">{t.exportJson}</span>
				<span class="text-xs text-muted-foreground tabular-nums">{notes.notes.length}</span>
			</Button>
			<p class="px-1 text-xs text-muted-foreground">{t.exportJsonHint}</p>

			<Button
				variant="secondary"
				class="mt-2 justify-start"
				onclick={() => exportAllZip(notes.notes, notes.folders)}
			>
				<HugeiconsIcon icon={FileZipIcon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">{t.exportZip}</span>
				<span class="text-xs text-muted-foreground tabular-nums">{activeCount}</span>
			</Button>
			<p class="px-1 text-xs text-muted-foreground">{t.exportZipHint}</p>

			<Separator class="my-2" />

			<Button variant="secondary" class="justify-start" onclick={() => fileRef?.click()}>
				<HugeiconsIcon icon={Upload04Icon} strokeWidth={2} data-icon="inline-start" />
				<span class="flex-1 text-left">{t.importAction}</span>
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
			<AlertDialog.Title>{t.confirmTitle(pending?.notes.length ?? 0)}</AlertDialog.Title>
			<AlertDialog.Description>
				{t.confirmBody(
					pending ? new Date(pending.exportedAt).toLocaleDateString(locale.current) : '',
					notes.notes.length
				)}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<Alert.Root>
			<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
			<Alert.Title>{t.mergeTitle}</Alert.Title>
			<Alert.Description>{t.mergeBody}</Alert.Description>
		</Alert.Root>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<Button variant="destructive" onclick={() => pending && finish(replaceWithBackup(pending))}>
				{t.replaceAll}
			</Button>
			<AlertDialog.Action onclick={() => pending && finish(mergeBackup(snapshot(), pending))}>
				{t.merge}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
