/**
 * Has the microphone already been granted on this device?
 *
 * One definition, because two call sites need it and they must agree on what
 * "unknown" means: the app-shell's launch handler, deciding whether it may start
 * dictation without a gesture, and the editor, deciding whether to show the
 * pre-permission explainer.
 *
 * `false` on anything other than a definite grant. The `microphone` descriptor
 * is not implemented everywhere — Firefox and Safari throw or return nothing —
 * and both callers want the cautious branch when they cannot tell: ask for a
 * gesture, and explain before prompting. Treating "unknown" as granted would
 * skip the explainer for exactly the browsers whose behaviour most needs it.
 */
export async function micPermissionGranted(): Promise<boolean> {
	try {
		const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
		return status?.state === 'granted';
	} catch {
		return false;
	}
}
