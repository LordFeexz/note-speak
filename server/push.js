import webpush from 'web-push';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const VAPID_PUBLIC = process.env.PUBLIC_VAPID_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('Push sync disabled: VAPID keys not found in .env');
} else {
    webpush.setVapidDetails('mailto:admin@notespeak.app', VAPID_PUBLIC, VAPID_PRIVATE);
}

// In-memory subscription store (per topic)
// Map<topic, Set<string>> (storing JSON stringified subscriptions)
const subscriptions = new Map();

export function registerSubscription(topic, subscription) {
    let subs = subscriptions.get(topic);
    if (!subs) {
        subs = new Set();
        subscriptions.set(topic, subs);
    }
    subs.add(JSON.stringify(subscription));
}

export function unregisterSubscription(topic, subscription) {
    const subs = subscriptions.get(topic);
    if (subs) {
        subs.delete(JSON.stringify(subscription));
    }
}

/** Wake all registered devices for a topic */
export async function wakeSubscribers(topic) {
    if (!VAPID_PUBLIC) return; // Push disabled
    
    const subs = subscriptions.get(topic);
    if (!subs || subs.size === 0) return;
    
    const payload = JSON.stringify({ type: 'sync-request', topic });
    const stale = [];
    
    for (const raw of subs) {
        try {
            await webpush.sendNotification(JSON.parse(raw), payload);
        } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                stale.push(raw); // Subscription expired
            } else {
                console.error('Push error:', err);
            }
        }
    }
    
    // Clean up expired subscriptions
    for (const raw of stale) {
        subs.delete(raw);
    }
}
