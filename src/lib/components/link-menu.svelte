<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Note01Icon from '@hugeicons/core-free-icons/Note01Icon';
	import NoteAddIcon from '@hugeicons/core-free-icons/NoteAddIcon';
	import type { LinkCandidate, LinkState } from '$lib/editor/wikilink-suggest';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';
	import SuggestionMenu from './suggestion-menu.svelte';

	/**
	 * The `[[` note picker's menu.
	 *
	 * Flat, unlike the block picker: these are note titles, and a heading over
	 * them would only repeat what the menu already says.
	 *
	 * The last row is always "link to a note that does not exist yet". Wiki links
	 * are supposed to work that way round — you write the link first and the note
	 * later — so the picker has to offer a title it has never seen, or it would
	 * only ever let you point at the past.
	 */
	type Props = {
		link: LinkState | null;
		selected: number;
		onselect: (candidate: LinkCandidate) => void;
	};
	let { link, selected, onselect }: Props = $props();

	const DICT: Dict<{ label: string; createNew: (title: string) => string }> = {
		en: { label: 'Link to a note', createNew: (title) => `Link to “${title}” — a new note` },
		id: {
			label: 'Tautkan ke catatan',
			createNew: (title) => `Tautkan ke “${title}” — catatan baru`
		}
	};
	const t = $derived(DICT[locale.current]);
</script>

<SuggestionMenu rect={link && link.items.length ? link.rect : null} {selected} label={t.label}>
	{#each link?.items ?? [] as candidate, index (candidate.id)}
		<button
			type="button"
			role="option"
			aria-selected={index === selected}
			data-selected={index === selected}
			class="flex min-h-9 w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors {index ===
			selected
				? 'bg-note-accent/15 text-foreground'
				: 'text-muted-foreground hover:bg-muted/60'}"
			onclick={() => onselect(candidate)}
		>
			<HugeiconsIcon
				icon={candidate.id === 'new' ? NoteAddIcon : Note01Icon}
				strokeWidth={2}
				class="size-4 shrink-0"
			/>
			<span class="truncate">
				{candidate.id === 'new' ? t.createNew(candidate.title) : candidate.title}
			</span>
		</button>
	{/each}
</SuggestionMenu>
