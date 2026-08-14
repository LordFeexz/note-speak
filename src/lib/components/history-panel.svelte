<script lang="ts">
	import type { Change } from 'diff';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
	import BookmarkAdd01Icon from '@hugeicons/core-free-icons/BookmarkAdd01Icon';
	import ArrowTurnBackwardIcon from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Alert from '$lib/components/ui/alert';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { history, type Version } from '$lib/history/store.svelte';
	import type { Note } from '$lib/types';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		title: string;
		description: string;
		saveNow: string;
		nameVersion: string;
		saved: string;
		nothingChanged: string;
		sharedTitle: string;
		sharedBody: string;
		empty: string;
		changesSince: (label: string) => string;
		restore: string;
		rebuilding: string;
		cantRebuild: string;
		cantRebuildToast: string;
		restored: string;
		restoredBody: string;
		confirmTitle: string;
		confirmBody: string;
		cancel: string;
		justNow: string;
		minsAgo: (n: number) => string;
		hoursAgo: (n: number) => string;
	}> = {
		en: {
			title: 'Version history',
			description:
				'Versions are kept on this device. A version closes after a couple of minutes of not typing.',
			saveNow: 'Save version now',
			nameVersion: 'Name this version',
			saved: 'Version saved',
			nothingChanged: 'Nothing has changed since the last version',
			sharedTitle: 'This is your history of a shared note',
			sharedBody:
				"It records what you saw on this device. It can't show who made a change — everyone editing a shared note signs with the same link.",
			empty: 'No versions yet. One is saved automatically once you stop typing for a while.',
			changesSince: (label) => `Changes since ${label}`,
			restore: 'Restore',
			rebuilding: 'Rebuilding…',
			cantRebuild: "This version can't be rebuilt — its history is incomplete.",
			cantRebuildToast: "That version can't be rebuilt — its history is incomplete.",
			restored: 'Version restored',
			restoredBody: 'Your previous text was saved as a version.',
			confirmTitle: 'Restore this version?',
			confirmBody:
				'The note goes back to how it looked then. Nothing is lost — your current text is saved as a version first, so you can come straight back.',
			cancel: 'Cancel',
			justNow: 'just now',
			minsAgo: (n) => `${n} min ago`,
			hoursAgo: (n) => `${n} hr ago`
		},
		id: {
			title: 'Riwayat versi',
			description:
				'Versi disimpan di perangkat ini. Sebuah versi ditutup setelah beberapa menit tidak diketik.',
			saveNow: 'Simpan versi sekarang',
			nameVersion: 'Beri nama versi ini',
			saved: 'Versi disimpan',
			nothingChanged: 'Tidak ada perubahan sejak versi terakhir',
			sharedTitle: 'Ini riwayat Anda atas catatan bersama',
			sharedBody:
				'Riwayat ini mencatat apa yang Anda lihat di perangkat ini. Ia tidak bisa menunjukkan siapa yang mengubah apa — semua orang yang menyunting catatan bersama menandatangani dengan tautan yang sama.',
			empty:
				'Belum ada versi. Satu versi tersimpan otomatis begitu Anda berhenti mengetik beberapa saat.',
			changesSince: (label) => `Perubahan sejak ${label}`,
			restore: 'Pulihkan',
			rebuilding: 'Menyusun ulang…',
			cantRebuild: 'Versi ini tidak bisa disusun ulang — riwayatnya tidak lengkap.',
			cantRebuildToast: 'Versi itu tidak bisa disusun ulang — riwayatnya tidak lengkap.',
			restored: 'Versi dipulihkan',
			restoredBody: 'Teks Anda sebelumnya disimpan sebagai satu versi.',
			confirmTitle: 'Pulihkan versi ini?',
			confirmBody:
				'Catatannya kembali seperti saat itu. Tidak ada yang hilang — teks Anda sekarang disimpan sebagai versi lebih dulu, jadi Anda bisa langsung kembali.',
			cancel: 'Batal',
			justNow: 'baru saja',
			minsAgo: (n) => `${n} mnt lalu`,
			hoursAgo: (n) => `${n} jam lalu`
		}
	};
	const t = $derived(DICT[locale.current]);

	type Props = {
		open: boolean;
		note: Note | undefined;
		/** Applied as an ordinary edit, so a restore is itself undoable. */
		onrestore: (body: string) => void;
	};
	let { open = $bindable(false), note, onrestore }: Props = $props();

	let selected = $state<Version | null>(null);
	let changes = $state<Change[] | null>(null);
	let confirmRestore = $state<Version | null>(null);
	let loading = $state(false);

	$effect(() => {
		if (!open || !note) return;
		void history.load(note.id);
	});

	// Clear the diff when the panel closes so reopening never shows a stale one.
	$effect(() => {
		if (!open) {
			selected = null;
			changes = null;
		}
	});

	async function select(version: Version) {
		if (!note) return;
		selected = version;
		loading = true;
		changes = await history.diffAgainstCurrent(note.id, version.id, note.body);
		loading = false;
	}

	async function saveMark() {
		if (!note) return;
		const label = window.prompt(t.nameVersion)?.trim();
		if (label === undefined) return;
		const made = await history.commit(note.id, note.body, label || undefined);
		toast[made ? 'success' : 'info'](made ? t.saved : t.nothingChanged);
	}

	async function restore(version: Version) {
		if (!note) return;
		const body = await history.bodyAt(note.id, version.id);
		confirmRestore = null;
		if (body === null) {
			// Better to refuse than to hand back a half-applied note.
			toast.error(t.cantRebuildToast);
			return;
		}
		onrestore(body);
		open = false;
		toast.success(t.restored, { description: t.restoredBody });
	}

	function when(at: number) {
		const diff = Date.now() - at;
		const minutes = Math.round(diff / 60000);
		if (minutes < 1) return t.justNow;
		if (minutes < 60) return t.minsAgo(minutes);
		const hours = Math.round(minutes / 60);
		if (hours < 24) return t.hoursAgo(hours);
		return new Date(at).toLocaleDateString(locale.current, { month: 'short', day: 'numeric' });
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
		<Sheet.Header class="border-b px-4 py-3 safe-t">
			<Sheet.Title class="flex items-center gap-2 text-base">
				<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} class="size-4" />
				{t.title}
			</Sheet.Title>
			<Sheet.Description class="text-xs">{t.description}</Sheet.Description>
		</Sheet.Header>

		<div class="flex min-h-0 flex-1 scroll-slim flex-col gap-3 overflow-y-auto p-4">
			<Button variant="secondary" size="sm" class="self-start" onclick={saveMark}>
				<HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} data-icon="inline-start" />
				{t.saveNow}
			</Button>

			{#if note?.share}
				<!--
					Said plainly rather than implied: every editor of a shared note signs
					with the same key, so there is no authorship to attribute.
				-->
				<Alert.Root>
					<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
					<Alert.Title>{t.sharedTitle}</Alert.Title>
					<Alert.Description>{t.sharedBody}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if history.versions.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
			{:else}
				<ul class="flex flex-col gap-1">
					{#each history.versions as version (version.id)}
						<li>
							<button
								type="button"
								class="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/60 {selected?.id ===
								version.id
									? 'bg-note-accent/15'
									: ''}"
								onclick={() => select(version)}
							>
								<span class="text-sm font-medium">
									{version.label ?? when(version.at)}
								</span>
								<span class="text-xs text-muted-foreground tabular-nums">
									{version.label ? `${when(version.at)} · ` : ''}{new Date(
										version.at
									).toLocaleTimeString(locale.current, { hour: 'numeric', minute: '2-digit' })}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if selected}
				<div class="overflow-hidden glass-panel">
					<div class="flex items-center gap-2 border-b border-[var(--glass-border)] px-3 py-2">
						<p class="flex-1 text-xs text-muted-foreground">
							{t.changesSince(selected.label ?? when(selected.at))}
						</p>
						<Button variant="secondary" size="xs" onclick={() => (confirmRestore = selected)}>
							<HugeiconsIcon
								icon={ArrowTurnBackwardIcon}
								strokeWidth={2}
								data-icon="inline-start"
							/>
							{t.restore}
						</Button>
					</div>

					{#if loading}
						<p class="px-3 py-6 text-center text-xs text-muted-foreground">{t.rebuilding}</p>
					{:else if changes === null}
						<p class="px-3 py-6 text-center text-xs text-muted-foreground">{t.cantRebuild}</p>
					{:else}
						<!-- Colour is doubled with +/− prefixes, so the diff is readable
						     without relying on colour alone. -->
						<pre class="overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed"><code
								>{#each changes as change, i (i)}{#if change.added}<span
											class="block bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
											>{change.value
												.replace(/\n$/, '')
												.split('\n')
												.map((l) => `+ ${l}`)
												.join('\n')}</span
										>{:else if change.removed}<span
											class="block bg-red-500/15 text-red-800 dark:text-red-300"
											>{change.value
												.replace(/\n$/, '')
												.split('\n')
												.map((l) => `- ${l}`)
												.join('\n')}</span
										>{:else}<span class="block text-muted-foreground"
											>{change.value
												.replace(/\n$/, '')
												.split('\n')
												.map((l) => `  ${l}`)
												.join('\n')}</span
										>{/if}{/each}</code
							></pre>
					{/if}
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>

<AlertDialog.Root open={!!confirmRestore} onOpenChange={(o) => !o && (confirmRestore = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.confirmTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.confirmBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={() => confirmRestore && restore(confirmRestore)}>
				{t.restore}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
