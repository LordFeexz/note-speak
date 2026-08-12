import { WebSocketServer } from 'ws';

/**
 * Signaling gateway.
 *
 * Introduces peers and relays their WebRTC handshakes. It never sees note
 * content: payloads are end-to-end encrypted with a key that lives in the URL
 * fragment, which browsers do not transmit. Nothing is written to disk, and
 * subscriptions vanish when a socket closes.
 *
 * Topics are opaque share ids, so even the routing table reveals nothing beyond
 * "these sockets are talking to each other".
 */

/** A room bigger than this is not a note being edited; it is abuse. */
const MAX_PEERS_PER_TOPIC = 24;
/** Handshake frames are small. Anything larger is not signaling. */
const MAX_MESSAGE_BYTES = 32 * 1024;
/** Per-connection frame budget, refilled every window. */
const RATE_LIMIT = 240;
const RATE_WINDOW_MS = 10_000;
/** Drop sockets that stop answering pings — WebRTC peers must not linger. */
const HEARTBEAT_MS = 30_000;

/**
 * @param {import('node:http').Server} server
 * @param {{ path?: string }} [options]
 */
export function attachSignaling(server, { path = '/signal' } = {}) {
	const wss = new WebSocketServer({ noServer: true });
	/** @type {Map<string, Set<import('ws').WebSocket>>} */
	const topics = new Map();

	server.on(
		'upgrade',
		(/** @type {any} */ request, /** @type {any} */ socket, /** @type {any} */ head) => {
			let pathname;
			try {
				pathname = new URL(request.url, 'http://localhost').pathname;
			} catch {
				return socket.destroy();
			}
			if (pathname !== path) return; // Leave other upgrades (HMR) alone.
			wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
		}
	);

	wss.on('connection', (ws) => {
		/** @type {Set<string>} */
		const subscribed = new Set();
		let budget = RATE_LIMIT;
		let alive = true;
		/** @type {string | null} */
		let peerId = null;

		const refill = setInterval(() => (budget = RATE_LIMIT), RATE_WINDOW_MS);
		const heartbeat = setInterval(() => {
			if (!alive) return ws.terminate();
			alive = false;
			ws.ping();
		}, HEARTBEAT_MS);

		ws.on('pong', () => (alive = true));

		ws.on('message', (raw) => {
			const text = raw.toString();
			if (text.length > MAX_MESSAGE_BYTES) return;
			if (budget-- <= 0) return;

			let message;
			try {
				message = JSON.parse(text);
			} catch {
				return;
			}
			const topic = message?.topic;
			if (typeof topic !== 'string' || topic.length > 64) return;

			if (message.type === 'subscribe') {
				let peers = topics.get(topic);
				if (!peers) topics.set(topic, (peers = new Set()));
				if (peers.size >= MAX_PEERS_PER_TOPIC) {
					ws.send(JSON.stringify({ type: 'full', topic }));
					return;
				}
				peers.add(ws);
				subscribed.add(topic);
				// Remembered only so the room can be told *which* peer left; it is a
				// client-chosen random id, not an identity.
				if (typeof message.from === 'string') peerId = message.from;
				return;
			}

			// Everything else is relayed verbatim to the rest of the room. The
			// gateway does not inspect or rewrite payloads — it cannot read them.
			if (!subscribed.has(topic)) return;
			const peers = topics.get(topic);
			if (!peers) return;
			const payload = text;
			for (const peer of peers) {
				if (peer !== ws && peer.readyState === peer.OPEN) peer.send(payload);
			}
		});

		const cleanup = () => {
			clearInterval(refill);
			clearInterval(heartbeat);
			for (const topic of subscribed) {
				const peers = topics.get(topic);
				if (!peers) continue;
				peers.delete(ws);
				// Tell the room, so cursors and peer counts drop promptly.
				for (const peer of peers) {
					if (peer.readyState === peer.OPEN) {
						peer.send(JSON.stringify({ type: 'leave', topic, from: peerId }));
					}
				}
				if (peers.size === 0) topics.delete(topic);
			}
			subscribed.clear();
		};

		ws.on('close', cleanup);
		ws.on('error', cleanup);
	});

	return wss;
}
