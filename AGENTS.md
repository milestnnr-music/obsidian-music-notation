# ABC Blocks — Agent guide

Obsidian community plugin for editable ` ```abc ` notation blocks. **Read [`docs/DESIGN.md`](docs/DESIGN.md) first** before implementing features — it is the authoritative PRD with locked decisions and phased exit criteria.

**Repository:** https://github.com/milestnnr-music/obsidian-music-notation  
**Plugin id:** `abc-blocks`  
**Current status:** Phase 0 complete. **Phase 1 is next** (block lifecycle).

---

## Current phase & next work

| Phase | Status | Next step |
|-------|--------|-----------|
| 0 — Project shell | ✅ Done | — |
| **1 — Block lifecycle** | ⬅ **Next** | **1.1** Register `registerMarkdownCodeBlockProcessor('abc', …)` in `src/plugin/code-block.ts` |
| 2 — Read path (abcjs) | Pending | After Phase 1 |
| 3 — Score model + serializer | Pending | After Phase 2 |
| 4 — Debounced sync | Pending | After Phase 3 |
| 5 — Visual editor | Pending | After Phase 4 |
| 6 — Polish + docs | Pending | After Phase 5 |
| 7+ — v2 (chords, 2 staves, settings, playback) | Pending | After Phase 6 |

**Phase 1 order:** 1.1 (serial) → 1.2 ∥ 1.3 ∥ 1.4 (parallel) → 1.5 (serial). See `docs/DESIGN.md` for full step tables.

---

## Source layout & module responsibilities

```
src/
  main.ts                      Plugin entry — load settings, register code block processor
  plugin/
    code-block.ts              Phase 1: ```abc processor registration & view routing
  model/
    types.ts                   Score, Staff, Measure, NoteEvent, RestEvent, Pitch types
    score.ts                   Phase 3: createEmptyScore(), immutable updates
  serializer/
    abc-defaults.ts            Implicit defaults (4/4, C, quarter, measure threshold)
    abc-parser.ts              Phase 3: ABC text → Score
    abc-writer.ts              Phase 3: Score → ABC text
  renderer/
    abcjs-adapter.ts           Phase 2: Score or ABC → SVG via abcjs
  editor/
    editor-widget.ts           Phase 5: Live Preview root widget
    toolbar.ts                 Phase 5: Duration + accidental controls
    staff-interaction.ts       Phase 5: Click place / select / delete
    sync.ts                    Phase 4: Debounced model → ABC → document write-back
  ui/
    fallback.ts                Phase 2: Invalid ABC fallback UI
    measure-warning.ts         Phase 5: Soft warning past measure threshold
  settings/
    types.ts                   AbcBlocksSettings + DEFAULT_SETTINGS (UI in Phase 7)
```

**Root artifacts:** `manifest.json`, `main.js` (esbuild output), `styles.css`, `esbuild.config.mjs`

**Architecture (do not bypass):**

```
ABC text  ←→  ScoreModel  →  Renderer (abcjs)
                    ↑
                Editor UI
```

---

## Do / don't (project-specific)

### Do

- Read `docs/DESIGN.md` before any feature work.
- Follow the **phased plan** — implement only the current phase’s steps unless fixing a regression.
- Use the **layered model**: editor mutates `Score`; serializer owns ABC I/O; renderer owns SVG.
- Keep `main.ts` minimal (lifecycle + registration only).
- Use `this.register*` helpers for events, DOM, intervals.
- Debounce markdown writes ~300ms (Phase 4+).
- Show **graceful fallback** for invalid ABC (monospace + friendly message, no red banner).
- Treat the **markdown file as source of truth**.
- Match existing TypeScript style (`strict`, tabs in source files).

### Don't

- Expand scope toward **MuseScore-lite** (parts, engraving, advanced notation).
- Add chords, multi-staff, playback, settings UI, or insert command **before their phase**.
- Parse or write chords/multi-staff in v1 parser (defer to Phase 7+).
- Add network calls or telemetry.
- Put feature logic in `main.ts` or create monolithic god-files.
- Reference removed sample-plugin demos, `.github/workflows`, or a top-level `settings.ts` (settings live in `src/settings/types.ts`).
- Commit `node_modules/` or `main.js` (build artifacts).

---

## Dev workflow

### Prerequisites

- Node.js LTS (18+)
- npm
- Separate **dev vault** — never develop in your main vault

### Symlink plugin into dev vault

```bash
mkdir -p "/Users/milestanner/Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins"

ln -s "/Users/milestanner/Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks" \
  "/Users/milestanner/Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins/abc-blocks"
```

The symlink target must be the **repo root** (where `manifest.json` lives). Folder name must match plugin id `abc-blocks`.

### Build & test

```bash
cd "/Users/milestanner/Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks"
npm install
npm run dev    # watch mode — leave running
```

In Obsidian (dev vault): **Settings → Community plugins →** enable **ABC Blocks**. After code changes: **Reload app without saving**.

```bash
npm run build   # production bundle
npm run lint    # ESLint
```

---

## Environment & tooling

| Tool | Role |
|------|------|
| TypeScript | Source language |
| esbuild | Bundle `src/` → `main.js` |
| npm | Scripts and dependencies |
| abcjs | Notation rendering (add in Phase 2) |
| eslint-plugin-obsidianmd | Obsidian-specific lint rules |

---

## Manifest (`manifest.json`)

- `id`: `abc-blocks` — stable; never change after release
- `version`: SemVer (`0.1.0` during early phases)
- `minAppVersion`: keep accurate when using newer APIs
- `isDesktopOnly`: `false` (editing is desktop-first; mobile loads safely)

---

## Coding conventions

- Delegate from `main.ts` to module functions (`registerAbcCodeBlockProcessor`, etc.).
- Prefer immutable `Score` updates in `model/score.ts`.
- Keep files under ~300 lines; split if larger.
- Bundle all runtime deps into `main.js`.
- Use `async/await`; handle errors with fallback UI, not thrown UI exceptions.

---

## Continuing work in a new session

No prior chat context is available. Load project state from files:

### @-mention these files

1. **`docs/DESIGN.md`** — PRD, locked decisions, phase steps, exit criteria
2. **`AGENTS.md`** — this file (module map, do/don't, dev workflow)
3. **`README.md`** — quick start, symlink, troubleshooting
4. **`LIMITATIONS.md`** — what works now vs planned

### Example prompts

```
@docs/DESIGN.md @AGENTS.md Read DESIGN.md and implement Phase 1.
```

```
@docs/DESIGN.md Continue Phase 2 — step 2.1 abcjs integration.
```

```
@docs/DESIGN.md @LIMITATIONS.md Phase 1 step 1.5 is done. What's next?
```

### Checklist before implementing

1. Read status line in `docs/DESIGN.md` and `README.md`.
2. Find your step id (e.g. `1.1`) and blockers in DESIGN phase tables.
3. Implement only that step’s scope; wire stubs, don’t flesh future phases early.
4. Test in dev vault with `npm run dev` running.

**GitHub:** https://github.com/milestnnr-music/obsidian-music-notation

---

## References

- [Obsidian API docs](https://docs.obsidian.md)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- Product design: [`docs/DESIGN.md`](docs/DESIGN.md)
