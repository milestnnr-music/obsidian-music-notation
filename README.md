# ABC Blocks

Editable ABC notation blocks for [Obsidian](https://obsidian.md). Write short musical examples directly in your notes using ` ```abc ` fences, with a lightweight visual editor in Live Preview and ABC stored in the markdown file.

**Status:** Phase 5 in progress (v0.3.3). Step **5.1** done (toolbar). Step **5.2** ✅ snap staff interaction verified in Live Preview. Step **5.3** ✅ delete selected note verified in Live Preview. Step **5.4** ✅ change duration on selection (v0.3.2). Step **5.5** ✅ rests via toolbar rest mode (v0.3.3). Step **5.6** ✅ key/time signature controls per block. Step **5.7** ✅ soft 4-measure warning in Live Preview. Step **5.8** ✅ Reading view static notation only. **5.2 spec:** [`docs/HANDOFF-phase-5.2-snap-interaction.md`](docs/HANDOFF-phase-5.2-snap-interaction.md). Phase 4 complete (4.1–4.5). Multi-block LP fix notes: [`docs/phase-4.5-multi-block-lp-resolution.md`](docs/phase-4.5-multi-block-lp-resolution.md).

📐 **Full product design & phased plan:** [`docs/DESIGN.md`](docs/DESIGN.md)  
🤖 **Cursor agents:** read [`AGENTS.md`](AGENTS.md) before implementing.

## What it will do (v1)

- Hybrid editing: snap-to-place on staff in **Live Preview** (Shift+click to select); ABC syncs to the file (debounced ~300ms)
- ` ```abc ` code blocks in markdown
- Single treble staff, simple melodies (~4 measures soft guideline), quarter-note default
- Graceful fallback when ABC is invalid
- Static render in **Reading view**; raw ABC in **Source mode**

See [LIMITATIONS.md](./LIMITATIONS.md) for current scope and roadmap.

### ABC formatting

Extra blank lines or line breaks **inside** a ` ```abc ` fence can break ABC notation (abcjs may render headers only, with no staff). The plugin **automatically removes interior blank lines** before rendering. Your markdown file is unchanged; normalization happens at render time.

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
npm run test:abc-normalize
npm run test:abc-empty-shell
npm run test:roundtrip
npm run test:abc-block-patch
npm run test:abc-sync-debounce
npm run test:abc-first-edit
npm run test:phase-4.5
```

With Obsidian dev vault open (`Test.md` in Live Preview after reload):

```bash
npm run sync:test-note
npm run compare:phase-4.5-probe
```

## Project layout

```
src/
  main.ts                 Plugin entry
  plugin/                 code-block, block-identity, block-dom, render paths (Phases 1–4 ✅)
  dev/                    phase-45-probe (LP automation for agents)
  model/                  Score types + createEmptyScore() (Phase 3 ✅)
  serializer/             ABC ↔ Score parser/writer + mapping (Phase 3 ✅)
  renderer/               abcjs adapter (Phase 2)
  editor/                 sync, sync-lifecycle, abc-block-patch (Phase 4 ✅); widget (Phase 5)
  ui/                     Fallback + measure warning
  settings/types.ts       Vault settings types (UI in Phase 7)
docs/
  DESIGN.md               Product design & phased implementation plan
  phase-4.5-multi-block-lp-resolution.md   Canonical multi-block LP fix reference
  manual-tests/           Phase 4.4 undo (✅), 4.5 source mode (✅)
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
| 1     | Block lifecycle in Obsidian             | ✅ Complete |
| 2     | Read path — render ABC                  | ✅ Complete |
| 3     | Music model + serializer                | ✅ Complete |
| 4     | Debounced sync to markdown              | ✅ Complete (4.1–4.5) |
| 5     | Visual editor (5.1 ✅; 5.2 ✅; 5.3 ✅ delete) | **In progress** |
| 6     | Polish + docs                           | Planned     |
| 7+    | Chords, multi-staff, settings, playback | Planned     |

Details and exit criteria: [`docs/DESIGN.md`](docs/DESIGN.md)

## Repository

https://github.com/milestnnr-music/obsidian-music-notation

## API docs

https://docs.obsidian.md

## License

MIT
