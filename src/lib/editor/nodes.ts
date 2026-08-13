import { Node, mergeAttributes } from '@tiptap/core';

import { serializeContainer, serializeRaw } from './directive';

/**
 * Blocks Markdown has no syntax for, expressed as `:::directives`.
 *
 * Each node declares both halves of its own round-trip: `renderHTML` for the
 * editor, and `addStorage().markdown.serialize` for storage. The matching parse
 * side is the shared directive rule registered once in `create.ts`.
 */

const attrFrom = (element: HTMLElement, name: string, fallback = '') =>
	element.getAttribute(name) ?? fallback;

/** Body text of a raw directive, which the parser puts in a marked child div. */
const rawBody = (element: HTMLElement) =>
	element.querySelector('[data-directive-body]')?.textContent?.trim() ??
	element.getAttribute('src') ??
	'';

export const CALLOUT_TYPES = ['note', 'warning', 'tip'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		noteBlocks: {
			setCallout: (type: CalloutType) => ReturnType;
			setToggle: () => ReturnType;
			setColumns: () => ReturnType;
		};
	}
}

export const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,

	addAttributes() {
		return {
			type: {
				default: 'note' as CalloutType,
				/**
				 * The directive name carries the type (`:::warning`), so read it from
				 * `data-directive` first. A tag-level `attrs` on the parse rule cannot
				 * do this job: an attribute's own `parseHTML` overrides it, which is
				 * how every callout silently came back as `note`.
				 */
				parseHTML: (element) => {
					const node = element as HTMLElement;
					const directive = node.getAttribute('data-directive') ?? '';
					if ((CALLOUT_TYPES as readonly string[]).includes(directive)) return directive;
					return attrFrom(node, 'data-type', 'note');
				},
				renderHTML: (attributes) => ({ 'data-type': attributes.type })
			}
		};
	},

	parseHTML() {
		// The directive name *is* the type, so each variant is its own tag rule and
		// carries the type across. `:::warning` reads better in a plain-text note
		// than `:::callout{type="warning"}` would.
		return [
			{ tag: 'div[data-directive="callout"]' },
			...CALLOUT_TYPES.map((type) => ({
				tag: `div[data-directive="${type}"]`,
				attrs: { type }
			}))
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-directive': 'callout', class: 'note-callout' }),
			0
		];
	},

	addCommands() {
		return {
			setCallout:
				(type: CalloutType) =>
				({ commands }) =>
					// Wrap rather than replace: whatever is already on the line moves
					// inside the callout instead of being thrown away.
					commands.wrapIn(this.name, { type })
		};
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: never, node: { attrs: { type: string } }) {
					// The type is the directive name — `:::warning` reads better than
					// `:::callout{type="warning"}` when the note is opened as plain text.
					serializeContainer(state, node, node.attrs.type || 'note');
				}
			}
		};
	}
});

export const Toggle = Node.create({
	name: 'toggle',
	group: 'block',
	content: 'block+',
	defining: true,

	addAttributes() {
		return {
			summary: {
				default: 'Details',
				parseHTML: (element) => attrFrom(element as HTMLElement, 'data-summary', 'Details'),
				renderHTML: (attributes) => ({ 'data-summary': attributes.summary })
			},
			open: {
				default: true,
				parseHTML: (element) => attrFrom(element as HTMLElement, 'data-open') !== 'false',
				renderHTML: (attributes) => ({ 'data-open': String(attributes.open) })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-directive="toggle"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-directive': 'toggle', class: 'note-toggle' }),
			0
		];
	},

	addCommands() {
		return {
			setToggle:
				() =>
				({ commands }) =>
					commands.wrapIn(this.name)
		};
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: never, node: { attrs: { summary: string } }) {
					serializeContainer(state, node, 'toggle', { summary: node.attrs.summary });
				}
			}
		};
	}
});

export const Column = Node.create({
	name: 'column',
	content: 'block+',
	isolating: true,

	parseHTML() {
		return [{ tag: 'div[data-directive="column"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-directive': 'column', class: 'note-column' }),
			0
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: never, node: unknown) {
					serializeContainer(state, node, 'column');
				}
			}
		};
	}
});

export const Columns = Node.create({
	name: 'columns',
	group: 'block',
	content: 'column+',

	parseHTML() {
		return [{ tag: 'div[data-directive="columns"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-directive': 'columns', class: 'note-columns' }),
			0
		];
	},

	addCommands() {
		return {
			setColumns:
				() =>
				({ commands }) =>
					// Two empty columns, since wrapping existing content would put it all
					// in the left column and leave the right one orphaned.
					commands.insertContent({
						type: this.name,
						content: [
							{ type: 'column', content: [{ type: 'paragraph' }] },
							{ type: 'column', content: [{ type: 'paragraph' }] }
						]
					})
		};
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: never, node: unknown) {
					serializeContainer(state, node, 'columns');
				}
			}
		};
	}
});

