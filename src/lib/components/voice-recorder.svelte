<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import StopIcon from '@hugeicons/core-free-icons/StopIcon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { VoiceRecorder, type VoiceClip } from '$lib/editor/recorder.svelte';

	/**
	 * The recording bar for a voice clip.
	 *
	 * Shows the live transcript while recording so it is obvious the words are
	 * being captured, not just the audio.
	 */
	type Props = { active: boolean; oninsert: (clip: VoiceClip) => void };
	let { active = $bindable(false), oninsert }: Props = $props();

	const recorder = new VoiceRecorder();

	export async function begin() {
		const started = await recorder.start();
		if (!started) {
			toast.error(recorder.error ?? "Recording isn't available here.");
			active = false;
			return;
		}
		active = true;
	}

	async function finish() {
		const clip = await recorder.stop();
		active = false;
		if (!clip) {
			toast.error(recorder.error ?? 'That recording could not be saved.');
			return;
		}
		oninsert(clip);
	}

	function abandon() {
		recorder.cancel();
		active = false;
	}

	const clock = $derived(
		`${Math.floor(recorder.seconds / 60)}:${String(recorder.seconds % 60).padStart(2, '0')}`
	);
</script>

{#if active}
	<div class="flex items-center gap-3 border-t border-recording/30 bg-recording/5 px-4 py-2">
		<span class="size-2.5 shrink-0 animate-pulse rounded-full bg-recording" aria-hidden="true"
		></span>
		<span class="shrink-0 text-xs font-medium tabular-nums">{clock}</span>
		<p class="min-w-0 flex-1 truncate text-xs text-muted-foreground" aria-live="polite">
			{recorder.transcript || 'Recording — speak now'}
		</p>
		<Button variant="ghost" size="xs" onclick={abandon} aria-label="Discard recording">
			<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
		</Button>
		<Button size="xs" class="bg-recording text-white hover:bg-recording/90" onclick={finish}>
			<HugeiconsIcon icon={StopIcon} strokeWidth={2} data-icon="inline-start" />
			Stop
		</Button>
	</div>
{/if}
