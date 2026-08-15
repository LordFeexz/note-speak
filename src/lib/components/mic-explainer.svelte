<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { docHref } from '$lib/docs/nav';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { Dict } from '$lib/i18n/dict';

	/**
	 * What happens to your voice, said once before the browser asks for the mic.
	 *
	 * The permission prompt is the highest-drop-off moment in a voice-first app,
	 * and it arrives with no context: a bare "allow microphone?" from the browser,
	 * on a page that has not explained why it wants one.
	 *
	 * The copy is deliberately the same two facts the welcome note and the docs
	 * already state, rather than a third version of them — including the awkward
	 * one. Chrome and Safari transcribe by streaming audio to Google and Apple,
	 * and someone about to grant a microphone deserves to know that *before* the
	 * prompt rather than never.
	 *
	 * It is a preface, not a gate: "Continue" starts dictation immediately, and it
	 * never appears again on this device.
	 */
	type Props = {
		open: boolean;
		/** Runs on Continue — the dictation this dialog interrupted. */
		oncontinue: () => void;
	};
	let { open = $bindable(false), oncontinue }: Props = $props();

	const DICT: Dict<{
		title: string;
		neverUs: string;
		butBrowser: string;
		continue: string;
		cancel: string;
		readMore: string;
	}> = {
		en: {
			title: 'Before your browser asks for the microphone',
			neverUs:
				'Note Speak never receives your audio. There is no server behind this app and no account to send it to.',
			butBrowser:
				'Your browser does the transcribing — and in Chrome and Safari that means the audio goes to Google or Apple. Firefox does it on your device. Nothing about that is under our control, which is why it is worth saying plainly.',
			continue: 'Continue',
			cancel: 'Not now',
			readMore: 'Read more in the docs'
		},
		id: {
			title: 'Sebelum browser Anda meminta mikrofon',
			neverUs:
				'Note Speak tidak pernah menerima audio Anda. Tidak ada server di balik aplikasi ini dan tidak ada akun yang bisa dikirimi.',
			butBrowser:
				'Browser Anda yang melakukan transkripsi — dan di Chrome serta Safari itu berarti audionya dikirim ke Google atau Apple. Firefox melakukannya di perangkat Anda. Itu semua di luar kendali kami, dan justru karena itu perlu dikatakan terus terang.',
			continue: 'Lanjutkan',
			cancel: 'Nanti saja',
			readMore: 'Selengkapnya di dokumentasi'
		}
	};
	const t = $derived(DICT[locale.current]);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<HugeiconsIcon icon={Mic01Icon} strokeWidth={2} class="size-5 shrink-0" />
				{t.title}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t.neverUs}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<p class="text-sm text-muted-foreground">{t.butBrowser}</p>

		<!--
			Opens in a new tab: installed as a PWA there is no browser chrome, so
			navigating away in place would replace the notes window with a docs page
			and no visible way back.
		-->
		<Button
			variant="link"
			size="sm"
			class="h-auto w-fit p-0"
			href={docHref(locale.current, 'voice')}
			target="_blank"
			rel="noopener"
		>
			{t.readMore}
		</Button>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t.cancel}</AlertDialog.Cancel>
			<!--
				Closed here rather than relying on the primitive: passing `onclick`
				replaces `Action`'s own handler instead of running alongside it, so the
				dialog would stay open behind the dictation it just started.
			-->
			<AlertDialog.Action
				onclick={() => {
					open = false;
					oncontinue();
				}}
			>
				{t.continue}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
