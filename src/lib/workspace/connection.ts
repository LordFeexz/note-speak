import { workspaces } from './store.svelte';

/**
 * How a workspace's connection should be shown.
 *
 * Two places display this — the folder rail's dot and the list pane's chip —
 * and they must never disagree about what colour means what. The words stay in
 * each component's own `Dict`, following the pattern everywhere else in the app;
 * only the state and its presentation live here.
 *
 * Three states rather than the two the rail used to have. Collapsing
 * `connecting` into `waiting` made the first few seconds after joining — the
 * moment someone is most likely to think the app is broken — look identical to
 * "nobody else is here", and those mean opposite things: one resolves itself.
 *
 * What this deliberately cannot tell you is *why* nobody is there. An empty
 * workspace and a mistyped passphrase are indistinguishable without a server,
 * which the workspace pane already says in words. This only answers the other
 * question: whether the app is working at all.
 */
export type ConnectionKey = 'connecting' | 'waiting' | 'connected';

export type Connection = {
	key: ConnectionKey;
	/** Tailwind background for the dot. */
	tone: string;
	/** Only `connecting` pulses — a steady state that blinks reads as an alarm. */
	pulse: boolean;
	/** Members reachable right now, including you. */
	reachable: number;
};

export function connectionOf(workspaceId: string): Connection {
	const status = workspaces.status[workspaceId];
	const reachable = (workspaces.peers[workspaceId] ?? 0) + 1;
	if (status === 'connected')
		return { key: 'connected', tone: 'bg-emerald-500', pulse: false, reachable };
	if (status === 'waiting')
		return { key: 'waiting', tone: 'bg-muted-foreground/40', pulse: false, reachable };
	return { key: 'connecting', tone: 'bg-amber-500', pulse: true, reachable };
}

/** The words for each state. Supplied by the caller, whose `Dict` owns the copy. */
export type ConnectionWords = {
	membersOnline: (n: number) => string;
	noneOnline: string;
	connecting: string;
};

/**
 * A ready-to-render chip: state, colour and words together.
 *
 * The mapping lives here rather than being rewritten in each component. Two
 * copies of "which key gets which sentence" is exactly the drift this module
 * exists to prevent — a fourth state would otherwise mean remembering to edit
 * both call sites.
 */
export function connectionChip(workspaceId: string, words: ConnectionWords) {
	const state = connectionOf(workspaceId);
	const text =
		state.key === 'connected'
			? words.membersOnline(state.reachable)
			: state.key === 'waiting'
				? words.noneOnline
				: words.connecting;
	return { key: state.key, tone: state.tone, pulse: state.pulse, text };
}
