/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] };

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { get } from 'idb-keyval';

// --- Workbox Setup ---
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Cache renderers (Mermaid, KaTeX)
registerRoute(
    /\/_app\/immutable\/.*\.(?:js|css)$/,
    new CacheFirst({
        cacheName: 'note-speak-renderers',
        plugins: [
            new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 90 })
        ]
    })
);

// Fallback for navigation routes
registerRoute(
    new NavigationRoute(
        new NetworkFirst({
            cacheName: 'note-speak-pages',
        }),
        {
            allowlist: [/^\/app/],
            denylist: [/^\/signal/]
        }
    )
);

// --- Push Sync Handler ---
self.addEventListener('push', (event) => {
    const data = event.data?.json();
    if (data?.type !== 'sync-request' || !data.topic) return;

    event.waitUntil(
        (async () => {
            // 1. Read the signed log from IndexedDB
            const logKey = `note-speak:sharelog:${data.topic}`;
            const entries = await get(logKey);
            
            if (!entries?.length) {
                // We don't have this note's data — nothing to relay
                return;
            }

            // 2. Push entries to the relay buffer via WebSocket
            const protocol = self.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${protocol}//${self.location.host}/signal`;
            
            await new Promise<void>((resolve) => {
                const ws = new WebSocket(url);
                const timeout = setTimeout(() => { ws.close(); resolve(); }, 10_000);
                
                ws.onopen = () => {
                    // Subscribe first
                    ws.send(JSON.stringify({ type: 'subscribe', topic: data.topic }));
                    // Push the entries to the relay buffer
                    ws.send(JSON.stringify({ 
                        type: 'relay-push', 
                        topic: data.topic, 
                        entries 
                    }));
                    clearTimeout(timeout);
                    // Give the server a moment to process, then close
                    setTimeout(() => { ws.close(); resolve(); }, 500);
                };
                
                ws.onerror = () => { clearTimeout(timeout); resolve(); };
            });

            // 3. Show minimal notification
            await self.registration.showNotification('Note Speak', {
                body: 'Syncing workspace notes…',
                tag: 'note-speak-sync',
                silent: true,
                icon: '/icon-192.png'
            });
        })()
    );
});

self.addEventListener('notificationclick', (event) => {
    if (event.notification.tag === 'note-speak-sync') {
        event.notification.close();
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(windowClients => {
                // Focus existing window if present
                for (const client of windowClients) {
                    if (client.url.includes('/app') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/app');
                }
            })
        );
    }
});
