import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

/**
 * Link cards for YouTube, Instagram and anything else.
 *
 * Two decisions worth stating, because both are load-bearing:
 *
 * **The Markdown is just the URL.** A paragraph whose whole content is a link
 * becomes a card, and the card serializes back to that bare URL. Nothing custom
 * ends up in storage, so the note stays readable in any other editor — an embed
 * is a *rendering* of a link, not a new kind of content.
 *
 * **Nothing is fetched until you click.** Provider detection is pattern
 * matching on the URL, never a network request, and the player iframe is
 * created only on activation. That is what keeps the app's "no third-party
 * scripts, no trackers" claim true for a note that merely *contains* a YouTube
 * link, and what lets the card still render with no connection at all.
 */

export type EmbedProvider = {
	id: string;
	label: string;
	/** Only present where an inline player is possible. */
	embedUrl?: string;
};

const YOUTUBE =
	/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i;
const INSTAGRAM = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)/i;
const TIKTOK = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i;
const VIMEO = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
const SPOTIFY = /^(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode)\/(\w+)/i;
const X_POST = /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status\/(\d+)/i;

/** Recognise a URL by shape alone — no request is ever made. */
export function detectProvider(url: string): EmbedProvider {
	let match: RegExpMatchArray | null;

	if ((match = url.match(YOUTUBE))) {
		return {
			id: 'youtube',
			label: 'YouTube',
			// nocookie, and only ever loaded after an explicit click.
			embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}`
		};
	}
	if ((match = url.match(VIMEO))) {
		return { id: 'vimeo', label: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${match[1]}` };
	}
	if ((match = url.match(SPOTIFY))) {
		return {
			id: 'spotify',
			label: 'Spotify',
			embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}`
		};
	}
	if ((match = url.match(INSTAGRAM))) {
		return {
			id: 'instagram',
			label: 'Instagram',
			embedUrl: `https://www.instagram.com/p/${match[1]}/embed`
		};
	}
	if (TIKTOK.test(url)) return { id: 'tiktok', label: 'TikTok' };
	if (X_POST.test(url)) return { id: 'x', label: 'X' };

	try {
		return { id: 'link', label: new URL(url).hostname.replace(/^www\./, '') };
	} catch {
		return { id: 'link', label: 'Link' };
	}
}

/** A whole-line URL, which is what gets upgraded to a card. */
export const BARE_URL = /^https?:\/\/\S+$/;

export const Embed = Node.create({
	name: 'embed',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			href: {
				default: '',
				parseHTML: (element) =>
					(element as HTMLElement).getAttribute('data-href') ??
					(element as HTMLElement).getAttribute('href') ??
					'',
				renderHTML: (attributes) => ({ 'data-href': attributes.href })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-embed]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		const provider = detectProvider(node.attrs.href);
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-embed': provider.id,
				'data-playable': provider.embedUrl ? 'true' : 'false',
				class: 'note-embed'
			}),
			['span', { class: 'note-embed__provider' }, provider.label],
			[
				'a',
				{
					class: 'note-embed__link',
					href: node.attrs.href,
					target: '_blank',
					rel: 'noopener noreferrer nofollow'
				},
				node.attrs.href
			],
			[
				'span',
				{ class: 'note-embed__hint' },
				provider.embedUrl ? 'Click to play — loads from ' + provider.label : 'Opens in a new tab'
			]
		];
	},

	/**
	 * Load the player, and only now.
	 *
	 * A ProseMirror plugin rather than a Svelte node view: the card is static
	 * markup, so one delegated click handler is far less machinery than mounting
	 * a component per embed.
	 */
	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handleDOMEvents: {
						click: (_view, event) => {
							const target = event.target as HTMLElement | null;
							const card = target?.closest?.('.note-embed') as HTMLElement | null;
							if (!card || card.dataset.playable !== 'true') return false;
							// The link itself keeps its normal behaviour.
							if (target?.closest('a')) return false;
							if (card.querySelector('iframe')) return false;

							const href = card.getAttribute('data-href') ?? '';
							const provider = detectProvider(href);
							if (!provider.embedUrl) return false;

							const frame = document.createElement('iframe');
							frame.src = provider.embedUrl;
							frame.className = 'note-embed__frame';
							frame.setAttribute('allowfullscreen', 'true');
							frame.setAttribute('loading', 'lazy');
							// Least privilege: enough to play, not enough to navigate us away.
							frame.setAttribute(
								'sandbox',
								'allow-scripts allow-same-origin allow-presentation allow-popups'
							);
							// No `referrerpolicy` override. YouTube validates the embedding
							// origin from the Referer header and answers a missing one with
							// "Error 153: Video player configuration error" — `no-referrer`
							// broke every embed. The browser default
							// (strict-origin-when-cross-origin) sends the origin only, never
							// the note's own URL, which is the least it can work with.
							card.replaceChildren(frame);
							event.preventDefault();
							return true;
						}
					}
				}
			})
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(
					state: { write: (text: string) => void; closeBlock: (node: unknown) => void },
					node: { attrs: { href: string } }
				) {
					// Back to a bare URL: the card is a rendering, not a storage format.
					state.write(node.attrs.href);
					state.closeBlock(node);
				},
				parse: {
					/**
					 * Upgrade a paragraph that is nothing but a link into a card.
					 *
					 * Done on the parsed DOM rather than with a markdown-it rule, because
					 * what matters is the *resulting* structure: a paragraph whose entire
					 * content is one autolink.
					 */
					updateDOM(element: HTMLElement) {
						for (const paragraph of [...element.querySelectorAll('p')]) {
							const text = paragraph.textContent?.trim() ?? '';
							if (!BARE_URL.test(text)) continue;
							// One link and nothing else — not a sentence that happens to end
							// in a URL, which should stay a paragraph.
							const links = paragraph.querySelectorAll('a');
							if (links.length > 1) continue;
							if (links.length === 1 && links[0].textContent?.trim() !== text) continue;

							const card = paragraph.ownerDocument.createElement('div');
							card.setAttribute('data-embed', '');
							card.setAttribute('data-href', text);
							paragraph.replaceWith(card);
						}
					}
				}
			}
		};
	}
});
