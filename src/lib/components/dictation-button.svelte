<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
	import MicOff01Icon from '@hugeicons/core-free-icons/MicOff01Icon';
	import StopIcon from '@hugeicons/core-free-icons/StopIcon';
	import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';

	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { speech, LANGUAGES } from '$lib/stores/speech.svelte';
	import { notes } from '$lib/stores/notes.svelte';

	type Props = { ontoggle: () => void; disabled?: boolean };
	let { ontoggle, disabled = false }: Props = $props();

	const currentLang = $derived(
		LANGUAGES.find((l) => l.value === speech.lang)?.label ?? speech.lang
	);

	/**
	 * The other language to offer as a one-tap switch.
	 *
	 * Most people alternate between exactly two, so surfacing the previous one
	 * beats reopening a 15-item list every time. Undefined until a second
	 * language has actually been used — no speculative button.
	 */
	const otherLang = $derived(
		(notes.prefs.recentLangs ?? []).find((value) => value !== speech.lang)
	);

	function pickLang(value: string) {
		speech.setLang(value);
		notes.setPref('speechLang', value);
		notes.noteLangUse(value);
	}
</script>

<div class="flex items-center gap-1">
	{#if speech.supported}
		{#if otherLang}
			<!-- One-tap flip to the last other language; the full list stays in the menu. -->
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground"
				aria-label="Switch dictation to {LANGUAGES.find((l) => l.value === otherLang)?.label ??
					otherLang}"
				onclick={() => pickLang(otherLang)}
			>
				{otherLang.split('-')[0]}
			</Button>
		{/if}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="text-muted-foreground"
						aria-label="Dictation language: {currentLang}"
					>
						{speech.lang}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="max-h-72 overflow-y-auto">
				<DropdownMenu.Group>
					<DropdownMenu.Label>Dictation language</DropdownMenu.Label>
					{#each LANGUAGES as language (language.value)}
						<DropdownMenu.CheckboxItem
							checked={speech.lang === language.value}
							onCheckedChange={() => pickLang(language.value)}
						>
							{language.label}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Label>Transcript</DropdownMenu.Label>
					<DropdownMenu.CheckboxItem
						checked={speech.commands}
						onCheckedChange={(value) => {
							speech.setOption('commands', value);
							notes.setPref('voiceCommands', value);
						}}
					>
						Spoken punctuation
					</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem
						checked={speech.autoPunctuate}
						onCheckedChange={(value) => {
							speech.setOption('autoPunctuate', value);
							notes.setPref('autoPunctuate', value);
						}}
					>
						Auto-capitalize
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}

	<Tooltip.Provider delayDuration={300}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<!--
						Unsupported browsers get aria-disabled rather than `disabled`: a real
						disabled button swallows pointer events, so the tooltip explaining *why*
						it can't be used would never appear.
					-->
					<Button
						{...props}
						size="sm"
						variant={speech.listening ? 'default' : 'secondary'}
						disabled={disabled && speech.supported}
						aria-disabled={!speech.supported}
						aria-pressed={speech.supported ? speech.listening : undefined}
						aria-label={speech.listening ? 'Stop dictation' : 'Start dictation'}
						class={speech.listening
							? 'recording-pulse bg-recording text-white hover:bg-recording/90'
							: !speech.supported
								? 'text-muted-foreground opacity-60'
								: ''}
						onclick={ontoggle}
					>
						{#if !speech.supported}
							<HugeiconsIcon icon={MicOff01Icon} strokeWidth={2} data-icon="inline-start" />
							Voice
						{:else if speech.phase === 'starting'}
							<HugeiconsIcon
								icon={Loading03Icon}
								strokeWidth={2}
								class="animate-spin"
								data-icon="inline-start"
							/>
							Starting
						{:else if speech.phase === 'processing'}
							<HugeiconsIcon
								icon={Loading03Icon}
								strokeWidth={2}
								class="animate-spin"
								data-icon="inline-start"
							/>
							Transcribing
						{:else if speech.listening}
							<HugeiconsIcon icon={StopIcon} strokeWidth={2} data-icon="inline-start" />
							Stop
						{:else}
							<HugeiconsIcon icon={Mic01Icon} strokeWidth={2} data-icon="inline-start" />
							Dictate
						{/if}
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="top">
				{#if !speech.supported}
					Voice notes aren't available on this browser
				{:else if speech.listening}
					Stop dictating (Esc)
				{:else}
					Dictate with your voice (⌘⇧D)
				{/if}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
