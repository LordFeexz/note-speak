import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Renders the part-heard dictation tail without putting it in the document.
 *
 * A ProseMirror *widget* decoration is drawn by the view but is not a node, so
 * the half-heard text cannot reach `getMarkdown()` and cannot be persisted —
 * the guarantee holds by construction rather than by remembering to strip it.
 * (The old `<textarea>` had no way to express this: interim text had to be real
 * content, which is why it could survive a badly-timed save.)
 */

export type InterimState = { pos: number; text: string } | null;

export const interimKey = new PluginKey<InterimState>('dictationInterim');

export const DictationInterim = Extension.create({
	name: 'dictationInterim',

	addProseMirrorPlugins() {
		return [
			new Plugin<InterimState>({
				key: interimKey,
				state: {
					init: () => null,
					apply(tr, value) {
						const meta = tr.getMeta(interimKey) as InterimState | undefined;
						if (meta !== undefined) return meta;
						// Keep the marker pinned to its text as edits shift the document —
						// a remote peer or an autocorrect can move it out from under us.
						return value ? { ...value, pos: tr.mapping.map(value.pos) } : null;
					}
				},
				props: {
					decorations(state) {
						const value = interimKey.getState(state);
						if (!value?.text) return null;
						const widget = Decoration.widget(
							value.pos,
							() => {
								const span = document.createElement('span');
								span.className = 'dictation-interim';
								span.setAttribute('data-slot', 'dictation-interim');
								span.textContent = value.text;
								return span;
							},
							// side: 1 keeps the widget after the caret, so typing continues
							// ahead of the pending words rather than behind them.
							{ side: 1, marks: [] }
						);
						return DecorationSet.create(state.doc, [widget]);
					}
				}
			})
		];
	}
});

/** Set or clear the pending tail. Never recorded in history — it isn't an edit. */
export function setInterim(editor: Editor, value: InterimState) {
	const tr = editor.state.tr;
	tr.setMeta(interimKey, value);
	tr.setMeta('addToHistory', false);
	editor.view.dispatch(tr);
}
