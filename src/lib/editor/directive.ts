/**
 * A `:::name{attrs}` block syntax for nodes Markdown has no syntax for.
 *
 * ```
 * :::warning{title="Careful"}
 * Body content, still readable as plain text.
 * :::
 * ```
 *
 * Chosen over `tiptap-markdown`'s HTML fallback for two reasons. The plain-text
 * form still reads sensibly in an editor that doesn't understand it, where raw
 * `<div>` soup does not — and, more importantly, **a shared note is content
 * authored by someone else's browser**. Enabling `html: true` would widen what a
 * peer can inject into your editor; this parser only ever emits the directive
 * names we register.
 *
 * Two flavours:
 *
 * - **container** (`callout`, `toggle`, `columns`) — inner lines are parsed as
 *   Markdown, so a callout can hold lists and emphasis.
 * - **raw** (`video`, `audio`, `file`) — inner lines are taken verbatim. Their
 *   payload is a base64 data URI, which must never be run through the inline
 *   parser: it is megabytes long and contains no Markdown.
 */

type StateBlock = {
	src: string;
	bMarks: number[];
	eMarks: number[];
	tShift: number[];
	sCount: number[];
	blkIndent: number;
	line: number;
	lineMax: number;
	parentType: string;
	push(type: string, tag: string, nesting: number): DirectiveToken;
	md: { block: { tokenize(state: StateBlock, start: number, end: number): void } };
};

type DirectiveToken = {
	info?: string;
	meta?: Record<string, string>;
	content?: string;
	markup?: string;
	map?: [number, number];
	block?: boolean;
	hidden?: boolean;
};

type MarkdownIt = {
	block: { ruler: { before(name: string, id: string, rule: unknown, options?: unknown): void } };
	renderer: { rules: Record<string, unknown> };
	utils: { escapeHtml(value: string): string };
};

const MARKER = 0x3a; // ':'
const MIN_MARKERS = 3;

/** `{a="b" c=d}` → `{ a: 'b', c: 'd' }`. Values may be quoted or bare. */
function parseAttrs(input: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const pattern = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(input))) {
		attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
	}
	return attrs;
}

/**
 * markdown-it block rule for directives.
 *
 * @param names   directive names to recognise; anything else is left as text
 * @param rawNames subset whose body is taken verbatim
 */
