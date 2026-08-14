<script module lang="ts">
	/**
	 * A picture of each block, as static markup.
	 *
	 * These reproduce what the editor renders, wrapped by `block-example.svelte`
	 * in the same `.note-prose` container the real ProseMirror surface uses — so
	 * headings, lists and tables get exactly the editor's typography, and the
	 * `.note-*` classes do the rest.
	 *
	 * Hand-written markup pretending to be editor output can drift, so the
	 * `docs-fidelity` suite renders every documented snippet through a real
	 * editor and compares the DOM against these. If one of them starts lying, the
	 * suite fails rather than the reader finding out.
	 *
	 * Media previews use placeholder sources on purpose: a docs page should not
	 * ship a megabyte of base64 to illustrate that base64 is what gets stored.
	 *
	 * Exported from the module script so the blocks page can pair them with the
	 * editor's registry by id. None of them reference component state, which is
	 * what makes a top-level snippet exportable.
	 */
	export {
		paragraph,
		heading1,
		heading2,
		heading3,
		bulletList,
		orderedList,
		taskList,
		blockquote,
		codeBlock,
		table,
		image,
		voice,
		video,
		audio,
		file,
		embed,
		calloutNote,
		calloutWarning,
		calloutTip,
		toggle,
		columns,
		mermaid,
		math,
		horizontalRule
	};
</script>

