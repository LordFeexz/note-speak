import { notes } from '$lib/stores/notes.svelte';
import type { Note } from '$lib/types';

/**
 * Dragging a note from one folder column to another.
 *
 * Hand-rolled on Pointer Events rather than HTML5 drag-and-drop, which does not
 * fire on touch at all — and this app is compact-first. A drag-and-drop library
 * would not help either: they exist to solve *reordering* — placeholders,
 * insertion indices, shifting siblings — and they own the array they reorder.
 * Here the array is `listFor()`, a derived sort with nowhere to write back to.
 *
 * None of that machinery is needed, because a note has no manual order.
 * `listFor()` sorts globally — pinned first, then the chosen sort — so where a
 * note lands inside its new column is decided by the sort, not by where you
 * released it. **A drop only ever changes `folderId`.**
 *
 * That is also what makes the drag immune to the list re-sorting underneath it:
 * hit-testing is horizontal, against columns, and a re-sort only moves cards
 * within one.
 *
 * The keyboard route is untouched: every card's ⋯ menu still lists every folder
 * under "Move to". Dragging is an addition, never the only way — which is why
 * the handle is deliberately not a tab stop.
 */

/** `null` is the Unfiled column — the same value `moveNote` takes for All Notes. */
export type ColumnId = string | null;

/** A column's horizontal extent in *content* coordinates. See `#hit`. */
type Box = { id: ColumnId; left: number; right: number };

export type DragPhase = 'lift' | 'over' | 'drop' | 'cancel';

export type BoardGeometry = {
	/** The horizontal scroller. */
	board: HTMLElement | null;
	/** The flex row holding the columns — the origin for content coordinates. */
	row: HTMLElement | null;
	columns: { id: ColumnId; element: HTMLElement; scroller: HTMLElement | null }[];
};

/** Pixels the pointer must travel before a press becomes a drag. */
const THRESHOLD = 4;
/** Distance from an edge at which auto-scroll starts, and its top speed. */
const EDGE = 56;
const MAX_SPEED = 18;
/** A drop suppresses the click that would otherwise open the note. */
const CLICK_GUARD_MS = 250;

function edgeVelocity(point: number, low: number, high: number): number {
	if (point - low < EDGE) return -MAX_SPEED * Math.min(1, (EDGE - (point - low)) / EDGE);
	if (high - point < EDGE) return MAX_SPEED * Math.min(1, (EDGE - (high - point)) / EDGE);
	return 0;
}

export class BoardDrag {
	/** The note being dragged, or `null` when nothing is in flight. */
	note = $state<Note | null>(null);
	/** Column under the pointer, for the highlight. `undefined` means none. */
	over = $state<ColumnId | undefined>(undefined);
	/** The column the note started in, so "back where it came from" reads as neutral. */
	from = $state<ColumnId | undefined>(undefined);
	/** Announced to assistive tech — the only feedback for anyone not watching. */
	announcement = $state('');
	/** When the last drop landed, so the card's click handler can ignore it. */
	droppedAt = $state(0);

	/**
	 * Pointer coordinates are plain fields, not `$state`.
	 *
	 * `pointermove` fires faster than the screen refreshes; making these reactive
	 * would re-render the preview on every event and interleave with the cards'
	 * FLIP animations. The preview is moved by writing `transform` directly from
	 * the animation frame instead.
	 */
	#px = 0;
	#py = 0;
	#grabX = 0;
	#grabY = 0;

	#pointer = -1;
	#origin = { x: 0, y: 0 };
	#armed = false;
	#frame = 0;
	#preview: HTMLElement | null = null;
	#target: HTMLElement | null = null;

	#geometry: BoardGeometry = { board: null, row: null, columns: [] };
	#boxes: Box[] = [];
	#boardRect = { top: 0, bottom: 0, left: 0, right: 0 };
	#rowLeft = 0;
	#scrollLeft = 0;
	#cleanup: (() => void)[] = [];
	#announce: (note: Note, column: ColumnId | undefined, phase: DragPhase) => string = () => '';

