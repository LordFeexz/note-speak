/**
 * Keeps `--app-height` in sync with the *visual* viewport.
 *
 * On phones the on-screen keyboard covers the layout viewport rather than shrinking
 * it, so a `100dvh` app has its footer — and therefore the dictate button — hidden
 * behind the keyboard. `visualViewport.height` is the only figure that accounts for
 * the keyboard, and it works on iOS Safari where `interactive-widget` does not.
 *
 * Returns a cleanup function.
 */
export function trackViewportHeight(): () => void {
	const root = document.documentElement;
	const vv = window.visualViewport;

	const apply = () => {
		const height = vv?.height ?? window.innerHeight;
		root.style.setProperty('--app-height', `${Math.round(height)}px`);
		// iOS scrolls the *page* to reveal the focused field, pushing the app's own
		// header off-screen. The app never scrolls as a whole, so undo that.
		root.style.setProperty('--app-offset', `${Math.round(vv?.offsetTop ?? 0)}px`);
	};

	apply();
	vv?.addEventListener('resize', apply);
	vv?.addEventListener('scroll', apply);
	window.addEventListener('orientationchange', apply);

	return () => {
		vv?.removeEventListener('resize', apply);
		vv?.removeEventListener('scroll', apply);
		window.removeEventListener('orientationchange', apply);
		root.style.removeProperty('--app-height');
		root.style.removeProperty('--app-offset');
	};
}
