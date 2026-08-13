import type { Editor } from '@tiptap/core';
import ParagraphIcon from '@hugeicons/core-free-icons/ParagraphIcon';
import Heading01Icon from '@hugeicons/core-free-icons/Heading01Icon';
import Heading02Icon from '@hugeicons/core-free-icons/Heading02Icon';
import Heading03Icon from '@hugeicons/core-free-icons/Heading03Icon';
import LeftToRightListBulletIcon from '@hugeicons/core-free-icons/LeftToRightListBulletIcon';
import LeftToRightListNumberIcon from '@hugeicons/core-free-icons/LeftToRightListNumberIcon';
import CheckListIcon from '@hugeicons/core-free-icons/CheckListIcon';
import QuoteDownIcon from '@hugeicons/core-free-icons/QuoteDownIcon';
import SourceCodeIcon from '@hugeicons/core-free-icons/SourceCodeIcon';
import Table01Icon from '@hugeicons/core-free-icons/Table01Icon';
import Image01Icon from '@hugeicons/core-free-icons/Image01Icon';
import SeparatorHorizontalIcon from '@hugeicons/core-free-icons/SeparatorHorizontalIcon';
import Video01Icon from '@hugeicons/core-free-icons/Video01Icon';
import MusicNote01Icon from '@hugeicons/core-free-icons/MusicNote01Icon';
import Attachment01Icon from '@hugeicons/core-free-icons/Attachment01Icon';
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
import Idea01Icon from '@hugeicons/core-free-icons/Idea01Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import LayoutTwoColumnIcon from '@hugeicons/core-free-icons/LayoutTwoColumnIcon';
import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
import FlowchartIcon from '@hugeicons/core-free-icons/Flowchart01Icon';
import MathIcon from '@hugeicons/core-free-icons/MathIcon';

/**
 * Every block the editor can produce, in one list.
 *
 * The slash menu, the Format dropdown and the Insert dropdown all render from
 * this array, so adding a block is one entry rather than four edits kept in
 * sync by hand.
 *
 * The split mirrors the two halves of a block editor's toolbar:
 *
 * - `basic`    — *converts* the current block. Mutually exclusive, so exactly
 *                one is active at a time and the Format control can be labelled
 *                with it.
 * - `advanced` — *inserts* a new node at the caret. Has no active state.
 *
 * Every block here round-trips through Markdown. Callouts, toggles, columns and
 * embeds are deliberately absent: they have no Markdown syntax, and notes are
 * stored as Markdown so they stay readable in any other editor.
 */
export type BlockGroup = 'basic' | 'advanced';

export type BlockDef = {
	id: string;
	group: BlockGroup;
	title: string;
	/** Extra search terms for the slash menu — what someone might type instead. */
	keywords: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hugeicons ships no icon type
	icon: any;
	/** `basic` only: whether the caret is currently in this kind of block. */
	isActive?: (editor: Editor) => boolean;
	/**
	 * Blocks needing input the editor cannot supply on its own — a picked file, a
	 * pasted URL. The host handles these; `run` is a no-op so a stray call
	 * inserts nothing rather than something broken.
	 */
	needs?: 'image' | 'video' | 'audio' | 'file' | 'url' | 'record';
	run: (editor: Editor) => void;
};

export const GROUP_LABELS: Record<BlockGroup, string> = {
	basic: 'Basic',
	advanced: 'Advanced'
};

