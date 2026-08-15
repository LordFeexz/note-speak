import { Editor, Extension, type AnyExtension, type Content } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { DictationInterim } from './interim';
import { DIRECTIVE_NAMES, RAW_DIRECTIVES, directivePlugin } from './directive';
import { Callout, Toggle, Columns, Column, Video, Audio, FileBlock, Voice } from './nodes';
import { Embed } from './embed';
import { WikiLink, wikilinkPlugin } from './wikilink';
import { MathBlock, MermaidPreview, mathPlugin } from './math';

// tiptap-markdown predates Tiptap 3's typed `Storage`, so it registers its
// extension at runtime without declaring it. Merge the shape in rather than
// casting at each call site.
declare module '@tiptap/core' {
	interface Storage {
		markdown: { getMarkdown: () => string };
	}
}

/**
 * Registers the `:::directive` block rule with markdown-it.
 *
 * A separate extension rather than a hook on each node: markdown-it needs the
 * complete name list up front to decide what to consume, and one rule is
 * cheaper than nine.
 */
const DirectiveSupport = Extension.create({
	name: 'directiveSupport',
	addStorage() {
		return {
			markdown: {
				parse: {
					setup(markdownit: unknown) {
						directivePlugin(DIRECTIVE_NAMES, RAW_DIRECTIVES)(markdownit as never);
						wikilinkPlugin()(markdownit as never);
						mathPlugin()(markdownit as never);
					}
				}
			}
		};
	}
});

/**
 * The extensions every note editor gets, local or shared.
 *
 * Deliberately one function rather than two arrays. The local and collaborative
 * editors previously listed their extensions separately, which meant a node
 * added to only one of them would appear to work and then vanish the moment the
 * note was shared — silently, and with no way to get the content back.
 */
export function baseExtensions(
	options: { collaborative?: boolean; slash?: AnyExtension; wikiLink?: AnyExtension } = {}
): AnyExtension[] {
	return [
		StarterKit.configure({
			// Yjs ships its own undo manager that knows who made each change.
			// Running ProseMirror's alongside it means ⌘Z undoes a collaborator's
			// typing, which is the classic way to ruin shared editing.
			undoRedo: options.collaborative ? false : undefined,
			// Notes have no title field — the first line *is* the title, so a
			// document that starts with an H1 would double up in the list.
			heading: { levels: [1, 2, 3] },
			link: { openOnClick: false, autolink: true },
			// Markdown has no underline, and `html: false` means there is nothing to
			// fall back to — so ⌘U used to underline the text on screen and then
			// drop it silently on the next save. Better to have the shortcut do
			// nothing than to lose formatting the user could see.
			underline: false
		}),
		TaskList,
		// nested lets a checklist item hold sub-items; onReadOnlyChecked keeps
		// boxes tappable in a trashed note without making the text editable.
		TaskItem.configure({ nested: true, onReadOnlyChecked: () => false }),
		// Column resizing is a drag interaction with no touch equivalent, and a
		// note pane is too narrow for it to be worth the handles.
		Table.configure({ resizable: false }),
		TableRow,
		TableHeader,
		TableCell,
		/**
		 * Base64 is required, not optional.
		 *
		 * There is no backend, so a picked image can only live inside the note's own
		 * markdown as a data URI — which is exactly what `prepareMedia` produces and
		 * what the picker inserts. `allowBase64: false` sets the parse rule to
		 * `img[src]:not([src^="data:"])`, so every one of those images was silently
		 * dropped the next time the note was parsed, taking the note's only content
		 * with it. The cost of `true` is the size, which `media.ts` caps by
		 * downscaling to ~300 KB before the image ever reaches the document.
		 */
		Image.configure({ inline: false, allowBase64: true }),
		Callout,
		Toggle,
		Columns,
		Column,
		Video,
		Audio,
		FileBlock,
		Voice,
		Embed,
		WikiLink,
		MathBlock,
		MermaidPreview,
		Markdown.configure({
			// Deliberately off. Blocks Markdown cannot express use the `:::directive`
			// parser instead, so a shared note — content authored by someone else's
			// browser — can only ever produce node types we defined.
			html: false,
			transformPastedText: true,
			transformCopiedText: true,
			breaks: true,
			// Bullets use `*`; `normalizeListMarkers` rewrites checklist items back
			// to `-`. See the note there — the two markers must differ.
			bulletListMarker: '*'
		}),
		DirectiveSupport,
		DictationInterim,
		...(options.slash ? [options.slash] : []),
		...(options.wikiLink ? [options.wikiLink] : [])
	];
}

/**
 * The note editor.
 *
 * Markdown is the storage format, not the editing format: the editor holds a
 * ProseMirror document and serializes on save. That keeps `noteTitle()`,
 * `notePreview()` and the store's substring search working on plain text, and
 * keeps the hot dictation path from re-parsing markdown on every keystroke.
 */
export function createNoteEditor(options: {
	element: HTMLElement;
	content: string;
	editable: boolean;
	onUpdate: (markdown: string) => void;
	onCreate?: () => void;
	slash?: AnyExtension;
	wikiLink?: AnyExtension;
}): Editor {
	return new Editor({
		element: options.element,
		content: normalizeListMarkers(options.content),
		editable: options.editable,
		extensions: baseExtensions({ slash: options.slash, wikiLink: options.wikiLink }),
		editorProps: {
			attributes: {
				class: 'note-prose focus:outline-none',
				'aria-label': 'Note text',
				spellcheck: 'true'
			}
		},
		onCreate: () => options.onCreate?.(),
		onUpdate: ({ editor }) => options.onUpdate(getMarkdown(editor))
	});
}

