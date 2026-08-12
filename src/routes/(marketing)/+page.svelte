<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
	import CheckListIcon from '@hugeicons/core-free-icons/CheckListIcon';
	import CloudOffIcon from '@hugeicons/core-free-icons/CloudOffIcon';
	import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
	import Download04Icon from '@hugeicons/core-free-icons/Download04Icon';
	import ShieldKeyIcon from '@hugeicons/core-free-icons/ShieldKeyIcon';
	import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';

	import { Button } from '$lib/components/ui/button';
	import { LANGUAGES } from '$lib/stores/speech.svelte';
	import { renderTranscript } from '$lib/speech/transcript';
	import { prefersReducedMotion } from '$lib/motion.svelte';
	import { reveal } from '$lib/marketing/reveal';
	import TextGenerate from '$lib/marketing/text-generate.svelte';
	import Spotlight from '$lib/marketing/spotlight.svelte';
	import TiltCard from '$lib/marketing/tilt-card.svelte';
	import Marquee from '$lib/marketing/marquee.svelte';
	import FollowingPointer from '$lib/components/following-pointer.svelte';

	/**
	 * Anyone who installed the app lands here when they launch it, because the
	 * manifest's start_url used to be "/". Send them on to the app. Client-side
	 * only, so crawlers still receive the marketing HTML.
	 */
	onMount(() => {
		if (window.matchMedia('(display-mode: standalone)').matches) {
			location.replace('/app');
		}
	});

	// The demo runs the *real* transcript pipeline, so what it shows is what the
	// app actually does with spoken punctuation — not a hand-written mock.
	const SPOKEN = [
		'pick up the dry cleaning comma',
		'then call mum period',
		'new line book flights'
	];
	let spokenCount = $state(0);
	const demo = $derived(
		renderTranscript(SPOKEN.slice(0, spokenCount), {
			lang: 'en-US',
			commands: true,
			autoPunctuate: true
		})
	);

	let heroRef = $state<HTMLElement | null>(null);
	let pointer = $state({ x: 0, y: 0, visible: false });

	onMount(() => {
		if (prefersReducedMotion.current) {
			spokenCount = SPOKEN.length;
			return;
		}
		let index = 0;
		const timer = setInterval(() => {
			index = (index + 1) % (SPOKEN.length + 2);
			spokenCount = Math.min(index, SPOKEN.length);
		}, 1400);
		return () => clearInterval(timer);
	});

	// Attached imperatively: the hero is a landmark, not a control, and giving it
	// an interaction role to satisfy the linter would mislead assistive tech.
	$effect(() => {
		if (!heroRef || prefersReducedMotion.current) return;
		const node = heroRef;

		const onMove = (event: PointerEvent) => {
			const box = node.getBoundingClientRect();
			pointer = { x: event.clientX - box.left, y: event.clientY - box.top, visible: true };
		};
		const onLeave = () => (pointer = { ...pointer, visible: false });

		node.addEventListener('pointermove', onMove);
		node.addEventListener('pointerleave', onLeave);
		return () => {
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
		};
	});

	const FEATURES = [
		{
			icon: Mic01Icon,
			title: 'Speak your punctuation',
			body: 'Say “period”, “new line”, or “scratch that” and it lands as punctuation, not as words. Works in English and Bahasa Indonesia.'
		},
		{
			icon: CheckListIcon,
			title: 'Checklists you can tap',
			body: 'Real checkboxes, headings and lists. Everything is stored as plain Markdown you can export and read anywhere.'
		},
		{
			icon: CloudOffIcon,
			title: 'Works with no signal',
			body: 'Install it and it runs offline. Notes live in your browser’s own storage, not in an account you have to sign into.'
		},
		{
			icon: Share08Icon,
			title: 'Share a live note',
			body: 'Send a link and edit together, with each other’s cursors visible. Choose whether the link can edit or only read.'
		}
	];
</script>

<svelte:head>
	<title>Note Speak — voice notes that stay on your device</title>
	<meta
		name="description"
		content="A fast, private note app with built-in voice dictation. Speak your punctuation, work offline, and share live notes by link. Your notes are stored on your device, not on our servers."
	/>
	<link rel="canonical" href="https://note-speak.app/" />
	<meta property="og:title" content="Note Speak — voice notes that stay on your device" />
	<meta
		property="og:description"
		content="Voice notes with spoken punctuation, offline by default, and live sharing by link. Nothing is stored on our servers."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<!-- ---------- Hero ---------- -->
