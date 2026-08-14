<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import StopIcon from '@hugeicons/core-free-icons/StopIcon';
	import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import {
		VoiceRecorder,
		type VoiceClip,
		type RecorderErrorCode
	} from '$lib/editor/recorder.svelte';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	const DICT: Dict<{
		speakNow: string;
		discard: string;
		stop: string;
		errors: Record<Exclude<RecorderErrorCode, 'too-large'>, string>;
		tooLarge: (size: string, limit: string) => string;
	}> = {
		en: {
			speakNow: 'Recording — speak now',
			discard: 'Discard recording',
			stop: 'Stop',
			errors: {
				'no-recorder': "This browser can't record audio. Dictation still works.",
				'mic-blocked': 'Microphone access was blocked. Allow it in your browser settings.',
				'no-format': "This browser can't record in a supported format.",
				'not-saved': 'That recording could not be saved.'
			},
			tooLarge: (size, limit) => `That clip is ${size}; a note can hold ${limit}.`
		},
		id: {
			speakNow: 'Merekam — silakan bicara',
			discard: 'Buang rekaman',
			stop: 'Berhenti',
			errors: {
				'no-recorder': 'Browser ini tidak bisa merekam audio. Dikte tetap berfungsi.',
				'mic-blocked': 'Akses mikrofon diblokir. Izinkan lewat pengaturan browser Anda.',
				'no-format': 'Browser ini tidak bisa merekam dalam format yang didukung.',
				'not-saved': 'Rekaman itu tidak bisa disimpan.'
			},
			tooLarge: (size, limit) => `Klip itu ${size}; sebuah catatan hanya memuat ${limit}.`
		}
	};
	const t = $derived(DICT[locale.current]);

	/** One place that turns a recorder code into a sentence. */
	function message(code: RecorderErrorCode | null, fallback: RecorderErrorCode): string {
		const value = code ?? fallback;
		if (value === 'too-large') {
			const detail = recorder.errorDetail;
			return detail ? t.tooLarge(detail.size, detail.limit) : t.errors['not-saved'];
		}
		return t.errors[value];
	}

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
			toast.error(message(recorder.error, 'no-recorder'));
			active = false;
			return;
		}
		active = true;
	}

	async function finish() {
		const clip = await recorder.stop();
		active = false;
		if (!clip) {
			toast.error(message(recorder.error, 'not-saved'));
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
			{recorder.transcript || t.speakNow}
		</p>
		<Button variant="ghost" size="xs" onclick={abandon} aria-label={t.discard}>
			<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
		</Button>
		<Button size="xs" class="bg-recording text-white hover:bg-recording/90" onclick={finish}>
			<HugeiconsIcon icon={StopIcon} strokeWidth={2} data-icon="inline-start" />
			{t.stop}
		</Button>
	</div>
{/if}
