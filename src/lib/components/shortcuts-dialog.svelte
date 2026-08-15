<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
	const mod = isMac ? '⌘' : 'Ctrl';

	const DICT: Dict<{
		title: string;
		description: string;
		newNote: string;
		search: string;
		dictate: string;
		escape: string;
		walkList: string;
		openNote: string;
		listEnds: string;
		palette: string;
	}> = {
		en: {
			title: 'Keyboard shortcuts',
			description: 'Everything runs on this device — nothing is uploaded.',
			newNote: 'New note',
			search: 'Search notes',
			dictate: 'Start / stop dictation',
			escape: 'Stop dictation, or clear search',
			walkList: 'Move through the note list',
			openNote: 'Open the highlighted note',
			listEnds: 'Jump to the first / last note',
			palette: 'Command palette'
		},
		id: {
			title: 'Pintasan papan ketik',
			description: 'Semuanya berjalan di perangkat ini — tidak ada yang diunggah.',
			newNote: 'Catatan baru',
			search: 'Cari catatan',
			dictate: 'Mulai / hentikan dikte',
			escape: 'Hentikan dikte, atau bersihkan pencarian',
			walkList: 'Berpindah di daftar catatan',
			openNote: 'Buka catatan yang disorot',
			listEnds: 'Lompat ke catatan pertama / terakhir',
			palette: 'Palet perintah'
		}
	};
	const t = $derived(DICT[locale.current]);

	const shortcuts = $derived([
		{ keys: [mod, 'K'], label: t.palette },
		{ keys: [mod, 'N'], label: t.newNote },
		{ keys: [mod, 'F'], label: t.search },
		{ keys: [mod, '⇧', 'D'], label: t.dictate },
		{ keys: ['↑', '↓'], label: t.walkList },
		{ keys: ['↵'], label: t.openNote },
		{ keys: ['Home', 'End'], label: t.listEnds },
		{ keys: ['Esc'], label: t.escape }
	]);
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{t.title}</Dialog.Title>
			<Dialog.Description>{t.description}</Dialog.Description>
		</Dialog.Header>
		<dl class="flex flex-col gap-3 text-sm">
			{#each shortcuts as shortcut (shortcut.label)}
				<div class="flex items-center justify-between gap-4">
					<dt class="text-muted-foreground">{shortcut.label}</dt>
					<dd class="flex items-center gap-1">
						{#each shortcut.keys as key (key)}
							<kbd
								class="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-sans text-xs text-foreground"
								>{key}</kbd
							>
						{/each}
					</dd>
				</div>
			{/each}
		</dl>
	</Dialog.Content>
</Dialog.Root>
