<script lang="ts">
	import { onMount } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { createSharedEditor, getMarkdown, normalizeListMarkers } from '$lib/editor/create';
	import { hasFinePointer } from '$lib/motion.svelte';
	import FollowingPointer from './following-pointer.svelte';
	import {
		openShareSession,
		signalingUrl,
		type Identity,
		type ProviderStatus,
		type Role,
		type ShareSession
	} from '$lib/share/session';
	import type { ShareLink } from '$lib/share/crypto';

	type Props = {
		link: ShareLink;
		identity: Identity;
		/** Mirrors the serialized markdown out, so the owner's note list stays accurate. */
		onmarkdown?: (markdown: string) => void;
		onsession?: (session: ShareSession) => void;
		/**
		 * Connection state, pushed up.
		 *
		 * The provider has a single `onstatus` slot, so a parent that also assigned
		 * it would silently replace this component's own subscription — the status
		 * indicator then sticks on "Connecting…" forever.
		 */
		onstate?: (state: { status: ProviderStatus; peerCount: number; role: Role }) => void;
		/** Hands the instance back so dictation can write into a shared note too. */
		oneditor?: (editor: Editor | null) => void;
		/**
		 * Existing note text to seed a brand new share with.
		 *
		 * Only the owner passes this. A recipient must never seed, or two peers
		 * would both write the initial content and the note would appear twice.
		 */
		seedMarkdown?: string;
	};

	let { link, identity, onmarkdown, onsession, oneditor, seedMarkdown, onstate }: Props = $props();

	type Pointer = { id: number; x: number; y: number; name: string; color: string };

	let host = $state<HTMLDivElement | null>(null);
	let surface = $state<HTMLDivElement | null>(null);
	let editor: Editor | null = null;
	let session: ShareSession | null = null;

	let peerCount = $state(0);
	let pointers = $state<Pointer[]>([]);
	/**
	 * Surface width, tracked so a peer's fractional x can be turned into pixels.
	 *
	 * Needed because the pointer layer animates `transform` (compositable) rather
	 * than a percentage `left` (not), and transform percentages resolve against
	 * the element's own box, not the container's.
	 */
	let surfaceWidth = $state(0);
	/** True once the local replica has loaded and we know whether we hold a copy. */
	let localReady = $state(false);
	let hasContent = $state(false);

	const isEmpty = $derived(localReady && !hasContent && peerCount === 0);

	onMount(() => {
		let disposed = false;
		let pointerFrame = 0;

		void (async () => {
			const opened = await openShareSession(link, identity, signalingUrl());
			if (disposed) return opened.destroy();
			session = opened;
			onsession?.(opened);

			const pushState = () => {
				peerCount = opened.provider.peerCount;
				onstate?.({
					status: opened.provider.status,
					peerCount: opened.provider.peerCount,
					role: opened.role
				});
			};
			opened.provider.onstatus = pushState;
			pushState();

			void opened.whenLocalReady.then(() => {
				localReady = true;
				hasContent = opened.fragment.length > 0;
			});

			if (!host) return;
			editor = createSharedEditor({
				element: host,
				fragment: opened.fragment,
				awareness: opened.provider.awareness,
				user: identity,
				// Viewers get a read-only surface. This is presentation only — the real
				// guarantee is that peers reject updates they can't verify.
				editable: opened.role === 'editor',
				onUpdate: (markdown) => {
					hasContent = true;
					onmarkdown?.(markdown);
				}
			});
			hasContent = opened.fragment.length > 0;
			oneditor?.(editor);

			if (opened.role === 'editor' && seedMarkdown?.trim()) {
				await opened.whenLocalReady;
				// Wait before deciding the document is empty: a peer that already holds
				// it may still be connecting, and seeding over their copy would append
				// a duplicate of the whole note rather than replacing anything.
				setTimeout(() => {
					if (disposed || !editor || opened.fragment.length > 0) return;
					editor.commands.setContent(normalizeListMarkers(seedMarkdown!));
					hasContent = true;
				}, 1500);
			}

			opened.provider.awareness.on('change', () => {
				const states = opened.provider.awareness.getStates();
				const self = opened.doc.clientID;
				pointers = [...states.entries()]
					.filter(([id, state]) => id !== self && state.pointer)
					.map(([id, state]) => ({
						id,
						x: state.pointer.x,
						y: state.pointer.y,
						name: state.user?.name ?? 'Someone',
						color: state.user?.color ?? '#888'
					}));
				pushState();
			});
		})();

		/**
		 * Broadcast the pointer in *content* coordinates.
		 *
		 * Viewport coordinates would land in the wrong place the moment two people
		 * have different window sizes or scroll positions — which is always. The
		 * surface's own box is the shared frame of reference.
		 */
		const onPointerMove = (event: PointerEvent) => {
			if (!session || !surface || pointerFrame) return;
			pointerFrame = requestAnimationFrame(() => {
				pointerFrame = 0;
				const box = surface!.getBoundingClientRect();
				session!.provider.awareness.setLocalStateField('pointer', {
					x: (event.clientX - box.left) / Math.max(1, box.width),
					y: event.clientY - box.top + surface!.scrollTop
				});
			});
		};
		const onPointerLeave = () => session?.provider.awareness.setLocalStateField('pointer', null);

		surface?.addEventListener('pointermove', onPointerMove);
		surface?.addEventListener('pointerleave', onPointerLeave);

		const resize = new ResizeObserver(([entry]) => {
			surfaceWidth = entry.contentRect.width;
		});
		if (surface) resize.observe(surface);

		return () => {
			disposed = true;
			cancelAnimationFrame(pointerFrame);
			resize.disconnect();
			surface?.removeEventListener('pointermove', onPointerMove);
			surface?.removeEventListener('pointerleave', onPointerLeave);
			oneditor?.(null);
			editor?.destroy();
			session?.destroy();
		};
	});

	/**
	 * Deliberately no export named `state`: it would shadow the `$state` rune in
	 * this module and silently strip reactivity from every declaration below it.
	 */
	export function markdown(): string {
		return editor ? getMarkdown(editor) : '';
	}
</script>

<div
	bind:this={surface}
	class="relative min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-4 md:px-6"
>
	<div bind:this={host} class="min-h-full"></div>

	{#if isEmpty}
		<!--
			The honest empty state. With no server storing the note, it exists only in
			connected peers' browsers — so this is a real condition, not a loading blip,
			and saying "loading…" forever would be a lie.
		-->
		<div class="pointer-events-none absolute inset-0 grid place-items-center p-6">
			<div class="max-w-xs text-center">
				<p class="text-sm font-medium">Nobody's here right now</p>
				<p class="mt-1 text-xs text-muted-foreground">
					This note lives on its collaborators' devices, not on a server. It'll appear as soon as
					someone who has it opens the link.
				</p>
			</div>
		</div>
	{/if}

	<!--
		Collaborator pointers. Peers broadcast x as a fraction of content width and
		y in absolute content pixels, so two people at different window sizes agree
		on where a cursor is pointing. Hidden on touch, where there is no hovering
		cursor to mirror.
	-->
	{#if hasFinePointer.current}
		{#each pointers as pointer (pointer.id)}
			<FollowingPointer
				x={pointer.x * surfaceWidth}
				y={pointer.y}
				name={pointer.name}
				color={pointer.color}
			/>
		{/each}
	{/if}
</div>
