<script lang="ts">
	import { resolve } from '$app/paths';
	import LegalPage from '$lib/marketing/legal-page.svelte';

	const UPDATED = '12 August 2026';
</script>

<svelte:head>
	<title>Terms of Use — Note Speak</title>
	<meta
		name="description"
		content="The terms covering use of Note Speak, including the non-commercial licence and the limits of what the app can guarantee about your data."
	/>
</svelte:head>

<LegalPage
	title="Terms of Use"
	updated={UPDATED}
	summary="Note Speak is provided free, for personal and non-commercial use, with no warranty. The most important term is the one about data loss — please read it."
>
	<h2>Using Note Speak</h2>
	<p>
		Note Speak is licensed for personal, non-commercial use under the licence included with the
		software. Commercial use requires separate permission. Using the app means accepting these
		terms; if you do not accept them, do not use it.
	</p>

	<h2 id="data-loss">Your data is your responsibility</h2>
	<p>
		This is the term that matters most, because it follows directly from how the app is built.
		<strong>There is no copy of your notes on any server.</strong> Notes exist only in your browser's
		storage. They can be lost by clearing site data, using private browsing, browser storage eviction
		under disk pressure, uninstalling, or losing the device.
	</p>
	<p>
		<strong
			>We accept no liability for lost, corrupted, or unrecoverable notes, and we cannot restore
			them.</strong
		>
		Export a backup regularly using Backup &amp; Restore. Do not use Note Speak as the only copy of anything
		you cannot afford to lose.
	</p>

	<h2>Sharing</h2>
	<p>
		You are responsible for what you share and who you send links to. Anyone holding a share link
		has the access that link grants and can pass it on to others. A “view only” link is enforced by
		every participant's device rejecting unsigned changes, but it does not prevent someone from
		reading, copying, or keeping the content they can already see.
	</p>
	<p>
		Do not use the sharing feature to distribute unlawful material, or content you do not have the
		right to share. We operate a signalling service that introduces browsers to one another; we do
		not host, monitor, or moderate shared content, and cannot remove it from anyone's device.
	</p>

	<h2>Service availability</h2>
	<p>
		The app itself works offline once installed and does not depend on us being online. The
		signalling service used for sharing is provided as-is, with no uptime commitment, and may be
		changed or withdrawn.
	</p>

	<h2>No warranty</h2>
	<p>
		Note Speak is provided “as is”, without warranty of any kind, express or implied, including
		merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent
		permitted by law, we are not liable for any damages arising from use of the app, including loss
		of data, profits, or business.
	</p>
	<p>
		Some jurisdictions do not allow certain exclusions, so parts of this section may not apply to
		you.
	</p>

	<h2>Third-party speech services</h2>
	<p>
		Dictation uses the speech recognition built into your browser, which in most browsers is a cloud
		service operated by the browser vendor. Your use of it is governed by their terms, not ours. See
		the <a href={resolve('/privacy')}>Privacy Policy</a> for details.
	</p>

	<h2>Changes</h2>
	<p>
		These terms may change. The date at the top of this page shows when they last did. Continuing to
		use the app after a change means accepting the updated terms.
	</p>

	<h2>Governing law</h2>
	<p>
		These terms are governed by the laws of <em>[jurisdiction to be specified]</em>, without regard
		to conflict-of-law rules.
	</p>

	<h2>Contact</h2>
	<p>Questions can be sent to <a href="mailto:legal@example.com">legal@example.com</a>.</p>
</LegalPage>
