/**
 * Diagram and formula rendering, loaded only when a note needs it.
 *
 * Both libraries are large — mermaid alone is bigger than the rest of the app —
 * so they are dynamically imported, which keeps them out of the initial parse
 * for the great majority of notes that contain neither.
 *
 * They are **not** kept out of the service worker's precache. Three ways to
 * exclude them were tried and none works with SvelteKit's opaque chunk names;
 * `vite.config.ts` records the attempts. So they are downloaded at install time
 * and *do* work offline — the "needs to load online once" strings below are a
 * fallback for a render that fails while offline, not the normal case.
 */

type MermaidApi = {
	initialize: (config: Record<string, unknown>) => void;
	render: (id: string, text: string) => Promise<{ svg: string }>;
};

let mermaidLoad: Promise<MermaidApi> | null = null;
let katexLoad: Promise<typeof import('katex')> | null = null;
let counter = 0;

function prefersDark(): boolean {
	return document.documentElement.classList.contains('dark');
}

async function loadMermaid(): Promise<MermaidApi> {
	if (!mermaidLoad) {
		mermaidLoad = import('mermaid').then((module) => {
			const api = (module.default ?? module) as unknown as MermaidApi;
			api.initialize({
				startOnLoad: false,
				theme: prefersDark() ? 'dark' : 'default',
				// mermaid's own sanitiser, on top of us never using innerHTML with the
				// raw source. Diagram text in a *shared* note comes from a peer.
				securityLevel: 'strict',
				fontFamily: 'inherit'
			});
			return api;
		});
	}
	return mermaidLoad;
}

export type RenderResult = { ok: true; html: string } | { ok: false; message: string };

/** Render mermaid source to SVG. Never throws: a typo is normal, not an error. */
export async function renderMermaid(source: string): Promise<RenderResult> {
	if (!source.trim()) return { ok: false, message: 'Empty diagram.' };
	try {
		const mermaid = await loadMermaid();
		const { svg } = await mermaid.render(`mmd-${++counter}`, source);
		return { ok: true, html: svg };
	} catch (error) {
		return {
			ok: false,
			message: navigator.onLine
				? // mermaid's parse errors name the offending line, which is worth showing.
					`Diagram error: ${error instanceof Error ? error.message.split('\n')[0] : 'could not parse'}`
				: "Diagrams need to load once online before they'll work offline."
		};
	}
}

/** Render a TeX expression. `display` picks block vs inline layout. */
export async function renderMath(source: string, display: boolean): Promise<RenderResult> {
	if (!source.trim()) return { ok: false, message: 'Empty formula.' };
	try {
		if (!katexLoad) {
			// The stylesheet ships with the library and is required for layout.
			katexLoad = Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(
				([module]) => module
			);
		}
		const katex = await katexLoad;
		const render = (katex.default ?? katex).renderToString;
		return { ok: true, html: render(source, { displayMode: display, throwOnError: true }) };
	} catch (error) {
		return {
			ok: false,
			message: navigator.onLine
				? `Formula error: ${error instanceof Error ? error.message.split('\n')[0] : 'could not parse'}`
				: "Formulas need to load once online before they'll work offline."
		};
	}
}
