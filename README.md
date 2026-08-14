# Note Speak

A voice-first note app that runs entirely in the browser. Notes live in IndexedDB on the
device; there is no backend, no account, and nothing to sign into. Dictation uses the
browser's own speech engine, and sharing connects devices directly to one another.

User documentation lives at [`/en/docs`](https://note-speak.example/en/docs) and
[`/id/docs`](https://note-speak.example/id/docs) — every feature and every editor block
with copy-pasteable examples. This file covers the codebase.

## Features

- **Voice notes** — the Web Speech API transcribes into the open note at the caret.
  Spoken punctuation ("period", "titik") lands as punctuation. Interim words appear live
  and are replaced as the engine revises them. Unsupported browsers get an explanatory
  banner and a disabled mic; typing always works.
- **Block editor** — Tiptap over Markdown. Headings, lists, checklists, tables, callouts,
  toggles, columns, embedded media, mermaid diagrams and KaTeX formulas, all reachable
  from a `/` menu. Everything round-trips through plain Markdown, so a note stays
  readable in any other editor.
- **Sharing** — a link per note, in edit or view-only form. View-only is enforced
  cryptographically: every update is Ed25519-signed and peers reject what they cannot
  verify. Content is AES-encrypted; the keys travel in the URL fragment, which browsers
  never send to a server.
- **Workspaces** — a shared note list unlocked by a passphrase. Everything is derived
  from that passphrase, including the signalling room, so an invite link on its own
  identifies nothing.
- **Version history** — automatic per-editing-session snapshots plus manual marks, stored
  as reverse patches with media kept by content hash.
- **Backup & restore** — full JSON archive, a zip of one Markdown file per note, or a
  single note as Markdown. Import merges by recency or replaces wholesale.
- **Bilingual** — English and Bahasa Indonesia, switchable from the sidebar. The docs are
  prerendered per language.
- **Installable PWA** — manifest, icons, share target, app shortcuts and a Workbox
  service worker. Fully usable offline; new versions prompt before reloading.

## Keyboard shortcuts

| Shortcut         | Action                          |
| ---------------- | ------------------------------- |
| `⌘/Ctrl + N`     | New note                        |
| `⌘/Ctrl + F`     | Search notes                    |
| `⌘/Ctrl + ⇧ + D` | Start / stop dictation          |
| `Esc`            | Stop dictation, or clear search |

## Development

```sh
bun install
bun run dev
```

Dictation needs a secure context. `localhost` counts; testing over a LAN IP does not —
use a tunnel or `https` if you need it on a phone.

```sh
bun run check    # svelte-check
bun run lint     # prettier + eslint
bun run build    # production build (adapter-node)
bun run preview  # preview the production build
bun run icons    # regenerate PWA PNGs from static/icon.svg
```

`bun run check` is a real gate rather than a formality: every translation dictionary is
typed `Dict<T>`, so a missing key or a missing language fails the build.

## Layout

| Path                                       | Purpose                                                             |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `src/routes/(app)/`                        | The app itself — `ssr = false`, prerendered as a shell              |
| `src/routes/(marketing)/`                  | Landing, legal and docs — `ssr = true`, real HTML for crawlers      |
| `src/routes/(marketing)/[lang=lang]/docs/` | The documentation, prerendered once per language                    |
| `src/lib/stores/notes.svelte.ts`           | Notes, folders, prefs; debounced IndexedDB persistence              |
| `src/lib/stores/speech.svelte.ts`          | Web Speech wrapper: feature detection, auto-restart, error codes    |
| `src/lib/speech/transcript.ts`             | Pure transcript rendering — spoken commands, auto-capitalize        |
| `src/lib/editor/`                          | Tiptap setup, the block registry, custom nodes and Markdown parsers |
| `src/lib/share/`                           | Encryption, signed updates, the WebRTC provider and sessions        |
| `src/lib/workspace/`                       | Passphrase key derivation and the shared note index                 |
| `src/lib/history/`                         | Version history and media-by-hash storage                           |
| `src/lib/i18n/`                            | `Lang`, `Dict<T>`, and the persisted locale                         |
| `src/lib/docs/`                            | Documentation shell, block examples and previews                    |
| `server/`                                  | The signalling gateway (WebSocket introductions only)               |
| `vite.config.ts`                           | `SvelteKitPWA` — manifest and service worker                        |

UI is [shadcn-svelte](https://shadcn-svelte.com) (`maia` style, `neutral` base,
Hugeicons) on Tailwind 4. Theme tokens live in `src/routes/layout.css`.

## Adding a block

Add one entry to `BLOCKS` in `src/lib/editor/blocks.ts` — the `/` menu, the Text menu and
the Insert menu all render from it. Then add its name to `src/lib/editor/blocks-i18n.ts`
and its documentation to `src/lib/docs/blocks-content.ts` and
`src/lib/docs/block-previews.svelte`. The last two are enforced: the docs page throws at
prerender time if a block is undocumented, naming the id.

## Browser support for dictation

| Browser                          | Dictation                                                                |
| -------------------------------- | ------------------------------------------------------------------------ |
| Chrome, Edge (desktop + Android) | Yes — needs an internet connection; recognition runs on Google's servers |
| Safari 14.5+ (macOS + iOS)       | Yes, via `webkitSpeechRecognition`                                       |
| Firefox                          | No — banner shown, typing unaffected                                     |

Note text itself never leaves the device. When dictating on Chrome, the _audio_ is sent
to the browser vendor's speech service — that is how the native API works, and it is why
dictation needs a connection there.
