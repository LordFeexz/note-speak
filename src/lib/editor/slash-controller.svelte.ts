import type { Extension } from '@tiptap/core';
import { createSlashExtension, type SlashState } from './slash';
import type { BlockDef } from './blocks';

/**
 * Shared state and key handling for the `/` block menu.
 *
 * Both the local editor and the collaborative one need this, and the shared
 * note has *two* entry points (embedded in the app, and the standalone `/s/…`
 * page). Writing it once here is what stops the menu silently existing in one
 * editor and not the other — the same drift the single `baseExtensions()` list
 * prevents one level down.
 */
export class SlashController {
	state = $state<SlashState | null>(null);
	index = $state(0);

	#onBeforeSelect?: () => void;
	#onNeeds: (block: BlockDef) => void;

	constructor(options: {
		/** Called before a block runs — used to stop dictation. */
		onBeforeSelect?: () => void;
		/**
		 * Blocks that need input the editor cannot supply — a picked file, a
		 * pasted URL. The host owns the picker, so it handles these instead of
		 * `block.run`.
		 */
		onNeeds: (block: BlockDef) => void;
	}) {
		this.#onBeforeSelect = options.onBeforeSelect;
		this.#onNeeds = options.onNeeds;
	}

	close() {
		this.state = null;
	}

	extension(): Extension {
		return createSlashExtension({
			onOpen: (next) => {
				this.state = next;
				this.index = 0;
			},
			onUpdate: (next) => {
				this.state = next;
				// Clamp rather than reset: the list shrinks as the query narrows, and
				// a stale index would highlight nothing.
				this.index = Math.min(this.index, Math.max(0, next.items.length - 1));
			},
			onClose: () => (this.state = null),
			onBeforeSelect: () => this.#onBeforeSelect?.(),
			onKeyDown: (event) => this.#onKeyDown(event)
		});
	}

	/** Clicking an item in the menu. */
	select(block: BlockDef) {
		const state = this.state;
		if (!state) return;
		if (block.needs) {
			// Consume the "/query" range with a no-op first, then let the host
			// prompt — otherwise the trigger text is left behind in the new block.
			state.select({ ...block, run: () => {} });
			this.#onNeeds(block);
			return;
		}
		state.select(block);
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
		// Escape closes and leaves the "/" as literal text — what someone typing a
		// path or a fraction actually wanted.
		if (event.key === 'Escape') {
			this.state = null;
			return true;
		}
		return false;
	}
}