export function directivePlugin(names: string[], rawNames: string[] = []) {
	const known = new Set(names);
	const raw = new Set(rawNames);

	return (md: MarkdownIt) => {
		function directive(state: StateBlock, startLine: number, endLine: number, silent: boolean) {
			let start = state.bMarks[startLine] + state.tShift[startLine];
			const max = state.eMarks[startLine];

			// Indented more than 3 spaces is a code block, not a directive.
			if (state.sCount[startLine] - state.blkIndent >= 4) return false;
			if (start + MIN_MARKERS > max) return false;
			if (state.src.charCodeAt(start) !== MARKER) return false;

			let pos = start;
			while (pos < max && state.src.charCodeAt(pos) === MARKER) pos++;
			const markerCount = pos - start;
			if (markerCount < MIN_MARKERS) return false;

			const rest = state.src.slice(pos, max).trim();
			const header = /^([a-zA-Z][\w-]*)\s*(\{.*\})?$/.exec(rest);
			if (!header) return false;
			const name = header[1];
			if (!known.has(name)) return false;

			// `silent` means "can you handle this?" — answer without consuming.
			if (silent) return true;

			const attrs = header[2] ? parseAttrs(header[2]) : {};
			const isRaw = raw.has(name);

			// Scan for the closing fence, tracking nesting so a callout can hold a
			// toggle without the inner terminator closing the outer block.
			let nesting = 1;
			let line = startLine;
			let closed = false;
			while (line + 1 < endLine) {
				line++;
				start = state.bMarks[line] + state.tShift[line];
				const lineMax = state.eMarks[line];
				if (start >= lineMax) continue;
				if (state.src.charCodeAt(start) !== MARKER) continue;
				if (state.sCount[line] - state.blkIndent >= 4) continue;

				let end = start;
				while (end < lineMax && state.src.charCodeAt(end) === MARKER) end++;
				if (end - start < MIN_MARKERS) continue;

				const tail = state.src.slice(end, lineMax).trim();
				if (tail === '') {
					nesting--;
					if (nesting === 0) {
						closed = true;
						break;
					}
				} else if (/^[a-zA-Z][\w-]*(\s*\{.*\})?$/.test(tail) && !isRaw) {
					// Only container directives can nest; a raw body is never scanned
					// for openers, so a base64 payload can't be mistaken for one.
					nesting++;
				}
			}

			const contentStart = startLine + 1;
			const contentEnd = closed ? line : line + 1;

			const open = state.push('directive_open', 'div', 1);
			open.info = name;
			open.meta = attrs;
			open.markup = ':'.repeat(markerCount);
			open.map = [startLine, contentEnd];
			open.block = true;

			if (isRaw) {
				const lines: string[] = [];
				for (let i = contentStart; i < contentEnd; i++) {
					lines.push(state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]));
				}
				const body = state.push('directive_raw', '', 0);
				body.content = lines.join('\n');
				body.block = true;
			} else {
				const oldMax = state.lineMax;
				const oldParent = state.parentType;
				state.lineMax = contentEnd;
				state.parentType = 'directive';
				state.md.block.tokenize(state, contentStart, contentEnd);
				state.lineMax = oldMax;
				state.parentType = oldParent;
			}

			const close = state.push('directive_close', 'div', -1);
			close.info = name;
			close.markup = ':'.repeat(markerCount);
			close.block = true;

			state.line = closed ? contentEnd + 1 : contentEnd;
			return true;
		}

		md.block.ruler.before('fence', 'directive', directive, {
			alt: ['paragraph', 'reference', 'blockquote', 'list']
		});

		/**
		 * Rendered to a `<div data-directive="…">` that each node claims with its
		 * own `parseHTML`. The attribute values are escaped here; nothing from the
		 * source reaches the DOM as markup.
		 */
		md.renderer.rules.directive_open = (tokens: DirectiveToken[], index: number) => {
			const token = tokens[index];
			const attrs = Object.entries(token.meta ?? {})
				.map(([key, value]) => ` data-${md.utils.escapeHtml(key)}="${md.utils.escapeHtml(value)}"`)
				.join('');
			return `<div data-directive="${md.utils.escapeHtml(token.info ?? '')}"${attrs}>`;
		};
		md.renderer.rules.directive_close = () => '</div>\n';
		md.renderer.rules.directive_raw = (tokens: DirectiveToken[], index: number) =>
			`<div data-directive-body="">${md.utils.escapeHtml(tokens[index].content ?? '')}</div>`;
	};
}

// ---- serialization ----

type SerializerState = {
	write(text: string): void;
	text(text: string, escape?: boolean): void;
	ensureNewLine(): void;
	closeBlock(node: unknown): void;
	renderContent(node: unknown): void;
};

function formatAttrs(attrs: Record<string, string | number | boolean | null | undefined>): string {
	const pairs = Object.entries(attrs)
		.filter(([, value]) => value !== null && value !== undefined && value !== '')
		// Quotes in a value would terminate the attribute early, so drop them
		// rather than emit a directive header that cannot be re-parsed.
		.map(([key, value]) => `${key}="${String(value).replace(/"/g, '')}"`);
	return pairs.length ? `{${pairs.join(' ')}}` : '';
}

/** Serialize a container directive, rendering child nodes as Markdown. */
export function serializeContainer(
	state: SerializerState,
	node: unknown,
	name: string,
	attrs: Record<string, string | number | boolean | null | undefined> = {}
) {
	state.write(`:::${name}${formatAttrs(attrs)}`);
	state.ensureNewLine();
	state.renderContent(node);
	state.ensureNewLine();
	state.write(':::');
	state.closeBlock(node);
}

/** Serialize a raw directive whose body is written verbatim. */
export function serializeRaw(
	state: SerializerState,
	node: unknown,
	name: string,
	body: string,
	attrs: Record<string, string | number | boolean | null | undefined> = {}
) {
	state.write(`:::${name}${formatAttrs(attrs)}`);
	state.ensureNewLine();
	if (body) {
		state.text(body, false);
		state.ensureNewLine();
	}
	state.write(':::');
	state.closeBlock(node);
}

/** Names registered with the parser, and which of them take a raw body. */
export const DIRECTIVE_NAMES = [
	// Callout variants are their own directive names — see Callout.parseHTML.
	'note',
	'warning',
	'tip',
	'callout',
	'toggle',
	'columns',
	'column',
	'video',
	'audio',
	'file',
	'voice'
];
export const RAW_DIRECTIVES = ['video', 'audio', 'file', 'voice'];
