# Note Speak

A macOS-Notes-style note app that runs entirely in the browser. Notes are stored in
IndexedDB on the device and are never sent anywhere — there is no backend, no account,
no sync. Dictation uses the browser's own speech engine.

## Features

- **Three panes** — folders, note list with search, and the editor. Below `md` it
  collapses to one pane at a time, with the folder rail in a sheet.
- **Voice notes** — the Web Speech API transcribes straight into the open note at the
  caret. Interim words appear live and are replaced as the engine refines them.
  Unsupported browsers (Firefox, or any non-`https` origin) get an explanatory banner
  and a disabled mic; typing always works.
- **Installable PWA** — manifest, icons, and a Workbox service worker. Fully usable
  offline; new versions prompt before reloading.
- **Trash** — deletes are soft, with an Undo toast and a restore/purge flow.
- **Deep links** — the selected folder and note live in the URL, so reload and
  back/forward restore the view.

## Keyboard shortcuts

| Shortcut         | Action                          |
| ---------------- | ------------------------------- |
| `⌘/Ctrl + N`     | New note                        |
| `⌘/Ctrl + F`     | Focus search                    |
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

## Layout

| Path                                    | Purpose                                                             |
| --------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/stores/notes.svelte.ts`        | Notes, folders, prefs; debounced IndexedDB persistence              |
| `src/lib/stores/speech.svelte.ts`       | Web Speech API wrapper: feature detection, auto-restart, error copy |
| `src/lib/components/note-editor.svelte` | Editor plus the live-transcript splicing                            |
| `src/lib/components/folder-rail.svelte` | Folder nav, install prompt, theme toggle                            |
| `src/lib/components/note-list.svelte`   | Search, list, per-note actions                                      |
| `src/routes/+page.svelte`               | Pane layout, selection state, URL sync, shortcuts                   |
| `vite.config.ts`                        | `SvelteKitPWA` — manifest and service worker                        |

UI is [shadcn-svelte](https://shadcn-svelte.com) (`maia` style, `neutral` base,
Hugeicons) on Tailwind 4. Theme tokens live in `src/routes/layout.css`.

## Browser support for dictation

| Browser                          | Dictation                                                                |
| -------------------------------- | ------------------------------------------------------------------------ |
| Chrome, Edge (desktop + Android) | Yes — needs an internet connection; recognition runs on Google's servers |
| Safari 14.5+ (macOS + iOS)       | Yes, via `webkitSpeechRecognition`                                       |
| Firefox                          | No — banner shown, typing unaffected                                     |

Note text itself never leaves the device. When dictating on Chrome, the _audio_ is sent
to the browser vendor's speech service — that is how the native API works, and it is why
dictation needs a connection there.