{#snippet paragraph()}
	<p>Just type. A blank line starts a new paragraph.</p>
{/snippet}

{#snippet heading1()}
	<h1>Trip planning</h1>
{/snippet}

{#snippet heading2()}
	<h2>Flights</h2>
{/snippet}

{#snippet heading3()}
	<h3>Return leg</h3>
{/snippet}

{#snippet bulletList()}
	<ul data-tight="true">
		<li><p>Passport</p></li>
		<li><p>Charger</p></li>
		<li><p>Tickets</p></li>
	</ul>
{/snippet}

{#snippet orderedList()}
	<ol data-tight="true">
		<li><p>Book the flight</p></li>
		<li><p>Reserve a room</p></li>
		<li><p>Pack</p></li>
	</ol>
{/snippet}

<!--
	The checkbox label carries hidden text in the editor, added by Tiptap's node
	view. `sr-only` rather than the editor's inline style, so it is hidden the way
	the rest of this codebase hides things — the fidelity check ignores `class` and
	`style`, so the comparison is unaffected either way.
-->
{#snippet taskList()}
	<ul data-type="taskList">
		<li data-checked="false">
			<label
				><input type="checkbox" /><span class="sr-only"
					>Task item checkbox for Pack the charger</span
				></label
			>
			<div><p>Pack the charger</p></div>
		</li>
		<li data-checked="true">
			<label
				><input type="checkbox" checked /><span>Task item checkbox for Print the tickets</span
				></label
			>
			<div><p>Print the tickets</p></div>
		</li>
	</ul>
{/snippet}

{#snippet blockquote()}
	<blockquote><p>The best time to plant a tree was twenty years ago.</p></blockquote>
{/snippet}

{#snippet codeBlock()}
	<pre><code class="language-js">const total = items.length;</code></pre>
{/snippet}

{#snippet table()}
	<div class="tableWrapper">
		<table>
			<tbody>
				<tr><th><p>Item</p></th><th><p>Cost</p></th></tr>
				<tr><td><p>Flight</p></td><td><p>320</p></td></tr>
				<tr><td><p>Hotel</p></td><td><p>180</p></td></tr>
			</tbody>
		</table>
	</div>
{/snippet}

{#snippet image()}
	<!-- A 1×1 placeholder: the point is the frame, not the photograph. -->
	<img
		src="data:image/gif;base64,R0lGODlhAQABAIAAAMzMzP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
		alt="beach.jpg"
	/>
{/snippet}

{#snippet voice()}
	<div class="note-voice" data-voice="" data-duration="0:12">
		<audio class="note-voice__audio" controls></audio>
		<p class="note-voice__transcript">Pick up the dry cleaning, then call mum.</p>
	</div>
{/snippet}

{#snippet video()}
	<video class="note-video" data-directive="video" data-name="holiday.mp4" controls></video>
{/snippet}

{#snippet audio()}
	<audio class="note-audio" data-directive="audio" data-name="riff.mp3" controls></audio>
{/snippet}

{#snippet file()}
	<!--
		No href: this is a picture of a download link, not one. The tag stays an
		`<a>` so the fidelity check can compare it against what the editor renders,
		and the whole preview is `inert`, so nothing here is reachable anyway.
	-->
	<!-- svelte-ignore a11y_missing_attribute -->
	<a
		class="note-file"
		data-directive="file"
		data-name="itinerary.pdf"
		data-size="1.2 MB"
		download="itinerary.pdf">itinerary.pdf · 1.2 MB</a
	>
{/snippet}

{#snippet embed()}
	<div
		class="note-embed"
		data-embed="youtube"
		data-href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
		data-playable="true"
	>
		<span class="note-embed__provider">YouTube</span>
		<!-- svelte-ignore a11y_missing_attribute -->
		<a class="note-embed__link" rel="noopener noreferrer nofollow" target="_blank"
			>https://www.youtube.com/watch?v=dQw4w9WgXcQ</a
		>
		<span class="note-embed__hint">Click to play — loads from YouTube</span>
	</div>
{/snippet}

{#snippet calloutNote()}
	<div class="note-callout" data-directive="callout" data-type="note">
		<p>Check the visa rules before booking.</p>
	</div>
{/snippet}

{#snippet calloutWarning()}
	<div class="note-callout" data-directive="callout" data-type="warning">
		<p>The passport must be valid for six more months.</p>
	</div>
{/snippet}

{#snippet calloutTip()}
	<div class="note-callout" data-directive="callout" data-type="tip">
		<p>Booking on a Tuesday is usually cheaper.</p>
	</div>
{/snippet}

{#snippet toggle()}
	<div class="note-toggle" data-directive="toggle" data-open="true" data-summary="Packing list">
		<p>Passport, charger, adapter.</p>
	</div>
{/snippet}

{#snippet columns()}
	<div class="note-columns" data-directive="columns">
		<div class="note-column" data-directive="column"><p>Outbound</p></div>
		<div class="note-column" data-directive="column"><p>Return</p></div>
	</div>
{/snippet}

{#snippet mermaid()}
	<pre><code class="language-mermaid"
			>flowchart TD
  A[Start] --&gt; B[Finish]</code
		></pre>
	<!--
		An illustration, not a real render. Mermaid draws the diagram as a
		ProseMirror decoration after the code block, from a library this page
		deliberately does not load.
	-->
	<div class="note-render" data-state="ok">
		<svg viewBox="0 0 220 44" role="img" aria-label="Start arrow Finish" style="max-width: 220px">
			<rect x="1" y="8" width="86" height="28" rx="4" fill="none" stroke="currentColor" />
			<text x="44" y="26" text-anchor="middle" font-size="11" fill="currentColor">Start</text>
			<line x1="88" y1="22" x2="128" y2="22" stroke="currentColor" />
			<polygon points="128,22 121,18 121,26" fill="currentColor" />
			<rect x="130" y="8" width="88" height="28" rx="4" fill="none" stroke="currentColor" />
			<text x="174" y="26" text-anchor="middle" font-size="11" fill="currentColor">Finish</text>
		</svg>
	</div>
{/snippet}

{#snippet math()}
	<div class="note-math" data-math="">e = mc^2</div>
	<div class="note-render" data-state="ok">
		<span style="font-family: 'Times New Roman', serif; font-size: 1.25rem; font-style: italic;">
			e = mc<sup>2</sup>
		</span>
	</div>
{/snippet}

{#snippet horizontalRule()}
	<hr />
{/snippet}
