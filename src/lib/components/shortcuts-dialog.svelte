<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
	const mod = isMac ? '⌘' : 'Ctrl';

	const shortcuts = [
		{ keys: [mod, 'N'], label: 'New note' },
		{ keys: [mod, 'F'], label: 'Search notes' },
		{ keys: [mod, '⇧', 'D'], label: 'Start / stop dictation' },
		{ keys: ['Esc'], label: 'Stop dictation, or clear search' }
	];
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Keyboard shortcuts</Dialog.Title>
			<Dialog.Description>Everything runs on this device — nothing is uploaded.</Dialog.Description>
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