	/** The element the preview should follow. Set by the board once it renders. */
	attachPreview(element: HTMLElement | null) {
		this.#preview = element;
		this.#place();
	}

	start(
		event: PointerEvent,
		note: Note,
		options: {
			geometry: () => BoardGeometry;
			announce: (note: Note, column: ColumnId | undefined, phase: DragPhase) => string;
		}
	) {
		// One drag at a time: a second finger must not overwrite the first one's
		// state while its listeners are still attached.
		if (this.#pointer !== -1 || !event.isPrimary) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();

		this.#pointer = event.pointerId;
		this.#origin = { x: event.clientX, y: event.clientY };
		this.#px = event.clientX;
		this.#py = event.clientY;
		this.#armed = false;
		this.#announce = options.announce;
		this.#target = event.currentTarget as HTMLElement;
		try {
			this.#target.setPointerCapture(event.pointerId);
		} catch {
			// Throws if the pointer is no longer active — a synthetic event, or one
			// released between dispatch and handling. Without this the press would
			// abort mid-setup and leave the listeners attached and `#pointer` claimed,
			// so no later drag could ever start.
			this.#pointer = -1;
			this.#target = null;
			return;
		}

		const onMove = (move: PointerEvent) => {
			if (move.pointerId !== this.#pointer) return;
			this.#px = move.clientX;
			this.#py = move.clientY;
			if (this.#armed) return;
			const far =
				Math.abs(move.clientX - this.#origin.x) > THRESHOLD ||
				Math.abs(move.clientY - this.#origin.y) > THRESHOLD;
			if (far) this.#arm(note, options.geometry());
		};

		// Escape must be caught before the app's own window handler, which would
		// otherwise also clear the search box or stop dictation on the same key.
		const onKey = (key: KeyboardEvent) => {
			if (key.key !== 'Escape' || !this.#armed) return;
			key.preventDefault();
			key.stopPropagation();
			this.#finish(false);
		};
		const onUp = (up: PointerEvent) => up.pointerId === this.#pointer && this.#finish(true);
		const onLost = (lost: PointerEvent) => lost.pointerId === this.#pointer && this.#finish(false);
		const onCancel = () => this.#finish(false);
		const onContext = (menu: Event) => {
			if (!this.#armed) return;
			menu.preventDefault();
			this.#finish(false);
		};

		const listen = <K extends keyof WindowEventMap>(
			type: K,
			handler: (event: WindowEventMap[K]) => void,
			capture = false
		) => {
			window.addEventListener(type, handler as EventListener, capture);
			this.#cleanup.push(() => window.removeEventListener(type, handler as EventListener, capture));
		};

		listen('pointermove', onMove);
		listen('pointerup', onUp);
		listen('pointercancel', onCancel);
		listen('lostpointercapture', onLost);
		listen('keydown', onKey, true);
		listen('contextmenu', onContext);
		// Alt-tabbing away with the button held would otherwise leave a stuck card.
		listen('blur', onCancel);
		document.addEventListener('visibilitychange', onCancel);
		this.#cleanup.push(() => document.removeEventListener('visibilitychange', onCancel));
	}

	#arm(note: Note, geometry: BoardGeometry) {
		this.#armed = true;
		this.note = note;
		this.#geometry = geometry;
		this.from = note.folderId ?? null;
		this.over = this.from;

		const card = this.#target?.closest('[data-note-card]') as HTMLElement | null;
		const rect = card?.getBoundingClientRect();
		// Hold the card where it was grabbed rather than centring it on the cursor.
		this.#grabX = rect ? this.#px - rect.left : 0;
		this.#grabY = rect ? this.#py - rect.top : 0;

		this.#measure();
		this.announcement = this.#announce(note, this.from, 'lift');
		this.#frame = requestAnimationFrame(this.#tick);
	}

	/**
	 * Column extents in content coordinates, which do not move when the board
	 * scrolls — so they survive auto-scroll without re-measuring every frame.
	 */
	#measure() {
		const { board, row, columns } = this.#geometry;
		if (!board || !row) return;
		this.#rowLeft = row.getBoundingClientRect().left;
		this.#scrollLeft = board.scrollLeft;
		const rect = board.getBoundingClientRect();
		this.#boardRect = {
			top: rect.top,
			bottom: rect.bottom,
			left: rect.left,
			right: rect.right
		};
		this.#boxes = columns.map(({ id, element }) => ({
			id,
			left: element.offsetLeft,
			right: element.offsetLeft + element.offsetWidth
		}));
	}

	/**
	 * One loop for the whole drag: scroll, hit-test, move the preview.
	 *
	 * It has to run continuously rather than off `pointermove`, because a finger
	 * held still inside the edge zone produces no more events — and the board
	 * would stop scrolling exactly when you are asking it to.
	 */
	#tick = () => {
		const { board } = this.#geometry;
		if (board) {
			const dx = edgeVelocity(this.#px, this.#boardRect.left, this.#boardRect.right);
			if (dx) board.scrollLeft += dx;
		}

		const column = this.#geometry.columns.find((entry) => entry.id === this.over);
		if (column?.scroller) {
			const rect = column.scroller.getBoundingClientRect();
			const dy = edgeVelocity(this.#py, rect.top, rect.bottom);
			if (dy) column.scroller.scrollTop += dy;
		}

		// After scrolling, so the highlight is never a frame out of date.
		this.#hit();
		this.#place();
		this.#frame = requestAnimationFrame(this.#tick);
	};

	#hit() {
		const { board } = this.#geometry;
		if (!board) return;
		const inside = this.#py >= this.#boardRect.top && this.#py <= this.#boardRect.bottom;
		if (!inside) {
			this.over = undefined;
			return;
		}
		const contentX = this.#px - this.#rowLeft + (board.scrollLeft - this.#scrollLeft);
		const box = this.#boxes.find((entry) => contentX >= entry.left && contentX < entry.right);
		this.over = box ? box.id : undefined;
	}

	/** `transform`, never `left`/`top` — the latter forces layout every frame. */
	#place() {
		if (!this.#preview) return;
		this.#preview.style.transform = `translate3d(${this.#px - this.#grabX}px, ${this.#py - this.#grabY}px, 0)`;
	}

	#finish(commit: boolean) {
		// `pointerup` and `lostpointercapture` can both arrive.
		if (this.#pointer === -1) return;
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
		for (const off of this.#cleanup) off();
		this.#cleanup = [];
		if (this.#target?.hasPointerCapture(this.#pointer)) {
			this.#target.releasePointerCapture(this.#pointer);
		}

		const dropped = this.over;
		const dragged = this.note;
		const from = this.from;
		const wasArmed = this.#armed;

		this.note = null;
		this.over = undefined;
		this.from = undefined;
		this.#armed = false;
		this.#pointer = -1;
		this.#target = null;
		this.#preview = null;
		if (wasArmed) this.droppedAt = performance.now();

		if (!wasArmed || !dragged) return;

		// Dropping outside every column, or back where it started, changes nothing
		// — and must not *call* `moveNote`, which bumps `updatedAt` and would send
		// the note to the top of its own column for no reason.
		const unchanged = !commit || dropped === undefined || dropped === from;
		if (unchanged) {
			this.announcement = this.#announce(dragged, undefined, 'cancel');
			return;
		}
		// The world can move during a drag: the note may have been trashed by an
		// undo toast, or the target folder deleted from the rail.
		if (!notes.getNote(dragged.id)) {
			this.announcement = this.#announce(dragged, undefined, 'cancel');
			return;
		}
		if (dropped !== null && !notes.folders.some((folder) => folder.id === dropped)) {
			this.announcement = this.#announce(dragged, undefined, 'cancel');
			return;
		}
		notes.moveNote(dragged.id, dropped);
		this.announcement = this.#announce(dragged, dropped, 'drop');
	}

	/** True just after a drop, so the card can swallow the trailing click. */
	justDropped(): boolean {
		return performance.now() - this.droppedAt < CLICK_GUARD_MS;
	}
}
