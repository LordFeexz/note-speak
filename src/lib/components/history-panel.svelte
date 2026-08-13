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
		const label = window.prompt('Name this version')?.trim();
		if (label === undefined) return;
		const made = await history.commit(note.id, note.body, label || undefined);
		toast[made ? 'success' : 'info'](
			made ? 'Version saved' : 'Nothing has changed since the last version'
		);
	}

	async function restore(version: Version) {
		if (!note) return;
		const body = await history.bodyAt(note.id, version.id);
		confirmRestore = null;
		if (body === null) {
			// Better to refuse than to hand back a half-applied note.
			toast.error("That version can't be rebuilt — its history is incomplete.");
			return;
		}
		onrestore(body);
		open = false;
		toast.success('Version restored', {
			description: 'Your previous text was saved as a version.'
		});
	}

	function when(at: number) {
		const diff = Date.now() - at;
		const minutes = Math.round(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} hr ago`;
		return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
		<Sheet.Header class="border-b px-4 py-3 safe-t">
			<Sheet.Title class="flex items-center gap-2 text-base">
				<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} class="size-4" />
				Version history
			</Sheet.Title>
			<Sheet.Description class="text-xs">
				Versions are kept on this device. A version closes after a couple of minutes of not typing.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex min-h-0 flex-1 scroll-slim flex-col gap-3 overflow-y-auto p-4">
			<Button variant="secondary" size="sm" class="self-start" onclick={saveMark}>
				<HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} data-icon="inline-start" />
				Save version now
			</Button>

			{#if note?.share}
				<!--
					Said plainly rather than implied: every editor of a shared note signs
					with the same key, so there is no authorship to attribute.
				-->
				<Alert.Root>
					<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
					<Alert.Title>This is your history of a shared note</Alert.Title>
					<Alert.Description>
						It records what you saw on this device. It can't show who made a change — everyone
						editing a shared note signs with the same link.
					</Alert.Description>
				</Alert.Root>
			{/if}

			{#if history.versions.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No versions yet. One is saved automatically once you stop typing for a while.
				</p>
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
									).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
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
							Changes since {selected.label ?? when(selected.at)}
						</p>
						<Button variant="secondary" size="xs" onclick={() => (confirmRestore = selected)}>
							<HugeiconsIcon
								icon={ArrowTurnBackwardIcon}
								strokeWidth={2}
								data-icon="inline-start"
							/>
							Restore
						</Button>
					</div>

					{#if loading}
						<p class="px-3 py-6 text-center text-xs text-muted-foreground">Rebuilding…</p>
					{:else if changes === null}
						<p class="px-3 py-6 text-center text-xs text-muted-foreground">
							This version can't be rebuilt — its history is incomplete.
						</p>
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
			<AlertDialog.Title>Restore this version?</AlertDialog.Title>
			<AlertDialog.Description>
				The note goes back to how it looked then. Nothing is lost — your current text is saved as a
				version first, so you can come straight back.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={() => confirmRestore && restore(confirmRestore)}>
				Restore
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
