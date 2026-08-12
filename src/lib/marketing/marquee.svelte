<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * An endlessly scrolling row.
	 *
	 * The track is rendered twice and translated by exactly -50%, so the loop is
	 * seamless without measuring anything. The duplicate is `aria-hidden`, or a
	 * screen reader would read every item twice.
	 */
	type Props = { items: string[]; seconds?: number; item?: Snippet<[string]> };
	let { items, seconds = 42, item }: Props = $props();
</script>

<div
	class="marquee group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
>
	{#each [false, true] as duplicate (duplicate)}
		<div
			class="marquee-track flex shrink-0 items-center gap-3 pr-3"
			style="animation-duration: {seconds}s"
			aria-hidden={duplicate ? 'true' : undefined}
		>
			{#each items as value (value)}
				{#if item}
					{@render item(value)}
				{:else}
					<span
						class="rounded-full border glass-hairline px-4 py-2 text-sm whitespace-nowrap glass"
					>
						{value}
					</span>
				{/if}
			{/each}
		</div>
	{/each}
</div>
