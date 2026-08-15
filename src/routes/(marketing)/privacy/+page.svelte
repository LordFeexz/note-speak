<script lang="ts">
	import LegalPage from '$lib/marketing/legal-page.svelte';

	const UPDATED = '13 August 2026';
</script>

<svelte:head>
	<title>Privacy Policy — Note Speak</title>
	<meta
		name="description"
		content="What Note Speak does and does not collect. Notes are stored on your device; we operate no database and run no analytics."
	/>
</svelte:head>

<LegalPage
	title="Privacy Policy"
	updated={UPDATED}
	summary="Note Speak has no accounts and no database. This page describes exactly what happens to your data, including the one case where something does leave your device."
>
	<h2>The short version</h2>
	<p>
		Your notes are written to your own browser's storage. We do not receive them, cannot read them,
		and have nothing to hand over if someone asks us for them. There is one exception, described
		under <a href="#dictation">Dictation</a>, and it is the reason this page is worth reading.
	</p>

	<h2>What is stored, and where</h2>
	<table>
		<thead>
			<tr><th>Data</th><th>Where it lives</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>Note text, folders, preferences</td>
				<td>IndexedDB in your browser, on your device. Never transmitted by us.</td>
			</tr>
			<tr>
				<td>Dictation audio</td>
				<td>
					Sent by your browser to its speech provider — see <a href="#dictation">below</a>.
				</td>
			</tr>
			<tr>
				<td>Shared note content</td>
				<td>Sent directly between participants' browsers, encrypted. Not stored by us.</td>
			</tr>
			<tr>
				<td>Connection details while sharing</td>
				<td>Our signalling server briefly sees your IP address and an anonymous room identifier.</td
				>
			</tr>
			<tr>
				<td>Workspace passphrase</td>
				<td>
					Never stored and never transmitted. The key derived from it is kept in IndexedDB on your
					device, so you are not asked for it again — see <a href="#workspaces">below</a>.
				</td>
			</tr>
			<tr>
				<td>Images, video and files you add</td>
				<td>Stored inside the note itself, on your device. Never uploaded anywhere.</td>
			</tr>
			<tr>
				<td>Embedded links (YouTube, Instagram, …)</td>
				<td>Nothing is requested until you press play — see <a href="#embeds">below</a>.</td>
			</tr>
			<tr
				><td>Analytics, cookies, advertising identifiers</td><td>None. We use none of these.</td
				></tr
			>
		</tbody>
	</table>

	<h2 id="dictation">Dictation</h2>
	<p>
		Note Speak uses the speech recognition built into your browser. <strong
			>In most browsers this is a cloud service.</strong
		> Chrome sends audio to Google, and Safari sends audio to Apple, where it is transcribed and returned
		as text. This happens between you and your browser vendor: the audio does not pass through us, we
		never receive it, and we have no control over how they handle it.
	</p>
	<p>
		If that matters to you, do not use the dictation feature — typing sends nothing anywhere. Their
		handling of the audio is governed by their privacy policies, not this one.
	</p>

	<h2 id="embeds">Embedded links</h2>
	<p>
		Pasting a YouTube, Instagram or other link on its own line shows a card. That card is drawn
		entirely on your device from the link's own text — <strong
			>no request is made to YouTube, Meta, or anyone else when you open the note.</strong
		>
	</p>
	<p>
		Pressing play is what changes that: at that point a player loads from that platform, and from
		then on their own privacy policy applies to that connection. YouTube is loaded through
		<code>youtube-nocookie.com</code>, and the player runs sandboxed. If you never press play,
		nothing is ever requested.
	</p>
	<p>
		One detail worth stating plainly: when you press play, the platform is told which
		<em>site</em> the player is embedded on — that is how these players verify they are allowed to run,
		and they refuse to load without it. It is never told which note you are reading, and your note's contents
		are never part of that request.
	</p>
	<p>
		Images, video, audio and files you add are stored as data inside the note itself. They are not
		uploaded to us or to any third-party host, which is also why they are size-limited: the note has
		to carry them.
	</p>

	<h2>Shared notes</h2>
	<p>
		When you share a note, its content is encrypted on your device and sent directly to the other
		participants' browsers. The encryption key is placed in the part of the link after the
		<code>#</code> symbol, which browsers never transmit to a server. We therefore cannot decrypt a shared
		note even in principle.
	</p>
	<p>Two consequences you should know about:</p>
	<ul>
		<li>
			<strong>Anyone holding the link has the access it grants</strong>, and can pass it on.
			Reissuing the links revokes everyone at once; there is no way to revoke one person.
		</li>
		<li>
			<strong>Peer-to-peer connections reveal IP addresses to the other participants.</strong> This is
			inherent to how direct browser-to-browser connections work, not something specific to this app.
		</li>
	</ul>
	<p>
		Our signalling server exists only to introduce two browsers to each other. It sees the
		connecting IP address, an anonymous room identifier, and the timing of connections. It does not
		see, log, or store note content.
	</p>

	<h2 id="workspaces">Workspaces</h2>
	<p>
		A workspace is a shared note list. Everything in it is derived from a passphrase you choose: the
		encryption key, the signing key, and even the identifier of the room the members meet in. That
		last part matters — because the room is derived from the secret, an invite link on its own
		carries no identifier, joins nothing, and tells our signalling server nothing about which
		workspace anyone was invited to. It contains a random salt and the name you typed, and nothing
		else.
	</p>
	<p>
		The passphrase itself is never stored and never transmitted. The key derived from it is kept in
		your browser's storage so you are not asked for it on every launch — which means it sits on your
		device with the same protection as the notes themselves. Anyone with access to your unlocked
		device has access to your workspaces.
	</p>
	<p>Three consequences worth stating plainly:</p>
	<ul>
		<li>
			<strong>Everyone with the passphrase can edit everything</strong> in the workspace. There are no
			roles or permissions, because with no server there is nothing that could enforce them. To share
			something without granting edits, use a per-note view link instead.
		</li>
		<li>
			<strong>We cannot reset a passphrase.</strong> We do not know it, do not know the workspace exists,
			and hold nothing to reset it against. If every member forgets it, the workspace is gone.
		</li>
		<li>
			<strong>A workspace note is reachable while a member who has it is online.</strong> Nothing is stored
			on a server, so if everyone is offline, the notes you have not already opened cannot be fetched.
			Notes you have opened remain on your device and work offline.
		</li>
	</ul>

	<h2>Things we cannot do for you</h2>
	<ul>
		<li>
			<strong>We cannot recover your notes.</strong> There is no server copy. Clearing your browser's
			site data, or uninstalling, deletes them permanently. Use Backup &amp; Restore in the app to keep
			your own copy.
		</li>
		<li>
			<strong>We cannot delete a note from someone else's device.</strong> Once a person has opened a
			shared note, their browser holds a copy. Stopping sharing prevents future access; it does not reach
			backwards.
		</li>
	</ul>

	<h2>Children</h2>
	<p>
		Note Speak is not directed at children under 13, and we knowingly collect no personal
		information from anyone, of any age.
	</p>

	<h2>Changes</h2>
	<p>
		If this policy changes in a way that affects how your data is handled, the date at the top of
		this page will change and the update will be described here.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about this policy can be sent to
		<a href="mailto:privacy@example.com">privacy@example.com</a>.
	</p>
</LegalPage>
