import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

/**
 * Its own plugin key.
 *
 * `@tiptap/suggestion` defaults every instance to the key `suggestion$`, and
 * ProseMirror refuses two plugins with the same key — so adding this beside the
 * `/` picker throws at editor construction and nothing renders at all.
 */
const WIKILINK_SUGGESTION = new PluginKey('wikiLinkSuggestion');

/**
 * The `[[` note picker.
 *
 * The same shape as `slash.ts`: this extension owns only the matching and the
 * insertion, and hands rendering to the caller so the menu can be an ordinary
 * Svelte component in the app's styling.
 *
 * What it inserts is the literal `[[Title]]` text, not a node. The wikilink node
 * has an input rule that converts exactly that as it is typed, so letting the
 * rule do the work keeps one definition of what a link is — and means a link
 * created from this menu is indistinguishable from one typed by hand.
 */

/** A note offered by the picker. Deliberately not the `Note` type: this file has no store. */
export type LinkCandidate = { id: string; title: string };

export type LinkState = {
	items: LinkCandidate[];
	/** Viewport coordinates of the caret, for positioning. */
	rect: { left: number; top: number; bottom: number };
	/** Replaces the `[[query` text with a finished link. */
	select: (candidate: LinkCandidate) => void;
	/** What has been typed after `[[`, so the menu can offer to create it. */
	query: string;
};

export type LinkHandlers = {
	onOpen: (state: LinkState) => void;
	onUpdate: (state: LinkState) => void;
	onClose: () => void;
	/** Return true when the menu consumed the key. */
	onKeyDown: (event: KeyboardEvent) => boolean;
	/** Notes matching what has been typed. */
	search: (query: string) => LinkCandidate[];
};

export function createWikiLinkExtension(handlers: LinkHandlers): Extension {
	return Extension.create({
		name: 'wikiLinkSuggest',

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					pluginKey: WIKILINK_SUGGESTION,
					char: '[[',
					// Note titles are sentences — "Packing list" must stay one query
					// rather than closing the menu at the space.
					allowSpaces: true,
					// Anywhere, not just at the start of a line: a link's whole point is
					// to sit inside a sentence.
					startOfLine: false,

					items: ({ query }) => handlers.search(query),

					command: ({
						editor,
						range,
						props
					}: {
						editor: Editor;
						range: Range;
						props: LinkCandidate;
					}) => {
						// Write the closing brackets too. The input rule fires on the `]]`
						// and turns the whole thing into a link node, so this does not have
						// to know how links are represented.
						editor.chain().focus().deleteRange(range).insertContent(`[[${props.title}]]`).run();
					},

					render: () => {
						const readRect = (clientRect: (() => DOMRect | null) | null | undefined) => {
							const rect = clientRect?.();
							return rect
								? { left: rect.left, top: rect.top, bottom: rect.bottom }
								: { left: 0, top: 0, bottom: 0 };
						};

						return {
							onStart: (props) => {
								handlers.onOpen({
									items: props.items as LinkCandidate[],
									rect: readRect(props.clientRect),
									select: (candidate) => props.command(candidate),
									query: props.query
								});
							},
							onUpdate: (props) => {
								handlers.onUpdate({
									items: props.items as LinkCandidate[],
									rect: readRect(props.clientRect),
									select: (candidate) => props.command(candidate),
									query: props.query
								});
							},
							onKeyDown: ({ event }) => handlers.onKeyDown(event),
							onExit: () => handlers.onClose()
						};
					}
				})
			];
		}
	});
}
