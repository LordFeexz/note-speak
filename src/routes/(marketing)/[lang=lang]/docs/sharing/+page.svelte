<script lang="ts">
	import { page } from '$app/state';
	import DocsPage from '$lib/docs/docs-page.svelte';
	import DocsSection from '$lib/docs/docs-section.svelte';
	import type { Lang } from '$lib/i18n/lang';
	import type { Dict } from '$lib/i18n/dict';

	const lang = $derived(page.params.lang as Lang);

	const DICT: Dict<{
		oneLede: string;
		oneSteps: string[];
		rolesLede: string;
		roles: { title: string; body: string }[];
		rolesNote: string;
		workspacesLede: string;
		workspacesBody: string[];
		workspacesRole: string;
		joiningLede: string;
		joiningSteps: string[];
		joiningNote: string;
		availabilityLede: string;
		availabilityBody: string[];
		limitsLede: string;
		limits: { title: string; body: string }[];
	}> = {
		en: {
			oneLede: 'One note, one link, no account at either end.',
			oneSteps: [
				'Open the note and press the share icon in its header.',
				'Press Start sharing. Two links are made at once: one that can edit, one that can only read.',
				'Copy whichever you mean to send. The note stays yours; sharing does not move it anywhere.',
				'Everyone with the note open sees each other’s cursors and edits as they happen.'
			],
			rolesLede: 'The two links differ in what the other person’s device is allowed to do.',
			roles: [
				{
					title: 'Can edit',
					body: 'Carries the key that signs changes. Anyone using it can write, and everyone else’s device accepts what they write.'
				},
				{
					title: 'View only',
					body: 'Carries the key that reads, and the public half of the signing key. A viewer can change their own copy on screen, but cannot produce a change any other device will accept — the read-only editor is the polite version of a rule that is enforced underneath.'
				}
			],
			rolesNote:
				'Both keys travel in the part of the link after the # — the part browsers never send to a server. That is why the note can be encrypted end to end while our signalling service sees nothing but a random room name.',
			workspacesLede:
				'A workspace is a shared note list, unlocked by a passphrase rather than by a link per note.',
			workspacesBody: [
				'Create one from the Workspaces section of the sidebar. Choose a name and a passphrase of at least twelve characters — four or five unrelated words works well.',
				'Add notes to it from a note’s ⋯ menu, or simply create a note while the workspace is selected. Everything in the list syncs to every member.',
				'The passphrase is never stored and never sent. Everything is derived from it, including the name of the room the members meet in — so the invite link on its own carries no identifier at all.'
			],
			workspacesRole:
				'Everyone with the passphrase can edit everything. There are no roles, because with no server there is nothing that could enforce one. To share something without granting edits, use a per-note view-only link instead.',
			joiningLede: 'Two things travel separately, on purpose.',
			joiningSteps: [
				'Copy the invite link from the workspace’s ⋯ menu and send it however you like.',
				'Send the passphrase some other way — a different app, or out loud. A link on its own joins nothing.',
				'The person opens the link, types the passphrase, and their device derives the same keys yours did.'
			],
			joiningNote:
				'If a passphrase is mistyped, the app cannot say so: a wrong passphrase produces a perfectly valid room that simply has nobody in it. The waiting message says both things, because from that side they are genuinely indistinguishable.',
			availabilityLede: 'This is the part worth understanding before you rely on it.',
			availabilityBody: [
				'Nothing is stored on a server, so a note exists only on the devices of people who have it. Someone opening a link sees the note when you — or anyone else who already has it — is online.',
				'Every member who opens a workspace note keeps a copy, so the more members there are, the more devices can answer. A six-person workspace has six.',
				'Anything you have already opened stays available offline, permanently, because it is on your device.'
			],
			limitsLede: 'None of these are oversights; they follow from having no server.',
			limits: [
				{
					title: 'You cannot revoke one person',
					body: 'A link is the credential, and it can be forwarded. Reissuing the links cuts everyone off at once, and you then send the new ones to the people you still want.'
				},
				{
					title: 'You cannot delete someone else’s copy',
					body: 'Once a note has been opened on another device, that device has it. Stopping sharing prevents future access; it does not reach backwards.'
				},
				{
					title: 'A lost passphrase is final',
					body: 'We do not know it, do not know the workspace exists, and hold nothing to reset it against. If every member forgets it, the workspace is gone.'
				},
				{
					title: 'The other participants see your IP address',
					body: 'Devices connect directly to each other, which is what a direct connection means. It is inherent to peer-to-peer, not specific to this app.'
				}
			]
		},
		id: {
			oneLede: 'Satu catatan, satu tautan, tanpa akun di kedua sisi.',
			oneSteps: [
				'Buka catatannya lalu tekan ikon berbagi di bagian atasnya.',
				'Tekan Mulai berbagi. Dua tautan dibuat sekaligus: satu yang bisa menyunting, satu yang hanya bisa membaca.',
				'Salin yang sesuai maksud Anda. Catatannya tetap milik Anda; berbagi tidak memindahkannya ke mana pun.',
				'Semua orang yang membuka catatannya melihat kursor dan suntingan satu sama lain secara langsung.'
			],
			rolesLede: 'Kedua tautan berbeda dalam hal apa yang boleh dilakukan perangkat orang lain.',
			roles: [
				{
					title: 'Bisa menyunting',
					body: 'Membawa kunci yang menandatangani perubahan. Siapa pun yang memakainya bisa menulis, dan perangkat orang lain menerima tulisannya.'
				},
				{
					title: 'Hanya baca',
					body: 'Membawa kunci untuk membaca, dan separuh publik dari kunci penandatangan. Pembaca bisa mengubah salinannya sendiri di layar, tetapi tidak bisa menghasilkan perubahan yang diterima perangkat lain — editor hanya-baca adalah versi sopan dari aturan yang ditegakkan di lapisan bawah.'
				}
			],
			rolesNote:
				'Kedua kunci berjalan di bagian tautan setelah tanda # — bagian yang tidak pernah dikirim browser ke server. Itulah sebabnya catatannya bisa terenkripsi ujung ke ujung sementara layanan penghubung kami tidak melihat apa pun selain nama ruang acak.',
			workspacesLede:
				'Ruang kerja adalah daftar catatan bersama, yang dibuka dengan frasa sandi alih-alih satu tautan per catatan.',
			workspacesBody: [
				'Buat lewat bagian Ruang kerja di bilah samping. Pilih nama dan frasa sandi minimal dua belas karakter — empat atau lima kata yang tidak berkaitan sudah bagus.',
				'Tambahkan catatan lewat menu ⋯ pada catatan, atau cukup buat catatan saat ruang kerjanya sedang dipilih. Semua yang ada di daftar tersinkron ke setiap anggota.',
				'Frasa sandinya tidak pernah disimpan dan tidak pernah dikirim. Semuanya diturunkan darinya, termasuk nama ruang tempat para anggota bertemu — jadi tautan undangannya sendiri sama sekali tidak membawa pengenal apa pun.'
			],
			workspacesRole:
				'Semua orang yang punya frasa sandi bisa menyunting semuanya. Tidak ada peran, karena tanpa server tidak ada yang bisa menegakkannya. Untuk berbagi tanpa memberi hak sunting, pakai tautan hanya-baca per catatan.',
			joiningLede: 'Dua hal berjalan terpisah, dan itu disengaja.',
			joiningSteps: [
				'Salin tautan undangan dari menu ⋯ ruang kerja lalu kirim sesuka Anda.',
				'Kirim frasa sandinya lewat jalur lain — aplikasi berbeda, atau langsung diucapkan. Tautan saja tidak menggabungkan Anda ke mana pun.',
				'Orang itu membuka tautannya, mengetik frasa sandinya, dan perangkatnya menurunkan kunci yang sama dengan milik Anda.'
			],
			joiningNote:
				'Kalau frasa sandinya salah ketik, aplikasinya tidak bisa memberi tahu: frasa sandi yang salah menghasilkan ruang yang benar-benar valid, hanya saja tidak ada orang di dalamnya. Pesan tunggunya menyebut kedua kemungkinan, karena dari sisi itu keduanya memang tidak bisa dibedakan.',
			availabilityLede: 'Ini bagian yang perlu dipahami sebelum Anda mengandalkannya.',
			availabilityBody: [
				'Tidak ada yang disimpan di server, jadi sebuah catatan hanya ada di perangkat orang-orang yang memilikinya. Orang yang membuka tautan melihat catatannya saat Anda — atau siapa pun yang sudah memilikinya — sedang online.',
				'Setiap anggota yang membuka catatan ruang kerja menyimpan salinannya, jadi makin banyak anggota, makin banyak perangkat yang bisa melayani. Ruang kerja beranggota enam punya enam.',
				'Apa pun yang pernah Anda buka tetap tersedia offline, selamanya, karena berada di perangkat Anda.'
			],
			limitsLede:
				'Tidak satu pun dari ini kelalaian; semuanya konsekuensi dari tidak adanya server.',
			limits: [
				{
					title: 'Anda tidak bisa mencabut akses satu orang',
					body: 'Tautan adalah kredensialnya, dan bisa diteruskan. Menerbitkan ulang tautannya memutus semua orang sekaligus, lalu Anda kirimkan yang baru kepada orang yang masih Anda inginkan.'
				},
				{
					title: 'Anda tidak bisa menghapus salinan orang lain',
					body: 'Begitu sebuah catatan dibuka di perangkat lain, perangkat itu memilikinya. Menghentikan berbagi mencegah akses ke depan; ia tidak berlaku surut.'
				},
				{
					title: 'Frasa sandi yang hilang bersifat final',
					body: 'Kami tidak mengetahuinya, tidak tahu ruang kerjanya ada, dan tidak memegang apa pun untuk menyetel ulangnya. Kalau semua anggota lupa, ruang kerjanya hilang.'
				},
				{
					title: 'Peserta lain melihat alamat IP Anda',
					body: 'Perangkat terhubung langsung satu sama lain, dan begitulah arti koneksi langsung. Ini melekat pada sifat antar-perangkat, bukan khusus aplikasi ini.'
				}
			]
		}
	};
	const t = $derived(DICT[lang]);