<section bind:this={heroRef} class="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24">
	<Spotlight />

	{#if pointer.visible}
		<FollowingPointer x={pointer.x} y={pointer.y} name="You" color="var(--note-accent)" />
	{/if}

	<div class="relative mx-auto max-w-3xl text-center">
		<p
			class="mb-6 inline-flex items-center gap-2 rounded-full border glass-hairline px-3 py-1 text-xs font-medium text-muted-foreground glass"
		>
			<span class="size-1.5 rounded-full bg-recording"></span>
			No account. No servers. No tracking.
		</p>

		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
			<TextGenerate text="Notes you can just say out loud." />
		</h1>

		<p class="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
			Note Speak turns your voice into properly punctuated text, right in the browser. It works
			offline, installs like an app, and keeps your notes on your device.
		</p>

		<div class="mt-9 flex flex-wrap items-center justify-center gap-3">
			<Button size="lg" href={resolve('/app')}>
				<HugeiconsIcon icon={Mic01Icon} strokeWidth={2} data-icon="inline-start" />
				Open Note Speak
			</Button>
			<Button size="lg" variant="secondary" href={resolve('/app')}>
				<HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
				Install to your device
			</Button>
		</div>
		<p class="mt-3 text-xs text-muted-foreground">
			Free. Opens instantly — there's nothing to sign up for.
		</p>
	</div>

	<!-- Live dictation demo -->
	<div use:reveal={{ delay: 120 }} class="relative mx-auto mt-16 max-w-2xl">
		<div class="overflow-hidden glass-panel p-1">
			<div class="flex items-center gap-2 border-b border-[var(--glass-border)] px-4 py-2.5">
				<span class="size-2 animate-pulse rounded-full bg-recording"></span>
				<span class="text-xs text-muted-foreground">Listening…</span>
			</div>
			<div class="min-h-32 px-5 py-5 text-left text-lg leading-relaxed">
				{demo}<span class="ml-0.5 inline-block h-5 w-px animate-pulse bg-foreground align-middle"
				></span>
			</div>
			<div
				class="flex flex-wrap gap-1.5 border-t border-[var(--glass-border)] px-4 py-2.5 text-xs text-muted-foreground"
			>
				<span>You said:</span>
				<span class="font-mono">{SPOKEN.slice(0, spokenCount).join(' ') || '…'}</span>
			</div>
		</div>
	</div>
</section>

<!-- ---------- Features ---------- -->
<section class="px-6 py-16">
	<div class="mx-auto max-w-5xl">
		<h2 use:reveal class="max-w-lg text-3xl font-semibold tracking-tight text-balance">
			Built for thinking out loud
		</h2>
		<div class="mt-10 grid gap-4 sm:grid-cols-2">
			{#each FEATURES as feature, index (feature.title)}
				<div use:reveal={{ delay: index * 90 }}>
					<TiltCard class="h-full p-6">
						<span
							class="grid size-10 place-items-center rounded-xl bg-note-accent/12 text-note-accent"
						>
							<HugeiconsIcon icon={feature.icon} strokeWidth={2} class="size-5" />
						</span>
						<h3 class="mt-4 font-semibold">{feature.title}</h3>
						<p class="mt-2 text-sm text-pretty text-muted-foreground">{feature.body}</p>
					</TiltCard>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ---------- Languages ---------- -->
<section class="py-10">
	<div use:reveal class="mx-auto max-w-5xl px-6">
		<p class="mb-5 text-center text-sm text-muted-foreground">
			Dictate in {LANGUAGES.length} languages, using your browser's own speech engine
		</p>
	</div>
	<Marquee items={LANGUAGES.map((language) => language.label)} />
</section>

<!-- ---------- Privacy ---------- -->
<section class="px-6 py-20">
	<div class="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-start">
		<div use:reveal class="md:sticky md:top-28">
			<span
				class="inline-flex items-center gap-2 rounded-full bg-note-accent/12 px-3 py-1 text-xs font-medium text-note-accent"
			>
				<HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} class="size-3.5" />
				Privacy
			</span>
			<h2 class="mt-4 text-3xl font-semibold tracking-tight text-balance">
				We can't read your notes, because we never receive them.
			</h2>
			<p class="mt-4 text-pretty text-muted-foreground">
				There is no account and no database. Notes are written to your browser's own storage. When
				you share one, it syncs directly between devices, encrypted with a key that lives in the
				link itself — and a URL's <code class="rounded bg-muted px-1">#</code> fragment is never sent
				to a server.
			</p>
			<Button variant="secondary" size="sm" class="mt-6" href={resolve('/privacy')}>
				Read the privacy policy
			</Button>
		</div>

		<div class="flex flex-col gap-3">
			{#each [{ t: 'Your notes', d: 'Stored in this browser only. Never transmitted by us.' }, { t: 'Shared notes', d: 'Encrypted end-to-end and sent peer-to-peer. Our server only introduces the two browsers.' }, { t: 'Analytics', d: 'None at all. No cookies, no trackers, no third-party scripts.' }] as row, index (row.t)}
				<div use:reveal={{ delay: index * 90 }} class="glass-panel p-5">
					<h3 class="text-sm font-semibold">{row.t}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{row.d}</p>
				</div>
			{/each}

			<!--
				Stated up front rather than buried in the policy: in most browsers the
				speech engine is a cloud service, so dictation audio does leave the
				device even though the note text never does.
			-->
			<div use:reveal={{ delay: 270 }} class="glass-panel border-recording/30 p-5">
				<h3 class="flex items-center gap-2 text-sm font-semibold">
					<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} class="size-4 text-recording" />
					One honest exception
				</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Dictation uses your browser's speech recognition, and in Chrome and Safari that means the
					audio is sent to Google or Apple to be transcribed — not to us, and not under our control.
					Typing sends nothing anywhere.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ---------- Sharing ---------- -->
<section class="px-6 pb-20">
	<div use:reveal class="mx-auto max-w-5xl overflow-hidden glass-panel p-8 sm:p-12">
		<div class="max-w-xl">
			<h2 class="text-3xl font-semibold tracking-tight text-balance">
				Share a note the way you'd share a doc
			</h2>
			<p class="mt-4 text-pretty text-muted-foreground">
				Send a link and edit the same note together, with each other's cursors visible as you go.
				Pick a link that can edit, or one that can only read — view-only is enforced by every
				participant's device, not just hidden in the interface.
			</p>
			<p class="mt-4 text-sm text-muted-foreground">
				Because there's no copy on a server, a shared note opens when someone who has it is online.
				That's the trade for not handing your notes to anyone.
			</p>
			<Button class="mt-7" href={resolve('/app')}>Try it now</Button>
		</div>
	</div>
</section>