/**
 * Media nodes.
 *
 * `src` is a base64 data URI, which is why these are *raw* directives: running
 * a multi-megabyte payload through the inline Markdown parser would be both
 * pointless and slow.
 */
function mediaNode(config: { name: string; tag: 'video' | 'audio'; className: string }) {
	return Node.create({
		name: config.name,
		group: 'block',
		atom: true,
		draggable: true,

		addAttributes() {
			return {
				src: {
					default: '',
					parseHTML: (element) => rawBody(element as HTMLElement),
					renderHTML: (attributes) => ({ src: attributes.src })
				},
				name: {
					default: '',
					parseHTML: (element) => attrFrom(element as HTMLElement, 'data-name'),
					renderHTML: (attributes) => ({ 'data-name': attributes.name })
				}
			};
		},

		parseHTML() {
			return [
				{ tag: `div[data-directive="${config.name}"]` },
				{ tag: `${config.tag}[data-directive="${config.name}"]` }
			];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				config.tag,
				mergeAttributes(HTMLAttributes, {
					'data-directive': config.name,
					class: config.className,
					controls: 'true',
					preload: 'metadata'
				})
			];
		},

		addStorage() {
			return {
				markdown: {
					serialize(state: never, node: { attrs: { src: string; name: string } }) {
						serializeRaw(state, node, config.name, node.attrs.src, { name: node.attrs.name });
					}
				}
			};
		}
	});
}

/**
 * A voice clip and the transcript captured alongside it.
 *
 * The raw body is two parts: the data URI on the first line, the transcript on
 * the rest. That ordering is deliberate — `searchableText()` strips only the
 * `data:` payload, so the spoken words stay findable by search while the base64
 * never is.
 *
 * ```
 * :::voice{duration="0:12"}
 * data:audio/webm;base64,…
 * Pick up the dry cleaning, then call mum.
 * :::
 * ```
 */
export const Voice = Node.create({
	name: 'voice',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src: {
				default: '',
				parseHTML: (element) =>
					rawBody(element as HTMLElement)
						.split('\n')[0]
						?.trim() ?? '',
				renderHTML: (attributes) => ({ 'data-src': attributes.src })
			},
			transcript: {
				default: '',
				parseHTML: (element) =>
					rawBody(element as HTMLElement)
						.split('\n')
						.slice(1)
						.join('\n')
						.trim(),
				renderHTML: (attributes) => ({ 'data-transcript': attributes.transcript })
			},
			duration: {
				default: '',
				parseHTML: (element) => attrFrom(element as HTMLElement, 'data-duration'),
				renderHTML: (attributes) => ({ 'data-duration': attributes.duration })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-directive="voice"]' }, { tag: 'div[data-voice]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-voice': '', class: 'note-voice' }),
			[
				'audio',
				{ src: node.attrs.src, controls: 'true', preload: 'metadata', class: 'note-voice__audio' }
			],
			[
				'p',
				{ class: 'note-voice__transcript' },
				node.attrs.transcript || 'No transcript — the words were not recognised.'
			]
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(
					state: never,
					node: { attrs: { src: string; transcript: string; duration: string } }
				) {
					const body = [node.attrs.src, node.attrs.transcript].filter(Boolean).join('\n');
					serializeRaw(state, node, 'voice', body, { duration: node.attrs.duration });
				}
			}
		};
	}
});

export const Video = mediaNode({ name: 'video', tag: 'video', className: 'note-video' });
export const Audio = mediaNode({ name: 'audio', tag: 'audio', className: 'note-audio' });

/** A file attachment: a download link carrying its own base64 payload. */
export const FileBlock = Node.create({
	name: 'file',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src: {
				default: '',
				parseHTML: (element) => rawBody(element as HTMLElement),
				renderHTML: (attributes) => ({ href: attributes.src, download: attributes.name || 'file' })
			},
			name: {
				default: 'file',
				parseHTML: (element) => attrFrom(element as HTMLElement, 'data-name', 'file'),
				renderHTML: (attributes) => ({ 'data-name': attributes.name })
			},
			size: {
				default: '',
				parseHTML: (element) => attrFrom(element as HTMLElement, 'data-size'),
				renderHTML: (attributes) => ({ 'data-size': attributes.size })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-directive="file"]' }, { tag: 'a[data-directive="file"]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			'a',
			mergeAttributes(HTMLAttributes, { 'data-directive': 'file', class: 'note-file' }),
			`${node.attrs.name}${node.attrs.size ? ` · ${node.attrs.size}` : ''}`
		];
	},

	addStorage() {
		return {
			markdown: {
				serialize(state: never, node: { attrs: { src: string; name: string; size: string } }) {
					serializeRaw(state, node, 'file', node.attrs.src, {
						name: node.attrs.name,
						size: node.attrs.size
					});
				}
			}
		};
	}
});