/**
 * Give checklist items a different bullet character from ordinary lists.
 *
 * A checklist written directly below a bullet list with the *same* marker is
 * parsed by markdown-it as one merged list, and the task-list rule then
 * mis-assigns its items: it invents an empty leading checkbox and escapes the
 * bullet text into `\[ \]`. Because the damaged text is what gets saved, the
 * note degrades further on every save/load cycle.
 *
 * CommonMark ends a list when the bullet character changes, so emitting `*` for
 * bullets and `-` for checklists keeps them separate blocks. Both forms parse
 * identically, so nothing downstream needs to know.
 */
export function normalizeListMarkers(markdown: string): string {
	if (!markdown.includes('\n') && !/^\s*[-*+]/.test(markdown)) return markdown;

	let inFence = false;
	let fence = '';
	return markdown
		.split('\n')
		.map((line) => {
			// Never touch fenced code — a shell snippet full of `- flags` is not a list.
			const opener = line.match(/^\s*(```+|~~~+)/);
			if (opener) {
				if (!inFence) {
					inFence = true;
					fence = opener[1][0];
				} else if (opener[1][0] === fence) {
					inFence = false;
				}
				return line;
			}
			if (inFence) return line;

			// A spaced horizontal rule (`- - -`, `* * *`) starts with a bullet
			// character followed by a space, so the rule below would rewrite it into
			// a list item. The app only ever emits `---`, but an imported file may
			// use this form, and normalisation runs on the way in as well as out.
			if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) return line;

			const task = line.match(/^([ \t]*)[-*+](\s+\[[ xX]\]\s)/);
			if (task) return `${task[1]}-${task[2]}${line.slice(task[0].length)}`;

			const bullet = line.match(/^([ \t]*)[-*+](\s+)/);
			if (bullet) return `${bullet[1]}*${bullet[2]}${line.slice(bullet[0].length)}`;

			return line;
		})
		.join('\n');
}

/**
 * Put a blank line after a block image.
 *
 * The serializer emits `![alt](url)After` when a paragraph follows an image.
 * markdown-it parses that back into the same three blocks, so nothing is lost
 * here — but in CommonMark it is a *single* paragraph, so any other editor would
 * render the following text beside the image. Storing markdown is for
 * portability, so it should be correct markdown elsewhere too.
 */
function separateBlockImages(markdown: string): string {
	return markdown.replace(/^(!\[[^\]]*\]\([^)\s]*\))(?=\S)/gm, '$1\n\n');
}

/** Serialize the current document back to markdown. */
export function getMarkdown(editor: Editor): string {
	return separateBlockImages(normalizeListMarkers(editor.storage.markdown.getMarkdown()));
}

/**
 * The same editor, bound to a shared Yjs document.
 *
 * Shares `baseExtensions()` with the local editor so the two can never drift —
 * a node present in one but not the other would vanish on sharing. The only
 * differences: Yjs owns undo, and content comes from the Y fragment rather than
 * `setContent`, because writing local markdown into a live shared document
 * would clobber concurrent edits.
 */
export function createSharedEditor(options: {
	element: HTMLElement;
	fragment: unknown;
	awareness: unknown;
	user: { name: string; color: string };
	editable: boolean;
	onUpdate: (markdown: string) => void;
	slash?: AnyExtension;
	wikiLink?: AnyExtension;
}): Editor {
	return new Editor({
		element: options.element,
		editable: options.editable,
		extensions: [
			...baseExtensions({ collaborative: true, slash: options.slash, wikiLink: options.wikiLink }),
			Collaboration.configure({ fragment: options.fragment as never }),
			CollaborationCaret.configure({
				provider: { awareness: options.awareness } as never,
				user: options.user
			})
		],
		editorProps: {
			attributes: {
				class: 'note-prose focus:outline-none',
				'aria-label': 'Shared note text',
				spellcheck: 'true'
			}
		},
		onUpdate: ({ editor }) => options.onUpdate(getMarkdown(editor))
	});
}

/**
 * Load markdown into the editor.
 *
 * Normalising on the way *in* as well as out matters for notes this app didn't
 * write — an imported file using `-` for both list kinds would otherwise hit the
 * merge bug once, before we ever get a chance to re-serialize it safely.
 */
export function setMarkdown(editor: Editor, markdown: string) {
	editor.commands.setContent(normalizeListMarkers(markdown), { emitUpdate: false });
}

/**
 * Turn dictated text into insertable content.
 *
 * A plain string keeps the insertion inline, which is what we want almost
 * always. Only when a spoken "new paragraph"/"new line" command produced a
 * break do we build block content, because inserting `"\n"` as text would
 * otherwise show a literal newline inside one paragraph.
 */
export function toContent(text: string): Content {
	if (!text) return '';
	if (!text.includes('\n')) return text;

	return text.split(/\n{2,}/).map((block) => ({
		type: 'paragraph',
		content: block.split('\n').flatMap((line, index) => {
			const parts: Content[] = index > 0 ? [{ type: 'hardBreak' }] : [];
			if (line) parts.push({ type: 'text', text: line });
			return parts;
		})
	})) as Content;
}
