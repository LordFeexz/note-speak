import type { Extension } from '@tiptap/core';
import { createWikiLinkExtension, type LinkCandidate, type LinkState } from './wikilink-suggest';

/**
 * Shared state and key handling for the `[[` note picker.
 *
 * Mirrors `SlashController` deliberately, down to the clamping and the Escape
 * behaviour: the two menus look the same and appear for the same reason, so
 * they must answer the keyboard the same way. Anything that diverges here is a
 * surprise for someone who has learned the other one.
 */
export class LinkController {
	state = $state<LinkState | null>(null);
	index = $state(0);

	#search: (query: string) => LinkCandidate[];
	#onBeforeSelect?: () => void;

	constructor(options: {
		search: (query: string) => LinkCandidate[];
		/**
		 * Called before a link is inserted — used to stop dictation.
		 *
		 * Inserting deletes the `[[query` range and writes over it, which
		 * invalidates the span the recogniser is filling. Without this, choosing a
		 * link mid-dictation left the next transcript chunk writing into the wrong
		 * range and corrupting the note. `SlashController` carries the same hook for
		 * exactly the same reason.
		 */
		onBeforeSelect?: () => void;
	}) {
		this.#search = options.search;
		this.#onBeforeSelect = options.onBeforeSelect;
	}

	close() {
		this.state = null;
	}

	extension(): Extension {
		return createWikiLinkExtension({
			search: (query) => this.#search(query),
			onOpen: (next) => {
				this.state = next;
				this.index = 0;
			},
			onUpdate: (next) => {
				this.state = next;
				// Clamp rather than reset: the list shrinks as the query narrows, and a
				// stale index would highlight nothing.
				this.index = Math.min(this.index, Math.max(0, next.items.length - 1));
			},
			onClose: () => (this.state = null),
			onKeyDown: (event) => this.#onKeyDown(event)
		});
	}

	select(candidate: LinkCandidate) {
		if (!this.state) return;
		this.#onBeforeSelect?.();
		this.state.select(candidate);
	}

	#onKeyDown(event: KeyboardEvent): boolean {
		const state = this.state;
		if (!state?.items.length) return false;
		const count = state.items.length;

		if (event.key === 'ArrowDown') {
			this.index = (this.index + 1) % count;
			return true;
		}
		if (event.key === 'ArrowUp') {
			this.index = (this.index - 1 + count) % count;
			return true;
		}
		if (event.key === 'Enter') {
			this.select(state.items[this.index]);
			return true;
		}
		// Escape closes and leaves `[[` as literal text — which is what someone
		// writing about the syntax itself actually wanted.
		if (event.key === 'Escape') {
			this.state = null;
			return true;
		}
		return false;
	}
}
