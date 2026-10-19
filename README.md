# ABC Blocks

Editable ABC notation blocks for [Obsidian](https://obsidian.md). Write short musical examples directly in your notes using ` ```abc ` fences, with a lightweight visual editor in Live Preview and ABC stored in the markdown file.

**Status:** **v1.1.0** — v1 personal ship. Phase 6 complete (6.1–6.5): docs, manual checklist, error copy, settings hooks. Phase 5 complete (5.1–5.8). **Next:** Phase 7+ (v2 foundations).

## What it does (v1)

- Hybrid editing: snap-to-place on staff in **Live Preview** (Shift+click to select); ABC syncs to the file (debounced ~300ms)
- ` ```abc ` code blocks in markdown
- Single treble staff, simple melodies (~4 measures soft guideline), quarter-note default
- Graceful fallback when ABC is invalid
- Static render in **Reading view**; raw ABC in **Source mode**

See [LIMITATIONS.md](./LIMITATIONS.md) for current scope, known gaps, and roadmap.

---

## Using ABC Blocks

### Install

You do not need to clone this repository or build from source.

Repository: https://github.com/milestnnr-music/obsidian-music-notation

**There is no published GitHub release yet.** Install from the release zip `abc-blocks-1.1.0.zip`. In a local copy of this project that zip is at `dist/abc-blocks-1.1.0.zip` (that folder is not in git, because the zip contains the built `main.js`). When a release is published on the repository above, download the same zip from that release and follow these steps.

The zip has exactly three files at the archive root (not inside an extra folder):

- `manifest.json`
- `main.js`
- `styles.css`

1. In your vault, create the folder `.obsidian/plugins/abc-blocks/` if it does not exist.
2. Copy those three files into that folder so they sit directly inside it:

   `<vault>/.obsidian/plugins/abc-blocks/manifest.json`  
   `<vault>/.obsidian/plugins/abc-blocks/main.js`  
   `<vault>/.obsidian/plugins/abc-blocks/styles.css`

3. In Obsidian: **Settings → Community plugins → Turn on community plugins**.
4. Under **Installed plugins**, enable **ABC Blocks**.
5. Reload the app if the plugin does not appear immediately (**Command palette → Reload app without saving**).

### Create a block

Type a fenced code block with language `abc` in any note:

````markdown
```abc

```
````

An empty fence is enough — you do not need ABC headers in the file yet.

### View modes

| Mode | What you see | Editing |
| ---- | ------------ | ------- |
| **Live Preview** | Staff + toolbar; click to place notes and rests | Full visual editor; changes sync to the fence after ~300ms |
| **Reading view** | Static notation only | No toolbar, no click-to-edit |
| **Source mode** | Raw fence text | Edit ABC as plain markdown; no custom overlay |

**Workflow tips**

- Use **Live Preview** to compose and edit with the staff and toolbar.
- Switch to **Source** to paste ABC from elsewhere or tweak headers (`K:`, `M:`, `L:`) by hand.
- Use **Reading view** when you want notation in a finished note without editor chrome.

### Empty blocks

A new empty ` ```abc ` fence shows a treble staff shell and toolbar with implicit defaults:

- Time: **4/4**
- Key: **C** major
- Default note length: **quarter**

The markdown file stays empty until your first scored edit; then headers and body are written automatically.

### ABC formatting

Extra blank lines or line breaks **inside** a ` ```abc ` fence can break ABC notation (abcjs may render headers only, with no staff). The plugin **automatically removes interior blank lines** before rendering. Your markdown file is unchanged; normalization happens at render time.

---

## Editing cheat sheet

All staff editing happens in **Live Preview**. There are no Place/Select toolbar buttons — use **Shift** for selection.

| Goal | How |
| ---- | --- |
| **Place a note** | Choose duration (and optional ♯/♭/♮) on the toolbar → hover staff (guide line shows snapped pitch) → click → note appends to end of clicked measure |
| **Place a rest** | Click toolbar **Rest** (toggles rest mode; accidentals disabled) → click a measure |
| **Select note or rest** | **Shift+hover** for preview → **Shift+click** the note or rest (outline highlight) |
| **Clear selection** | **Shift+click** empty staff area, or make any score edit |
| **Change duration** | **Shift+click** to select → click a toolbar duration |
| **Delete** | **Shift+click** to select → **Delete** or **Backspace** |
| **Key signature** | Toolbar key picker: C, G, F, D, Bb |
| **Time signature** | Toolbar time picker: 4/4, 3/4, 2/4 |
| **Long examples** | More than 4 measures shows a dismissible info banner; editing is not blocked |

**Rhythm model:** notes and rests append to the **end of the measure** you click (measure + append). Beat-grid X snap is not in v1.

Toolbar clicks keep the current selection so duration-on-selection works after you select a note.

---

## Example blocks

### Empty fence (implicit defaults)

````markdown
```abc

```
````

Live Preview shows an empty treble staff and toolbar. After you place the first note, the file may gain:

```abc
X:1
M:4/4
L:1/4
K:C
C|
```

### Simple melody

````markdown
```abc
X:1
M:4/4
L:1/4
K:C
CDEF|GABc|
```
````

Open in Live Preview to add notes with the toolbar and staff, or edit the ABC in Source mode.

### Invalid ABC (fallback)

````markdown
```abc
X:1
M:4/4
K:C
not valid abc music
```
````

The plugin shows a short friendly message (“Couldn't render this ABC.”) and your source in monospace — no red error banner. Fix the ABC in Source mode or replace the block body; the note does not crash.

---

## Development setup

For changing the plugin. Use a separate dev vault, not the vault where you take notes.

```bash
cd obsidian-abc-blocks
npm install
npm run build
```

`npm run build` writes `main.js`. `npm run dev` watches `src/` and rebuilds it. Enable **ABC Blocks** under **Settings → Community plugins**, then reload after changes (**Command palette → Reload app without saving**). Optional: [Hot-Reload](https://github.com/pjeby/hot-reload).

```bash
npm run lint
npm run test:all
```

**Developer note:** symlink this repo into a separate dev vault so `plugins/abc-blocks/manifest.json` sits at the folder root and is not nested:

```bash
mkdir -p "/path/to/dev-vault/.obsidian/plugins"

ln -s "/path/to/obsidian-abc-blocks" \
  "/path/to/dev-vault/.obsidian/plugins/abc-blocks"
```

The folder name must match the plugin id `abc-blocks`. That symlink is only a development shortcut. Other people should use the manual install above.

---

## Project layout

```
src/
  main.ts                 Plugin entry
  plugin/                 code-block, block-identity, render paths
  model/                  Score types + createEmptyScore()
  serializer/             ABC ↔ Score parser/writer
  renderer/               abcjs adapter
  editor/                 sync, widget, toolbar, staff interaction
  ui/                     Fallback + measure warning
```

## Roadmap

| Phase | Focus | Status |
| ----- | ----- | ------ |
| 0–4 | Shell, render, model, sync | ✅ Complete |
| 5 | Visual editor (toolbar, snap, delete, rests, key/time, warnings) | ✅ Complete |
| 6 | Polish + docs | In progress |
| 7+ | Chords, multi-staff, settings, playback | Planned |

## Repository

https://github.com/milestnnr-music/obsidian-music-notation

## License

[MIT](./LICENSE) — Copyright (c) 2026 Miles Tanner.
