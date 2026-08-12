import http from 'node:http';
import polka from 'polka';
// Produced by `vite build` via adapter-node.
import { handler } from '../build/handler.js';
import { attachSignaling } from './signaling.js';

/**
 * Production entry.
 *
 * One process serves the prerendered app and the signaling WebSocket. SvelteKit's
 * adapter-node handler cannot own the HTTP server here, because the WebSocket
 * upgrade has to be attached to it — hence polka wrapping the handler rather
 * than `node build`.
 */

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = polka().use(handler);
const server = http.createServer(app.handler);

attachSignaling(server, { path: '/signal' });

server.listen(port, host, () => {
	console.log(`note-speak listening on http://${host}:${port} (signaling at /signal)`);
});
