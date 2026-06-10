# ABC Blocks

Editable ABC notation blocks for [Obsidian](https://obsidian.md). Write short musical examples directly in your notes using ` ```abc ` fences, with a lightweight visual editor in Live Preview and ABC stored in the markdown file.

**Status:** Phase 0 complete. **Phase 1 is next** — register the `abc` code block processor and wire Live Preview / Reading / Source behavior.

📐 **Full product design & phased plan:** [`docs/DESIGN.md`](docs/DESIGN.md)  
🤖 **Cursor agents:** read [`AGENTS.md`](AGENTS.md) before implementing.

## What it will do (v1)

- Hybrid editing: click a staff in **Live Preview**; ABC syncs to the file (debounced ~300ms)
- ` ```abc ` code blocks in markdown
- Single treble staff, simple melodies (~4 measures soft guideline), quarter-note default
- Graceful fallback when ABC is invalid
- Static render in **Reading view**; raw ABC in **Source mode**

See [LIMITATIONS.md](./LIMITATIONS.md) for current scope and roadmap.

## Development setup

### 1. Use a separate dev vault

Never develop plugins in your main vault. [Create an empty vault](https://help.obsidian.md/Getting+started/Create+a+vault) for plugin work.

**Dev vault path:** `Desktop/Ideas/Obsidian Dev Vault`

### 2. Link the plugin into the vault

Symlink this repo so **`abc-blocks` itself** is the link — not a folder containing another link.

```bash
# Create plugins directory if needed
mkdir -p "/Users/milestanner/Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins"

# abc-blocks must point directly at the repo (manifest.json and main.js live here)
ln -s "/Users/milestanner/Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks" \
  "/Users/milestanner/Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins/abc-blocks"
```

Verify:

```bash
ls "/Users/milestanner/Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins/abc-blocks/manifest.json"
```

That command must succeed. If you see `.../plugins/abc-blocks/obsidian-abc-blocks/manifest.json` instead, the symlink is nested one level too deep — remove `abc-blocks` and run `ln -s` again.

The folder name under `plugins/` must match the plugin `id` in `manifest.json` (`abc-blocks`).

### 3. Install and build

```bash
cd obsidian-abc-blocks
npm install
npm run dev
```

`npm run dev` watches `src/` and outputs `main.js`. Leave it running while developing.

### 4. Enable in Obsidian

1. Open your **dev vault** in Obsidian (the one that contains `.obsidian/plugins/abc-blocks/`)
2. **Settings → Community plugins → Turn on community plugins** (disables Restricted Mode)
3. Look under **Installed plugins** — not **Browse** (local dev plugins do not appear in Browse)
4. Toggle **ABC Blocks** on
5. After code changes: **Command palette → Reload app without saving** (or use the refresh icon on the Community plugins page)

Optional: install the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin to auto-reload on file changes.

### Troubleshooting

| Symptom                                         | Fix                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Plugin not listed at all                        | Turn on community plugins; confirm `main.js` and `manifest.json` are directly inside `plugins/abc-blocks/` |
| Nested folder `abc-blocks/obsidian-abc-blocks/` | Delete `abc-blocks` and recreate the symlink so `abc-blocks` points at the repo root                       |
| Plugin listed but won't enable                  | Run `npm run build` or `npm run dev`; reload Obsidian                                                      |
| Changes not appearing                           | Keep `npm run dev` running; reload the app                                                                 |

### 5. Production build

```bash
npm run build
npm run lint
```

## Project layout

```
src/
  main.ts                 Plugin entry
  plugin/code-block.ts    ```abc block registration (Phase 1)
  model/                  Score model types (Phase 3)
  serializer/             ABC ↔ model (Phase 3)
  renderer/               abcjs adapter (Phase 2)
  editor/                 Live Preview widget (Phases 4–5)
  ui/                     Fallback + measure warning
  settings/types.ts       Vault settings types (UI in Phase 7)
docs/
  DESIGN.md               Product design & phased implementation plan
```

## Example block (future)

````markdown
```abc
X:1
M:4/4
L:1/4
K:C
CDEF|
```
````

## Roadmap

| Phase | Focus                                   | Status      |
| ----- | --------------------------------------- | ----------- |
| 0     | Project shell                           | ✅ Complete |
| 1     | Block lifecycle in Obsidian             | ⬅ Next      |
| 2     | Read path — render ABC                  | Planned     |
| 3     | Music model + serializer                | Planned     |
| 4     | Debounced sync to markdown              | Planned     |
| 5     | Visual editor                           | Planned     |
| 6     | Polish + docs                           | Planned     |
| 7+    | Chords, multi-staff, settings, playback | Planned     |

Details and exit criteria: [`docs/DESIGN.md`](docs/DESIGN.md)

## Repository

https://github.com/milestnnr-music/obsidian-music-notation

## API docs

https://docs.obsidian.md

## License

MIT