export const BLOCKS: BlockDef[] = [
	// ---- Basic: change the current block ----
	{
		id: 'paragraph',
		group: 'basic',
		title: 'Text',
		keywords: ['paragraph', 'plain', 'body', 'p'],
		icon: ParagraphIcon,
		// Everything is a paragraph by default, so "active" means *nothing else*
		// claims the block — otherwise Text would light up inside a list item.
		isActive: (editor) =>
			editor.isActive('paragraph') &&
			!editor.isActive('bulletList') &&
			!editor.isActive('orderedList') &&
			!editor.isActive('taskList') &&
			!editor.isActive('blockquote'),
		run: (editor) => editor.chain().focus().setParagraph().run()
	},
	{
		id: 'heading1',
		group: 'basic',
		title: 'Heading 1',
		keywords: ['h1', 'title', 'large'],
		icon: Heading01Icon,
		isActive: (editor) => editor.isActive('heading', { level: 1 }),
		run: (editor) => editor.chain().focus().setNode('heading', { level: 1 }).run()
	},
	{
		id: 'heading2',
		group: 'basic',
		title: 'Heading 2',
		keywords: ['h2', 'subtitle', 'section'],
		icon: Heading02Icon,
		isActive: (editor) => editor.isActive('heading', { level: 2 }),
		run: (editor) => editor.chain().focus().setNode('heading', { level: 2 }).run()
	},
	{
		id: 'heading3',
		group: 'basic',
		title: 'Heading 3',
		keywords: ['h3', 'subheading'],
		icon: Heading03Icon,
		isActive: (editor) => editor.isActive('heading', { level: 3 }),
		run: (editor) => editor.chain().focus().setNode('heading', { level: 3 }).run()
	},
	{
		id: 'bulletList',
		group: 'basic',
		title: 'Bulleted list',
		keywords: ['ul', 'unordered', 'bullet', 'point'],
		icon: LeftToRightListBulletIcon,
		isActive: (editor) => editor.isActive('bulletList'),
		run: (editor) => editor.chain().focus().toggleBulletList().run()
	},
	{
		id: 'orderedList',
		group: 'basic',
		title: 'Numbered list',
		keywords: ['ol', 'ordered', 'number', 'steps'],
		icon: LeftToRightListNumberIcon,
		isActive: (editor) => editor.isActive('orderedList'),
		run: (editor) => editor.chain().focus().toggleOrderedList().run()
	},
	{
		id: 'taskList',
		group: 'basic',
		title: 'Check list',
		keywords: ['todo', 'task', 'checkbox', 'tick'],
		icon: CheckListIcon,
		isActive: (editor) => editor.isActive('taskList'),
		run: (editor) => editor.chain().focus().toggleTaskList().run()
	},
	{
		id: 'blockquote',
		group: 'basic',
		title: 'Quote',
		keywords: ['blockquote', 'citation', 'cite'],
		icon: QuoteDownIcon,
		isActive: (editor) => editor.isActive('blockquote'),
		run: (editor) => editor.chain().focus().toggleBlockquote().run()
	},
	{
		id: 'codeBlock',
		group: 'basic',
		title: 'Code block',
		keywords: ['code', 'snippet', 'pre', 'monospace'],
		icon: SourceCodeIcon,
		isActive: (editor) => editor.isActive('codeBlock'),
		run: (editor) => editor.chain().focus().toggleCodeBlock().run()
	},

	// ---- Advanced: insert a node ----
	{
		id: 'table',
		group: 'advanced',
		title: 'Table',
		keywords: ['grid', 'rows', 'columns', 'spreadsheet'],
		icon: Table01Icon,
		run: (editor) =>
			editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
	},
	{
		id: 'image',
		group: 'advanced',
		title: 'Image',
		keywords: ['picture', 'photo', 'img', 'upload'],
		icon: Image01Icon,
		needs: 'image',
		run: () => {}
	},
	{
		id: 'voice',
		group: 'advanced',
		title: 'Voice clip',
		keywords: ['record', 'audio', 'speak', 'dictate', 'transcript'],
		icon: Mic01Icon,
		// Records the audio and its transcript together — the one block that only
		// a voice-first note app can offer.
		needs: 'record',
		run: () => {}
	},
	{
		id: 'video',
		group: 'advanced',
		title: 'Video',
		keywords: ['movie', 'clip', 'mp4', 'record'],
		icon: Video01Icon,
		needs: 'video',
		run: () => {}
	},
	{
		id: 'audio',
		group: 'advanced',
		title: 'Audio',
		keywords: ['sound', 'music', 'voice', 'recording'],
		icon: MusicNote01Icon,
		needs: 'audio',
		run: () => {}
	},
	{
		id: 'file',
		group: 'advanced',
		title: 'File',
		keywords: ['attachment', 'document', 'pdf', 'download'],
		icon: Attachment01Icon,
		needs: 'file',
		run: () => {}
	},
	{
		id: 'embed',
		group: 'advanced',
		title: 'Embed link',
		keywords: ['youtube', 'instagram', 'tiktok', 'spotify', 'url'],
		icon: Link01Icon,
		needs: 'url',
		run: () => {}
	},
	{
		id: 'callout-note',
		group: 'advanced',
		title: 'Note callout',
		keywords: ['info', 'callout', 'aside', 'panel'],
		icon: InformationCircleIcon,
		run: (editor) => editor.chain().focus().setCallout('note').run()
	},
	{
		id: 'callout-warning',
		group: 'advanced',
		title: 'Warning callout',
		keywords: ['caution', 'danger', 'alert', 'callout'],
		icon: Alert02Icon,
		run: (editor) => editor.chain().focus().setCallout('warning').run()
	},
	{
		id: 'callout-tip',
		group: 'advanced',
		title: 'Tip callout',
		keywords: ['hint', 'idea', 'suggestion', 'callout'],
		icon: Idea01Icon,
		run: (editor) => editor.chain().focus().setCallout('tip').run()
	},
	{
		id: 'toggle',
		group: 'advanced',
		title: 'Toggle',
		keywords: ['collapse', 'details', 'accordion', 'expand'],
		icon: ArrowDown01Icon,
		run: (editor) => editor.chain().focus().setToggle().run()
	},
	{
		id: 'columns',
		group: 'advanced',
		title: 'Columns',
		keywords: ['side by side', 'layout', 'grid', 'split'],
		icon: LayoutTwoColumnIcon,
		run: (editor) => editor.chain().focus().setColumns().run()
	},
	{
		id: 'mermaid',
		group: 'advanced',
		title: 'Diagram',
		keywords: ['mermaid', 'flowchart', 'sequence', 'graph', 'chart'],
		icon: FlowchartIcon,
		// A plain ```mermaid code block — exactly what GitHub renders, so the note
		// stays readable anywhere. The preview is a decoration beside it.
		run: (editor) =>
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'codeBlock',
					attrs: { language: 'mermaid' },
					content: [{ type: 'text', text: 'flowchart TD\n  A[Start] --> B[Finish]' }]
				})
				.run()
	},
	{
		id: 'math',
		group: 'advanced',
		title: 'Formula',
		keywords: ['math', 'latex', 'katex', 'equation', 'tex'],
		icon: MathIcon,
		run: (editor) =>
			editor
				.chain()
				.focus()
				.insertContent({ type: 'mathBlock', content: [{ type: 'text', text: 'e = mc^2' }] })
				.run()
	},
	{
		id: 'horizontalRule',
		group: 'advanced',
		title: 'Divider',
		keywords: ['hr', 'rule', 'separator', 'line', 'break'],
		icon: SeparatorHorizontalIcon,
		run: (editor) => editor.chain().focus().setHorizontalRule().run()
	}
];