</script>

<DocsPage slug="sharing" {lang}>
	<DocsSection
		id="one-note"
		{lang}
		title={{ en: 'Sharing one note', id: 'Membagikan satu catatan' }}
		lede={{ en: t.oneLede, id: t.oneLede }}
	>
		<ol class="flex list-decimal flex-col gap-2 pl-5">
			{#each t.oneSteps as step (step)}
				<li>{step}</li>
			{/each}
		</ol>
	</DocsSection>

	<DocsSection
		id="roles"
		{lang}
		title={{ en: 'Edit and view-only links', id: 'Tautan sunting dan hanya-baca' }}
		lede={{ en: t.rolesLede, id: t.rolesLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.roles as role (role.title)}
				<div>
					<dt class="font-medium text-foreground">{role.title}</dt>
					<dd class="mt-1">{role.body}</dd>
				</div>
			{/each}
		</dl>
		<p>{t.rolesNote}</p>
	</DocsSection>

	<DocsSection
		id="workspaces"
		{lang}
		title={{ en: 'Workspaces', id: 'Ruang kerja' }}
		lede={{ en: t.workspacesLede, id: t.workspacesLede }}
	>
		<ul class="flex list-disc flex-col gap-2 pl-5">
			{#each t.workspacesBody as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
		<p class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
			{t.workspacesRole}
		</p>
	</DocsSection>

	<DocsSection
		id="joining"
		{lang}
		title={{ en: 'Inviting and joining', id: 'Mengundang dan bergabung' }}
		lede={{ en: t.joiningLede, id: t.joiningLede }}
	>
		<ol class="flex list-decimal flex-col gap-2 pl-5">
			{#each t.joiningSteps as step (step)}
				<li>{step}</li>
			{/each}
		</ol>
		<p>{t.joiningNote}</p>
	</DocsSection>

	<DocsSection
		id="availability"
		{lang}
		title={{ en: 'Who has to be online', id: 'Siapa yang harus online' }}
		lede={{ en: t.availabilityLede, id: t.availabilityLede }}
	>
		{#each t.availabilityBody as line (line)}
			<p>{line}</p>
		{/each}
	</DocsSection>

	<DocsSection
		id="sharing-limits"
		{lang}
		title={{ en: 'What sharing cannot do', id: 'Yang tidak bisa dilakukan' }}
		lede={{ en: t.limitsLede, id: t.limitsLede }}
	>
		<dl class="flex flex-col gap-4">
			{#each t.limits as limit (limit.title)}
				<div>
					<dt class="font-medium text-foreground">{limit.title}</dt>
					<dd class="mt-1">{limit.body}</dd>
				</div>
			{/each}
		</dl>
	</DocsSection>
</DocsPage>
