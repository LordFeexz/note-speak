import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { renderMath, renderMermaid } from './render-lazy';

/**
 * Diagrams and formulas, rendered from syntax Markdown already has.
 *
 * **Mermaid is not a node.** A ```mermaid fence is already how GitHub does it,
 * so the source stays an ordinary code block and the rendered SVG is added as a
 * *decoration* beside it. Nothing new reaches storage, and a note opened
 * anywhere else still shows a perfectly readable code block.
 *
 * **Math is a node**, because `$$…$$` has no equivalent in the schema. Block
 * form only: inline `$…$` collides with prices ("$5 and $10 makes $15") and the
 * false positives are worse than the missing feature.
 */

// ---- shared async render cache ----

/**
 * Rendered HTML by source text.
 *
 * Decorations are computed synchronously but rendering is async, so the first
 * pass shows a placeholder and schedules a refresh. Caching by source means
 * scrolling or typing elsewhere never re-renders an unchanged diagram.
 */
const cache = new Map<string, { html: string; ok: boolean }>();
const inFlight = new Set<string>();

function ensureRendered(
	key: string,
	source: string,
	kind: 'mermaid' | 'math',
	refresh: () => void
) {
	if (cache.has(key) || inFlight.has(key)) return;
	inFlight.add(key);
	const run = kind === 'mermaid' ? renderMermaid(source) : renderMath(source, true);
	void run.then((result) => {
		inFlight.delete(key);
		cache.set(
			key,
			result.ok ? { html: result.html, ok: true } : { html: result.message, ok: false }
		);
		refresh();
	});
}

function preview(entry: { html: string; ok: boolean } | undefined, kind: string): HTMLElement {
	const box = document.createElement('div');
	box.className = `note-render note-render--${kind}`;
	box.setAttribute('contenteditable', 'false');
	if (!entry) {
		box.textContent = 'Rendering…';
		box.dataset.state = 'pending';
		return box;
	}
	if (!entry.ok) {
		box.textContent = entry.html;
		box.dataset.state = 'error';
		return box;
	}
	// Safe: `html` is output from mermaid/KaTeX, never the user's raw source.
	box.innerHTML = entry.html;
	box.dataset.state = 'ok';
	return box;
}

// ---- mermaid: decoration over an ordinary code block ----

const mermaidKey = new PluginKey('mermaidPreview');

export const MermaidPreview = Extension.create({
	name: 'mermaidPreview',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: mermaidKey,
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];
						state.doc.descendants((node, pos) => {
							if (node.type.name !== 'codeBlock') return;
							if ((node.attrs.language ?? '') !== 'mermaid') return;
							const source = node.textContent;
							const key = `mermaid:${source}`;
							ensureRendered(key, source, 'mermaid', () => {
								// A no-op transaction is the cheapest way to make ProseMirror
								// recompute decorations once the render resolves.
								const view = this.editor?.view;
								if (view) view.dispatch(view.state.tr.setMeta(mermaidKey, Date.now()));
							});
							decorations.push(
								Decoration.widget(pos + node.nodeSize, () => preview(cache.get(key), 'mermaid'), {
									side: 1
								})
							);
						});
						return DecorationSet.create(state.doc, decorations);
					}
				}
			})
		];
	}
});

// ---- math: a block node from `$$ … $$` ----

type MarkdownIt = {
	block: { ruler: { before(name: string, id: string, rule: unknown, options?: unknown): void } };
	renderer: { rules: Record<string, unknown> };
	utils: { escapeHtml(value: string): string };
};

type BlockState = {
	src: string;
	bMarks: number[];
	eMarks: number[];
	tShift: number[];
	sCount: number[];
	blkIndent: number;
	line: number;
	push(type: string, tag: string, nesting: number): { content?: string; block?: boolean };
};

/** markdown-it rule for a `$$`-fenced block. */
export function mathPlugin() {
	return (md: MarkdownIt) => {
		md.block.ruler.before(
			'fence',
			'mathBlock',
			(state: BlockState, startLine: number, endLine: number, silent: boolean) => {
				const start = state.bMarks[startLine] + state.tShift[startLine];
				const max = state.eMarks[startLine];
				if (state.sCount[startLine] - state.blkIndent >= 4) return false;
				if (state.src.slice(start, max).trim() !== '$$') return false;
				if (silent) return true;

				let line = startLine;
				let closed = false;
				while (line + 1 < endLine) {
					line++;
					const from = state.bMarks[line] + state.tShift[line];
					if (state.src.slice(from, state.eMarks[line]).trim() === '$$') {
						closed = true;
						break;
					}
				}

				const lines: string[] = [];
				for (let i = startLine + 1; i < (closed ? line : endLine); i++) {
					lines.push(state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]));
				}
				const token = state.push('math_block', '', 0);
				token.content = lines.join('\n');
				token.block = true;
				state.line = closed ? line + 1 : endLine;
				return true;
			},
			{ alt: ['paragraph', 'blockquote', 'list'] }
		);

		md.renderer.rules.math_block = (tokens: { content?: string }[], index: number) =>
			`<div data-math="">${md.utils.escapeHtml(tokens[index].content ?? '')}</div>\n`;
	};
}

const mathKey = new PluginKey('mathPreview');

export const MathBlock = Node.create({
	name: 'mathBlock',
	group: 'block',
	// `code` keeps ProseMirror from applying marks inside a formula.
	content: 'text*',
	marks: '',
	code: true,
	defining: true,

	parseHTML() {
		return [{ tag: 'div[data-math]', preserveWhitespace: 'full' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-math': '', class: 'note-math' }), 0];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: mathKey,
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];
						state.doc.descendants((node, pos) => {
							if (node.type.name !== this.name) return;
							const source = node.textContent;
							const key = `math:${source}`;
							ensureRendered(key, source, 'math', () => {
								const view = this.editor?.view;
								if (view) view.dispatch(view.state.tr.setMeta(mathKey, Date.now()));
							});
							decorations.push(
								Decoration.widget(pos + node.nodeSize, () => preview(cache.get(key), 'math'), {
									side: 1
								})
							);
						});
						return DecorationSet.create(state.doc, decorations);
					}
				}
			})
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(
					state: {
						write: (text: string) => void;
						text: (text: string, escape?: boolean) => void;
						ensureNewLine: () => void;
						closeBlock: (node: unknown) => void;
					},
					node: { textContent: string }
				) {
					state.write('$$');
					state.ensureNewLine();
					state.text(node.textContent, false);
					state.ensureNewLine();
					state.write('$$');
					state.closeBlock(node);
				}
			}
		};
	}
});
