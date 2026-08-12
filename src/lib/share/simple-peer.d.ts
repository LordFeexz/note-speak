/**
 * Minimal typings for `@thaunknown/simple-peer`, which ships none.
 *
 * Only the surface the provider actually uses is declared, so a change in how we
 * drive it surfaces as a type error rather than silently becoming `any`.
 */
declare module '@thaunknown/simple-peer' {
	namespace Peer {
		type SignalData = unknown;

		interface Options {
			initiator?: boolean;
			trickle?: boolean;
			config?: RTCConfiguration;
			channelName?: string;
		}

		interface Instance {
			readonly connected: boolean;
			signal(data: SignalData): void;
			send(data: string | Uint8Array | ArrayBuffer): void;
			destroy(error?: Error): void;
			on(event: 'signal', listener: (data: SignalData) => void): this;
			on(event: 'connect' | 'close', listener: () => void): this;
			on(event: 'data', listener: (chunk: Uint8Array) => void): this;
			on(event: 'error', listener: (error: Error) => void): this;
		}
	}

	class Peer implements Peer.Instance {
		constructor(options?: Peer.Options);
		readonly connected: boolean;
		signal(data: Peer.SignalData): void;
		send(data: string | Uint8Array | ArrayBuffer): void;
		destroy(error?: Error): void;
		on(event: 'signal', listener: (data: Peer.SignalData) => void): this;
		on(event: 'connect' | 'close', listener: () => void): this;
		on(event: 'data', listener: (chunk: Uint8Array) => void): this;
		on(event: 'error', listener: (error: Error) => void): this;
	}

	export = Peer;
}
