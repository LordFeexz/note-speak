import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

/**
 * `[[Note title]]` links between notes.
 *
 * Stored as the literal text, so it round-trips through Markdown untouched and
 * means the same thing in Obsidian, Logseq, or a plain text editor. Resolution
 * happens at *render* time against the live note list, which is what makes
 * renaming safe: nothing stores an id that could go stale.
 *
 * A link to a title that does not exist is not an error — it renders as an
 * invitation to create that note, which is how wiki-style linking is supposed
 * to work.
 */

/** `[[Some title]]`, non-greedy so `[[a]] and [[b]]` is two links. */
const WIKILINK = /\[\[([^\]\n]+)\]\]/;

type InlineState = {
	src: string;
	pos: number;
	posMax: number;
	pending: string;
	push(type: string, tag: string, nesting: number): { content?: string; markup?: string };
};

type MarkdownIt = {
	inline: { ruler: { before(name: string, id: string, rule: unknown): void } };
	renderer: { rules: Record<string, unknown> };
	utils: { escapeHtml(value: string): string };
};

/** markdown-it inline rule producing a `<span data-wikilink="…">`. */
export function wikilinkPlugin() {
	return (md: MarkdownIt) => {
		md.inline.ruler.before('link', 'wikilink', (state: InlineState, silent: boolean) => {
			if (state.src.charCodeAt(state.pos) !== 0x5b) return false; // '['
			if (state.src.charCodeAt(state.pos + 1) !== 0x5b) return false;

			const match = WIKILINK.exec(state.src.slice(state.pos));
			if (!match || match.index !== 0) return false;
			if (state.pos + match[0].length > state.posMax) return false;

			if (!silent) {
				const token = state.push('wikilink', '', 0);
				token.content = match[1].trim();
				token.markup = match[0];
			}
			state.pos += match[0].length;
			return true;
		});

		md.renderer.rules.wikilink = (tokens: { content?: string }[], index: number) =>
			`<span data-wikilink="${md.utils.escapeHtml(tokens[index].content ?? '')}"></span>`;
	};
}

export const WikiLink = Node.create({
	name: 'wikilink',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			title: {
				default: '',
				parseHTML: (element) => (element as HTMLElement).getAttribute('data-wikilink') ?? '',
				renderHTML: (attributes) => ({ 'data-wikilink': attributes.title })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-wikilink]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, { class: 'note-wikilink', role: 'link', tabindex: '0' }),
			node.attrs.title
		];
	},

	/**
	 * Turn `[[Title]]` into a link as it is typed.
	 *
	 * Without this the text only becomes a link when the note is next parsed —
	 * so a link you just wrote stays inert for the rest of the session, which
	 * reads as broken.
	 */
	addInputRules() {
		return [
			nodeInputRule({
				find: /\[\[([^\]\n]+)\]\]$/,
				type: this.type,
				getAttributes: (match) => ({ title: match[1].trim() })
			})
		];
	},

	/**
	 * Follow a link on click.
	 *
	 * The node has no idea what a note is, so it raises a DOM event and lets the
	 * app decide — which keeps the editor free of routing and the store.
	 */
	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handleDOMEvents: {
						click: (view, event) => {
							const target = (event.target as HTMLElement | null)?.closest?.(
								'.note-wikilink'
							) as HTMLElement | null;
							if (!target) return false;
							const title = target.getAttribute('data-wikilink') ?? '';
							view.dom.dispatchEvent(
								new CustomEvent('wikilink', { detail: { title }, bubbles: true })
							);
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
				serialize(state: { write: (text: string) => void }, node: { attrs: { title: string } }) {
					// Back to the literal text — nothing app-specific reaches storage.
					state.write(`[[${node.attrs.title}]]`);
				}
			}
		};
	}
});

/** Titles linked from a body, for building the backlink index. */
export function linkedTitles(body: string): string[] {
	const out: string[] = [];
	for (const match of body.matchAll(/\[\[([^\]\n]+)\]\]/g)) out.push(match[1].trim());
	return out;
}
