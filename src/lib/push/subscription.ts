import { signalingUrl } from '$lib/share/session';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

// Base64URL to Uint8Array for the Push API
function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export async function subscribeToPush(topics: string[]): Promise<void> {
	if (typeof window === 'undefined' || !('PushManager' in window) || !('serviceWorker' in navigator)) return;

	try {
		const reg = await navigator.serviceWorker.ready;
		let sub = await reg.pushManager.getSubscription();

		if (!sub) {
			sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
			});
		}

		// Register this subscription for each topic via the signaling WebSocket
		const ws = new WebSocket(signalingUrl());

		ws.onopen = () => {
			for (const topic of topics) {
				ws.send(
					JSON.stringify({
						type: 'push-subscribe',
						topic,
						subscription: sub!.toJSON()
					})
				);
			}
			setTimeout(() => ws.close(), 1000);
		};
	} catch (err) {
		console.warn('Failed to subscribe to push notifications:', err);
	}
}
