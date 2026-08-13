import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { searchBlocks, type BlockDef } from './blocks';

/**
 * The `/` block picker.
 *
 * This extension owns only the *matching*; rendering is left to the caller so
 * the menu can be an ordinary Svelte component using the app's glass styling
 * rather than a detached DOM tree this file would have to hand-build.
 */

export type SlashState = {
	items: BlockDef[];
	/** Viewport coordinates of the caret, for positioning. */
	rect: { left: number; top: number; bottom: number };
	/** Replaces the `/query` text before running the block's command. */
	select: (block: BlockDef) => void;
};

export type SlashHandlers = {
	onOpen: (state: SlashState) => void;
	onUpdate: (state: SlashState) => void;
	onClose: () => void;
	/** Return true when the menu consumed the key. */
	onKeyDown: (event: KeyboardEvent) => boolean;
	/** Fires before a block runs, so dictation can be stopped first. */
	onBeforeSelect?: () => void;
};

export function createSlashExtension(handlers: SlashHandlers): Extension {
	return Extension.create({
		name: 'blockSlashMenu',

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					char: '/',
					// Only at the start of a block. Without this, "and/or" or a URL
					// typed mid-sentence pops the menu open constantly.
					startOfLine: true,
					// A block command is a single word; anything longer is prose that
					// happened to follow a slash.
					allowSpaces: false,

					items: ({ query }) => searchBlocks(query),

					command: ({
						editor,
						range,
						props
					}: {
						editor: Editor;
						range: Range;
						props: BlockDef;
					}) => {
						handlers.onBeforeSelect?.();
						// Delete the "/query" text first, or the trigger is left behind
						// inside whatever block is about to be created.
						editor.chain().focus().deleteRange(range).run();
						props.run(editor);
					},

					render: () => {
						/** Reads the caret rect; `clientRect` is null while the view settles. */
						const readRect = (clientRect: (() => DOMRect | null) | null | undefined) => {
							const rect = clientRect?.();
							return rect
								? { left: rect.left, top: rect.top, bottom: rect.bottom }
								: { left: 0, top: 0, bottom: 0 };
						};

						return {
							onStart: (props) => {
								handlers.onOpen({
									items: props.items as BlockDef[],
									rect: readRect(props.clientRect),
									select: (block) => props.command(block)
								});
							},
							onUpdate: (props) => {
								handlers.onUpdate({
									items: props.items as BlockDef[],
									rect: readRect(props.clientRect),
									select: (block) => props.command(block)
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
