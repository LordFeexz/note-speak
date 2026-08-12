import { Editor, type Content } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Markdown } from 'tiptap-markdown';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { DictationInterim } from './interim';

// tiptap-markdown predates Tiptap 3's typed `Storage`, so it registers its
// extension at runtime without declaring it. Merge the shape in rather than
// casting at each call site.
declare module '@tiptap/core' {
	interface Storage {
		markdown: { getMarkdown: () => string };
	}
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
}): Editor {
	return new Editor({
		element: options.element,
		content: normalizeListMarkers(options.content),
		editable: options.editable,
		extensions: [
			StarterKit.configure({
				// Notes have no title field — the first line *is* the title, so a
				// document that starts with an H1 would double up in the list.
				heading: { levels: [1, 2, 3] },
				link: { openOnClick: false, autolink: true }
			}),
			TaskList,
			// nested lets a checklist item hold sub-items; onReadOnlyChecked keeps
			// boxes tappable in a trashed note without making the text editable.
			TaskItem.configure({ nested: true, onReadOnlyChecked: () => false }),
			Markdown.configure({
				html: false,
				transformPastedText: true,
				transformCopiedText: true,
				breaks: true,
				// Bullets use `*`; `serializeMarkdown` rewrites checklist items back to
				// `-`. See the note there — the two markers must differ.
				bulletListMarker: '*'
			}),
			DictationInterim
		],
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

			const task = line.match(/^([ \t]*)[-*+](\s+\[[ xX]\]\s)/);
			if (task) return `${task[1]}-${task[2]}${line.slice(task[0].length)}`;

			const bullet = line.match(/^([ \t]*)[-*+](\s+)/);
			if (bullet) return `${bullet[1]}*${bullet[2]}${line.slice(bullet[0].length)}`;

			return line;
		})
		.join('\n');
}

/** Serialize the current document back to markdown. */
export function getMarkdown(editor: Editor): string {
	return normalizeListMarkers(editor.storage.markdown.getMarkdown());
}

/**
 * The same editor, bound to a shared Yjs document.
 *
 * Two differences from the local editor, both load-bearing:
 *
 * - `undoRedo: false`. Yjs ships its own undo manager that is aware of who made
 *   each change; running ProseMirror's alongside it means ⌘Z undoes a
 *   collaborator's typing, which is the classic way to ruin shared editing.
 * - Content comes from the Y fragment, never from `setContent`. Writing local
 *   markdown into a live shared document would clobber concurrent edits.
 */
export function createSharedEditor(options: {
	element: HTMLElement;
	fragment: unknown;
	awareness: unknown;
	user: { name: string; color: string };
	editable: boolean;
	onUpdate: (markdown: string) => void;
}): Editor {
	return new Editor({
		element: options.element,
		editable: options.editable,
		extensions: [
			StarterKit.configure({
				undoRedo: false,
				heading: { levels: [1, 2, 3] },
				link: { openOnClick: false, autolink: true }
			}),
			TaskList,
			TaskItem.configure({ nested: true, onReadOnlyChecked: () => false }),
			Markdown.configure({
				html: false,
				transformPastedText: true,
				transformCopiedText: true,
				breaks: true,
				bulletListMarker: '*'
			}),
			DictationInterim,
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
