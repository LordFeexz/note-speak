<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
	import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
	import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { notes } from '$lib/stores/notes.svelte';
	import { buildShareUrl, createShare } from '$lib/share/crypto';
	import { signalingUrl } from '$lib/share/session';
	import type { Note } from '$lib/types';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		title: string;
		descOn: string;
		descOff: string;
		needsOnlineTitle: string;
		needsOnlineBody: string;
		start: string;
		starting: string;
		canEdit: string;
		canEditHint: string;
		viewOnly: string;
		viewOnlyHint: string;
		linkField: (label: string) => string;
		copyField: (label: string) => string;
		passwordTitle: string;
		passwordBody: string;
		reissue: string;
		stop: string;
		sharingOn: string;
		sharingOnBody: string;
		reissued: string;
		reissuedBody: string;
		stopped: string;
		copied: (label: string) => string;
		copyFailed: string;
		confirmReissueTitle: string;
		confirmReissueBody: string;
		confirmStopTitle: string;
		confirmStopBody: string;
		cancel: string;
		reissueAction: string;
		signalErrorTitle: string;
		signalErrorBody: string;
	}> = {
		en: {
			title: 'Share this note',
			descOn:
				'Anyone holding a link can open it. Edits sync live between everyone who has it open.',
			descOff:
				'Create a link others can open. The note syncs directly between your devices — it is never stored on a server.',
			needsOnlineTitle: 'Shared notes need someone online',
			needsOnlineBody:
				"There's no server copy, so a collaborator sees the note when you — or anyone who has already opened it — is online.",
			start: 'Start sharing',
			starting: 'Creating links…',
			canEdit: 'Can edit',
			canEditHint: 'Anyone with this link can change the note.',
			viewOnly: 'View only',
			viewOnlyHint: "Opens read-only. Edits from this link are rejected by everyone else's device.",
			linkField: (label) => `${label} link`,
			copyField: (label) => `Copy ${label} link`,
			passwordTitle: 'The link is the password',
			passwordBody:
				"Anyone you send it to can pass it on, and there's no way to revoke one person. Reissue the links to cut everyone off at once.",
			reissue: 'Reissue links',
			stop: 'Stop sharing',
			sharingOn: 'Sharing on',
			sharingOnBody: 'Anyone with the link can now open this note.',
			reissued: 'New links issued',
			reissuedBody: 'The old links no longer work.',
			stopped: 'Sharing stopped',
			copied: (label) => `${label} link copied`,
			copyFailed: 'Could not copy — select the link and copy it manually.',
			confirmReissueTitle: 'Reissue both links?',
			confirmReissueBody:
				"Everyone currently using a link loses access, including people you still want. You'll need to send the new links out again.",
			confirmStopTitle: 'Stop sharing this note?',
			confirmStopBody:
				"The links stop working and you keep your copy. Anyone who already opened the note keeps the copy on their own device — that can't be taken back.",
			cancel: 'Cancel',
			reissueAction: 'Reissue',
			signalErrorTitle: 'Signaling server unreachable',
			signalErrorBody: 'Sharing links will not work until the WebSocket server is running. If you are on a VPS, ensure your reverse proxy supports WebSocket upgrades.'
		},
		id: {
			title: 'Bagikan catatan ini',
			descOn:
				'Siapa pun yang punya tautannya bisa membukanya. Suntingan tersinkron langsung di antara semua yang membukanya.',
			descOff:
				'Buat tautan yang bisa dibuka orang lain. Catatannya tersinkron langsung antar perangkat — tidak pernah disimpan di server.',
			needsOnlineTitle: 'Catatan bersama perlu ada yang online',
			needsOnlineBody:
				'Tidak ada salinan di server, jadi kolaborator baru melihat catatannya saat Anda — atau siapa pun yang pernah membukanya — sedang online.',
			start: 'Mulai berbagi',
			starting: 'Membuat tautan…',
			canEdit: 'Bisa menyunting',
			canEditHint: 'Siapa pun yang punya tautan ini bisa mengubah catatannya.',
			viewOnly: 'Hanya baca',
			viewOnlyHint:
				'Terbuka hanya untuk dibaca. Suntingan dari tautan ini ditolak oleh perangkat semua orang lain.',
			linkField: (label) => `Tautan ${label}`,
			copyField: (label) => `Salin tautan ${label}`,
			passwordTitle: 'Tautannya adalah kata sandinya',
			passwordBody:
				'Siapa pun yang Anda kirimi bisa meneruskannya, dan tidak ada cara mencabut akses satu orang saja. Terbitkan ulang tautannya untuk memutus akses semua orang sekaligus.',
			reissue: 'Terbitkan ulang tautan',
			stop: 'Berhenti berbagi',
			sharingOn: 'Berbagi aktif',
			sharingOnBody: 'Siapa pun yang punya tautannya kini bisa membuka catatan ini.',
			reissued: 'Tautan baru diterbitkan',
			reissuedBody: 'Tautan yang lama tidak berlaku lagi.',
			stopped: 'Berbagi dihentikan',
			copied: (label) => `Tautan ${label} disalin`,
			copyFailed: 'Tidak bisa menyalin — pilih tautannya lalu salin secara manual.',
			confirmReissueTitle: 'Terbitkan ulang kedua tautan?',
			confirmReissueBody:
				'Semua yang sedang memakai tautan lama kehilangan akses, termasuk orang yang masih Anda inginkan. Anda perlu mengirim tautan barunya lagi.',
			confirmStopTitle: 'Berhenti membagikan catatan ini?',
			confirmStopBody:
				'Tautannya berhenti bekerja dan salinan Anda tetap ada. Siapa pun yang sudah membuka catatannya tetap menyimpan salinan di perangkat mereka sendiri — itu tidak bisa ditarik kembali.',
			cancel: 'Batal',
			reissueAction: 'Terbitkan ulang',
			signalErrorTitle: 'Server sinyal tidak dapat dihubungi',
			signalErrorBody: 'Tautan berbagi tidak akan berfungsi sampai server WebSocket berjalan. Jika Anda menggunakan VPS, pastikan reverse proxy Anda mendukung WebSocket upgrade.'
		}
	};
	const t = $derived(DICT[locale.current]);

	type Props = { open: boolean; note: Note | undefined };
	let { open = $bindable(false), note }: Props = $props();

	let busy = $state(false);
	let confirmRotate = $state(false);
	let confirmStop = $state(false);

	const share = $derived(note?.share ?? null);
	const origin = $derived(typeof location === 'undefined' ? '' : location.origin);
	const editUrl = $derived(share ? buildShareUrl(origin, share, true) : '');
	const viewUrl = $derived(share ? buildShareUrl(origin, share, false) : '');

	let wsHealthy = $state<boolean | null>(null);

	$effect(() => {
		if (!open || share) return;
		wsHealthy = null;
		const ws = new WebSocket(signalingUrl());
		const timeout = setTimeout(() => { ws.close(); wsHealthy = false; }, 5000);
		ws.onopen = () => { clearTimeout(timeout); wsHealthy = true; ws.close(); };
		ws.onerror = () => { clearTimeout(timeout); wsHealthy = false; };
		return () => { clearTimeout(timeout); ws.close(); };
	});

	async function startSharing() {
		if (!note || busy) return;
		busy = true;
		try {
			notes.setShare(note.id, await createShare('link'));
			toast.success(t.sharingOn, { description: t.sharingOnBody });
		} finally {
			busy = false;
		}
	}

	async function rotate() {
		if (!note) return;
		notes.setShare(note.id, await createShare(share?.mode ?? 'link'));
		confirmRotate = false;
		toast(t.reissued, { description: t.reissuedBody });
	}

	function stopSharing() {
		if (!note) return;
		notes.setShare(note.id, null);
		confirmStop = false;
		open = false;
		toast(t.stopped);
	}

	async function copy(url: string, label: string) {
		try {
			await navigator.clipboard.writeText(url);
			toast.success(t.copied(label));
		} catch {
			toast.error(t.copyFailed);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{t.title}</Dialog.Title>
			<Dialog.Description>{share ? t.descOn : t.descOff}</Dialog.Description>
		</Dialog.Header>

		{#if !share}
			<Alert.Root>
				<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
				<Alert.Title>{t.needsOnlineTitle}</Alert.Title>
				<Alert.Description>{t.needsOnlineBody}</Alert.Description>
			</Alert.Root>
			{#if wsHealthy === false}
				<Alert.Root variant="destructive">
					<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
					<Alert.Title>{t.signalErrorTitle}</Alert.Title>
					<Alert.Description>{t.signalErrorBody}</Alert.Description>
				</Alert.Root>
			{/if}
			<Button onclick={startSharing} disabled={busy}>
				<HugeiconsIcon icon={Share08Icon} strokeWidth={2} data-icon="inline-start" />
				{busy ? t.starting : t.start}
			</Button>
		{:else}
			<div class="flex flex-col gap-3">
				{#each [{ url: editUrl, label: t.canEdit, hint: t.canEditHint }, { url: viewUrl, label: t.viewOnly, hint: t.viewOnlyHint }] as row (row.label)}
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<span class="w-20 shrink-0 text-xs font-medium">{row.label}</span>
							<input
								readonly
								value={row.url}
								aria-label={t.linkField(row.label)}
								class="min-w-0 flex-1 rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs"
								onfocus={(e) => e.currentTarget.select()}
							/>
							<Button
								variant="secondary"
								size="icon-sm"
								aria-label={t.copyField(row.label)}
								onclick={() => copy(row.url, row.label)}
							>
								<HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
							</Button>
						</div>
						<p class="pl-22 text-xs text-muted-foreground">{row.hint}</p>
					</div>
				{/each}
			</div>

			<Alert.Root>
				<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
				<Alert.Title>{t.passwordTitle}</Alert.Title>
				<Alert.Description>{t.passwordBody}</Alert.Description>
			</Alert.Root>

			<Separator />
			<div class="flex flex-wrap gap-2">
				<Button variant="secondary" size="sm" onclick={() => (confirmRotate = true)}>
					<HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
					{t.reissue}
				</Button>
				<Button variant="ghost" size="sm" onclick={() => (confirmStop = true)}>{t.stop}</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={confirmRotate}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.confirmReissueTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.confirmReissueBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={rotate}>{t.reissueAction}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmStop}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t.confirmStopTitle}</AlertDialog.Title>
			<AlertDialog.Description>{t.confirmStopBody}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={stopSharing}>{t.stop}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