/**
 * Blocks matching a slash-menu query, best match first.
 *
 * Ranking matters more than it looks: Table lists "columns" as a keyword, so an
 * unranked filter put Table above Columns and `/columns` + Enter inserted a
 * table. A title match must always beat a keyword match.
 */
export function searchBlocks(query: string): BlockDef[] {
	const q = query.trim().toLowerCase();
	if (!q) return BLOCKS;

	const score = (block: BlockDef): number => {
		const title = block.title.toLowerCase();
		if (title === q) return 0;
		if (title.startsWith(q)) return 1;
		if (title.includes(q)) return 2;
		if (block.keywords.some((keyword) => keyword === q)) return 3;
		if (block.keywords.some((keyword) => keyword.startsWith(q))) return 4;
		if (block.keywords.some((keyword) => keyword.includes(q))) return 5;
		return Number.POSITIVE_INFINITY;
	};

	return (
		BLOCKS.map((block, index) => ({ block, rank: score(block), index }))
			.filter((entry) => entry.rank !== Number.POSITIVE_INFINITY)
			// Registry order breaks ties, so equally-good matches stay predictable.
			.sort((a, b) => a.rank - b.rank || a.index - b.index)
			.map((entry) => entry.block)
	);
}

/** The Basic block the caret is currently in, for the Format control's label. */
export function activeBlock(editor: Editor | null): BlockDef | undefined {
	if (!editor) return undefined;
	// Reverse order: headings and lists are more specific than paragraph, and
	// paragraph is first in the list.
	return [...BLOCKS].reverse().find((block) => block.isActive?.(editor));
}
