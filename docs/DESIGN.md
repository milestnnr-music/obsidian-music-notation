# ABC Blocks — Product Design & Implementation Plan

**Plugin id:** `abc-blocks`  
**Repository:** [https://github.com/milestnnr-music/obsidian-music-notation](https://github.com/milestnnr-music/obsidian-music-notation)  
**Dev vault:** `Desktop/Ideas/Obsidian Dev Vault`  
**Current status:** Phase 4 in progress (v0.1.1). Phases 0–3 done; Phase 4 steps **4.1–4.4** done (debounced sync, first-edit write, undo validation, multi-block LP identity hardening). **Next:** Phase 4.5 (Source mode reflects Live Preview edits).

> **For Cursor agents:** Read this document first before implementing features. See also [AGENTS.md](../AGENTS.md), [README.md](../README.md), and [LIMITATIONS.md](../LIMITATIONS.md).

---

## Product intent

ABC Blocks adds **pedagogical music notation examples** to Obsidian notes — **not** a score editor or DAW. Think **figures in a textbook**: short, illustrative snippets embedded in prose.

- Target length: **~4 measures max** (soft guideline, not a hard cap)
- Use case: music theory notes, lesson plans, practice journals, method-book excerpts
- **Not** MuseScore, Dorico, or a composition workstation

---

## Core decisions (locked)

These were decided in design sessions and should not be re-litigated without explicit user approval.


| Area                  | Decision                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Editing model         | **Hybrid (C):** visual staff in Live Preview + ABC text stored in markdown                                                     |
| Block syntax          | ` ```abc ` fenced code blocks                                                                                                   |
| Live Preview          | Interactive editing only                                                                                                       |
| Reading view          | Static rendered notation (no toolbar, no click-to-edit)                                                                        |
| Source mode           | Raw ABC text (Obsidian default code-block behavior)                                                                            |
| Sync                  | Debounced live sync ~**300ms**; **file is source of truth**                                                                    |
| Empty block           | Staff + toolbar with implicit defaults (4/4, C major, treble); ABC generated on **first edit**; file can stay empty until then |
| Invalid ABC           | Graceful fallback — monospace ABC + friendly message; **no red error banner**                                                  |
| v1 editor             | **Lightweight composer (B):** toolbar durations + accidentals, click to place, select/delete. **Not** MuseScore-lite           |
| Default note duration | Quarter                                                                                                                        |
| v1 musical elements   | Treble only; key/time sig; whole/half/quarter/eighth; rests; accidentals; **single pitch per note** (no chords)                |
| Measure limit         | Soft 4-measure **warning** (not hard cap); pasted ABC can exceed                                                               |
| Playback              | **No playback in v1**                                                                                                          |
| Settings              | **No settings panel in v1** (`settings/types.ts` hook points reserved for Phase 7)                                             |
| Insert command        | **No insert command in v1**                                                                                                    |
| Staff layout (v2)     | Flexible 1–2 staves, clefs configurable; UI + ABC equally editable; max 2 staves                                               |
| Chords (v2+)          | Multiple pitches per note                                                                                                      |
| Distribution          | Personal use now; community-ready docs; long-term community plugin release                                                     |


---

## Architecture (layered model B)

```
ABC text  ←→  ScoreModel  →  Renderer (abcjs SVG)
                    ↑
                Editor UI
```

**Modules** (under `src/`):


| Module        | Responsibility                                                  |
| ------------- | --------------------------------------------------------------- |
| `plugin/`     | Obsidian integration — code block processor registration        |
| `model/`      | `Score` types and immutable updates                             |
| `serializer/` | ABC ↔ `Score` parse/write; implicit defaults                    |
| `renderer/`   | `Score` or ABC → SVG via abcjs                                  |
| `editor/`     | Live Preview widget, toolbar, staff interaction, debounced sync |
| `ui/`         | Fallback UI, measure warning                                    |
| `settings/`   | Vault settings types (UI in Phase 7+)                           |


**Data flow:**

1. **Read:** markdown ` ```abc ` body → parser → `Score` → renderer → SVG
2. **Write:** editor gesture → `Score` update → writer → debounced markdown patch
3. **Empty:** no ABC in file → implicit defaults in memory → staff shell UI; first edit writes ABC

---

## Tech stack


| Layer           | Choice                              |
| --------------- | ----------------------------------- |
| Language        | TypeScript (`strict`)               |
| Platform        | Obsidian plugin API                 |
| Notation render | **abcjs** (Phase 2+)                |
| Bundler         | esbuild (`esbuild.config.mjs`)      |
| Package manager | npm                                 |
| Lint            | ESLint + `eslint-plugin-obsidianmd` |


---

## Non-goals (explicit)

Do **not** build these in v1 (and avoid scope creep toward them):

- Full score editor (MuseScore-like features, parts, layout, engraving polish)
- Audio playback or MIDI export
- Chords or multiple simultaneous pitches (v2+)
- Multi-staff / grand staff (v2+)
- Vault-wide settings UI (Phase 7+)
- Insert-block command or hotkey (Phase 7+)
- MusicXML import/export
- Mobile-optimized visual editing (desktop-first editing; `isDesktopOnly: false` for load compatibility)
- Cloud sync, telemetry, or network calls
- Hard cap on measure count
- Red error banners or stack traces in the note UI

---

## Example ABC block

````markdown
```abc
X:1
M:4/4
L:1/4
K:C
CDEF|GABc|
```
````

**Implicit defaults** (empty block, before first edit):

- Time: `4/4`
- Key: `C` major
- Clef: treble
- Default note length: quarter (`L:1/4` when ABC is first written)

---

## User flows

### 1. Create a new example (empty block)

1. User types ` ```abc ` and closes the fence in Live Preview.
2. Plugin shows empty staff shell + toolbar (no ABC in file yet).
3. User selects quarter note on toolbar, clicks staff → note appears.
4. After ~300ms debounce, ABC headers + body are written to the block.

### 2. Edit existing ABC (hybrid)

1. User opens note in Live Preview; block already contains ABC.
2. Plugin parses ABC → `Score` → renders staff.
3. User clicks to add/change/delete notes via toolbar.
4. Debounced sync updates the ` ```abc ` body in markdown.

### 3. Paste ABC from elsewhere

1. User pastes valid ABC into Source mode or the block body.
2. Live Preview re-parses and renders.
3. Pasted content may exceed 4 measures; soft warning may appear in Phase 5+.

### 4. Invalid ABC

1. User enters malformed ABC.
2. Plugin shows monospace ABC + short friendly message (e.g. “Couldn’t render this ABC”).
3. No crash, no red banner; note remains editable.

### 5. Reading view

1. User switches to Reading view.
2. Block shows static notation only (no toolbar, no interaction).
3. Same render path as Live Preview read side.

### 6. Source mode

1. User switches to Source mode.
2. Raw ` ```abc ` fence content is visible and editable as plain text.
3. No custom widget overlay in Source mode.

---

## Phase plan & exit criteria

Phases run **serially** (0 → 1 → 2 → … → 7+). Within a phase, steps marked **parallel** can proceed concurrently once their blockers are done. See [Kanban reference](#kanban-step-reference) below.

### Phase 0 — Project shell ✅ DONE

**Goal:** Repo and dev environment exist; plugin loads in Obsidian harmlessly.


| Step | Task                               | Kind     | Exit                          |
| ---- | ---------------------------------- | -------- | ----------------------------- |
| 0.1  | Create plugin from sample template | Serial   | `npm run dev` compiles        |
| 0.2  | Configure `manifest.json`          | Serial   | id `abc-blocks`, v0.1.0       |
| 0.3  | Folder layout (stub modules)       | Parallel | All module dirs + stubs exist |
| 0.4  | README skeleton                    | Parallel | Dev setup documented          |
| 0.5  | Dev vault workflow                 | Serial   | Symlink instructions verified |


**Phase exit:** Plugin enables in dev vault; stubs compile; no runtime errors.

---

### Phase 1 — Block lifecycle ✅ DONE

**Goal:** Obsidian recognizes ` ```abc ` blocks; correct behavior per view mode.


| Step | Task                                                    | Kind       | Blocked by    |
| ---- | ------------------------------------------------------- | ---------- | ------------- |
| 1.1  | Register `registerMarkdownCodeBlockProcessor('abc', …)` ✅ | **Serial** | —             |
| 1.2  | Reading view render path ✅                                | Parallel   | 1.1           |
| 1.3  | Live Preview interactive container ✅                      | Parallel   | 1.1           |
| 1.4  | Preserve Source mode (raw ABC) ✅                          | Parallel   | 1.1           |
| 1.5  | Detect empty / whitespace blocks ✅                        | **Serial** | 1.2, 1.3, 1.4 |


**Recommended order:** 1.1 → (1.2 ∥ 1.3 ∥ 1.4) → 1.5

**Phase exit:** ` ```abc ` blocks render distinct UI in Live Preview vs Reading; Source shows raw text; empty blocks detected.

**Agent notes (Phase 1.2–1.4, do not change plan):** View routing lives in `src/plugin/` — `code-block.ts` delegates to `view-mode.ts`, `render-reading.ts`, and `render-live-preview.ts`. See [Agent development notes](#agent-development-notes) for Obsidian view-detection pitfalls verified in dev.

**Agent notes (Phase 1.5):** Empty detection is centralized in `src/plugin/block-source.ts` (`isEmptyAbcBlockSource`). Whitespace-only fence bodies count as empty. Both render paths set `data-abc-content="empty"` and class `abc-blocks-empty`. Staff shell UI for empty blocks is **Phase 2.3**, not 1.5.

---

### Phase 2 — Read path ✅ DONE

**Goal:** Valid ABC renders; invalid uses fallback; empty uses implicit defaults.


| Step | Task                                        | Kind       | Blocked by |
| ---- | ------------------------------------------- | ---------- | ---------- |
| 2.1  | Integrate abcjs render path ✅               | **Serial** | —          |
| 2.2  | Graceful fallback UI ✅                      | Parallel   | 2.1        |
| 2.3  | Empty block implicit defaults (staff shell) ✅ | Parallel   | 2.1        |
| 2.4  | Reading view static render ✅                | Parallel   | 2.1        |


**Recommended order:** 2.1 → (2.2 ∥ 2.3 ∥ 2.4)

**Phase exit:** Sample ABC block renders SVG in Reading + Live Preview; bad ABC shows fallback; empty block shows staff shell.

---

### Phase 3 — Music model + serializer ✅ DONE

**Goal:** Unit-testable `Score` ↔ ABC round-trip for v1 subset.


| Step | Task                                         | Kind       | Blocked by |
| ---- | -------------------------------------------- | ---------- | ---------- |
| 3.1  | Define `ScoreModel` types (v1 subset) ✅      | **Serial** | —          |
| 3.2  | `abc-writer`: model → ABC ✅                    | Parallel   | 3.1        |
| 3.3  | `abc-parser`: ABC → model ✅                    | Parallel   | 3.1        |
| 3.4  | Map key, time, durations, rests, accidentals ✅ | **Serial** | 3.2, 3.3   |
| 3.5  | Default note duration = quarter ✅              | Parallel   | 3.1        |
| 3.6  | Defer chords / multi-staff in parser ✅         | **Serial** | 3.3        |


**Phase exit:** Round-trip tests pass for v1 elements; parser rejects/ignores chords and second staff gracefully. Verified via `npm run test:roundtrip`.

---

### Phase 4 — Write path (sync)

**Goal:** Editor changes persist to markdown with debounce.


| Step | Task                                    | Kind       | Blocked by | Status |
| ---- | --------------------------------------- | ---------- | ---------- | ------ |
| 4.1  | Wire model → writer → document update   | **Serial** | —          | ✅     |
| 4.2  | Debounced sync (~300ms)                 | **Serial** | 4.1        | ✅     |
| 4.3  | First-edit generates ABC on empty block | Parallel   | 4.1        | ✅     |
| 4.4  | Validate Obsidian undo behavior         | **Serial** | 4.2        | ✅     |
| 4.5  | Source mode reflects Live Preview edits | **Serial** | 4.2        | —      |


**Phase exit:** Edits in Live Preview update file; undo works; Source shows updated ABC.

**Agent notes (Phase 4 — write path, undo, multi-block Live Preview):** Steps 4.1–4.4 are **complete** (verified in dev vault, June 2026). Write path: `src/editor/sync.ts`, `src/editor/abc-block-patch.ts`, per-block `AbcSyncScheduler` (~300ms). First edit on empty fence: `syncScoreToAbcBlock` / phase 4.3 dev button. Undo (4.4): `flushAbcSyncScheduler()` on shell unmount (`src/editor/sync-lifecycle.ts`). Multi-block LP identity: `block-identity.ts`, `block-dom.ts`, `block-source.ts`, `code-block.ts`, `render-live-preview.ts` — see tables below. Manual checklist (4.4 exit, executed): `docs/manual-tests/phase-4-undo.md`.

#### Symptom → cause → fix

| Symptom | Cause | Fix (where) |
| ------- | ----- | ----------- |
| One button updated two fences / wrong fence in Source | `getSectionInfo().lineStart` and processor **call order** are unreliable in LP; render ordinal could map block 1 → second fence | `resolveAbcBlockOpenLine()` + `claimAbcBlockRenderOrdinal()` / `getAmbiguousSectionLineStarts()` (`abc-block-patch.ts`, `block-ordinal.ts`); **authoritative** mapping via `resolveBlockOpenLineFromPreviewDom()` — embed index among `.cm-embed-block` hosts → fence open line (`block-dom.ts`); DOM resolve on **write** in shell `syncContext()` |
| Sibling block showed notation while Source showed it empty | After a write, Obsidian re-processes siblings and fires `editor-change`; stale `data-abc-open-line` + `chooseBestAbcSource()` (prefers music lines) made block 2 **read** block 1’s ABC; a mount guard then **blocked** UI recovery | When `blockOpenLine` is set, read **only** that fence body — no merge (`readAbcBodyAtFenceLine` / `readAbcBodyAtBlockIndex` in `block-source.ts`); never fall through to `chooseBestAbcSource` for a stale line hint; removed the music-line mount skip guard (`render-live-preview.ts`) |
| Manual Source edit of block 1 changed block 2 **appearance** only | Same as above on `editor-change` refresh, or stale open line after line-number shift | Prefer **stable block index** (`data-abc-block-index`) → `openLineForAbcBlockIndex()`; validate cached open line before reuse; skip refresh when line cannot be resolved |
| Block 2 mirrored block 1 via **inline embed source** (per-block pencil in LP), **not** note-level Source mode | Inline edit hides block 1’s preview embed → `listAbcBlockEmbedHosts()` count ≠ fence count; Obsidian re-runs block 2’s processor **alone** (`renderOrdinal` 0); `el.empty()` destroys the shell **before** inner `data-abc-block-index` helps; wrong ABC mounted | Persist identity on **processor `el`** (`block-identity.ts` — survives `el.empty()`); **skip** destructive processor re-render when `isPreviewAbcMappingUnreliable()` and shell already exists (`code-block.ts`); read ABC by **block index** (`readAbcBodyAtBlockIndex`); suppress `editor-change` / reconcile refresh while mapping unreliable (`render-live-preview.ts`) |
| Full note Source mode (pencil icon) — no sibling bleed | Processor not invoked; LP shells inactive | No plugin change needed; contrasts with inline embed path above |
| Block 2 button OK, block 1 button wrote block 2 | Trusted duplicate `lineStart` for block 2; block 1 fell through to ordinal 1 → second fence | Prefer DOM index over ordinal when ambiguous; drop “nearest fence” guessing in `findAbcBlockFenceRange` |
| Ghost write / undo corruption after navigating away mid-debounce | `onunload` called `cancel()` on scheduler; or timer fired after shell teardown | `flushAbcSyncScheduler()` in `onunload` (`sync-lifecycle.ts`, `render-live-preview.ts`) |

#### Two ways to edit Source in Live Preview

| UI | Obsidian behavior | Plugin impact |
| ---- | ----------------- | --------------- |
| **Note-level Source** (top pencil) | Entire note raw markdown; no code-block processor | Safe — no LP widget refresh |
| **Inline embed source** (small icon on one fence) | That block’s preview embed hidden; sibling processors may re-run in isolation | **Unreliable** DOM ordinal mapping — use persisted block index + skip re-render (see table above) |

#### Identity model (do not regress)

1. **Block index** (0-based among ` ```abc ` fences in file) — stable across inline sibling source edit; stored on processor `el` and shell (`block-identity.ts`).
2. **Fence open line** (0-based line of opening ` ```abc `) — can shift when content above grows/shrinks; derive from index via `openLineForAbcBlockIndex()` when refreshing.
3. **DOM embed order** — authoritative only when `hosts.length === fenceCount` (`isAbcEmbedHostCountReliable`); else do not remap index or re-run `el.empty()`.

**Modules:** `block-identity.ts`, `block-dom.ts`, `block-source.ts`, `code-block.ts`, `render-live-preview.ts`, `sync-lifecycle.ts`.

**Tests:** `npm run test:abc-block-patch`, `npm run test:abc-sync-debounce`. **Manual:** `docs/manual-tests/phase-4-undo.md` (sections 5a / 5b for Source vs inline embed).

---

### Phase 5 — Visual editor

**Goal:** Lightweight composer for v1.


| Step | Task                                | Kind       | Blocked by |
| ---- | ----------------------------------- | ---------- | ---------- |
| 5.1  | Toolbar: duration + accidentals     | **Serial** | —          |
| 5.2  | Click staff to place notes          | **Serial** | 5.1        |
| 5.3  | Select existing note                | **Serial** | 5.2        |
| 5.4  | Delete selected note                | Parallel   | 5.3        |
| 5.5  | Change duration on selection        | Parallel   | 5.3        |
| 5.6  | Rests via toolbar                   | Parallel   | 5.2        |
| 5.7  | Key / time signature controls       | Parallel   | 5.1        |
| 5.8  | Soft 4-measure warning              | Parallel   | 5.2        |
| 5.9  | Strip editor chrome in Reading view | **Serial** | 5.1        |


**Phase exit:** Full v1 editing loop works; Reading view has no chrome; measure warning appears after threshold.

---

### Phase 6 — Polish + docs

**Goal:** v1 shippable for personal use.


| Step | Task                                 | Kind     |
| ---- | ------------------------------------ | -------- |
| 6.1  | README: quick start + examples       | Parallel |
| 6.2  | LIMITATIONS section                  | Parallel |
| 6.3  | Manual test checklist                | Parallel |
| 6.4  | Error copy pass                      | Parallel |
| 6.5  | Settings types + hook points (no UI) | Parallel |


**Phase exit:** Docs complete; manual checklist executed; friendly error strings throughout.

---

### Phase 7+ — v2 foundations


| Step | Task                               | Kind     | Notes                    |
| ---- | ---------------------------------- | -------- | ------------------------ |
| 7.1  | Chords (multiple pitches per note) | Serial   | Model + parser + editor  |
| 7.2  | Second staff + clef picker (max 2) | Serial   | After 7.1                |
| 7.3  | Staff layout UI ↔ ABC sync         | Serial   | After 7.2                |
| 7.4  | Settings tab (vault defaults)      | Parallel | Uses `settings/types.ts` |
| 7.5  | Insert ABC block command           | Parallel |                          |
| 7.6  | Per-block playback                 | Parallel |                          |
| 7.7  | Community release prep             | Serial   | After 6.1, 6.2           |


---

## Kanban step reference

Full interactive board: `.cursor/projects/.../canvases/obsidian-music-plugin-kanban.canvas.tsx` (local Cursor canvas).

**Phase gates (always serial):**


| From    | To       | Why                                           |
| ------- | -------- | --------------------------------------------- |
| Phase 0 | Phase 1  | Plugin must load before block registration    |
| Phase 1 | Phase 2  | Block handler must exist before rendering     |
| Phase 2 | Phase 3  | Render spike de-risks abcjs before model work |
| Phase 3 | Phase 4  | Serializer must exist before document sync    |
| Phase 4 | Phase 5  | Sync must work before visual editing          |
| Phase 5 | Phase 6  | Feature-complete before polish ship           |
| Phase 6 | Phase 7+ | v1 personal-ship before v2 expansion          |


**Critical path (serial spine):**  
0.1 → 0.2 → 0.5 → 1.1 → 1.5 → 2.1 → 3.1 → 3.4 → 4.1 → 4.2 → 4.4 → 5.1 → 5.2 → 5.3 → 5.9 → 6.x → 7.1 → 7.2 → 7.3 → 7.7

---

## Continuing work in a new session

Future Cursor agents have **no prior chat context**. Start every implementation session here:

### Files to @-mention


| File             | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `docs/DESIGN.md` | Product intent, locked decisions, phase plan (this file) |
| `AGENTS.md`      | Module map, do/don't, dev workflow                       |
| `README.md`      | Quick start, symlink setup, build commands               |
| `LIMITATIONS.md` | Current scope and what is explicitly out of scope        |


### Example prompts

```
Read docs/DESIGN.md and AGENTS.md, then implement Phase 1.
```

```
Continue Phase 4 — implement step 4.5 (Source mode reflects Live Preview edits) per DESIGN.md.
```

```
Phase 1 is done. Start Phase 2.1: integrate abcjs render path.
```

### Before coding

1. Confirm **current phase** in this file’s status line and `README.md`.
2. Identify the **step id** (e.g. 1.1) and its blockers from the phase tables above.
3. Touch only modules listed for that phase; keep stubs until their phase.
4. Run `npm run dev` and test in the **dev vault** (`Desktop/Ideas/Obsidian Dev Vault`).

### Repository

- **GitHub:** [https://github.com/milestnnr-music/obsidian-music-notation](https://github.com/milestnnr-music/obsidian-music-notation)
- **Local path:** `/Users/milestanner/Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks`
- **Plugin folder in vault:** `.obsidian/plugins/abc-blocks/` (symlink to repo root)

---

## Agent development notes

Notes from implementation sessions for future agents. **These do not change the phase plan above** — they document how Obsidian behaves and where code landed.

### Reading vs Live Preview detection (Phase 1.2 / 1.3)

`registerMarkdownCodeBlockProcessor` runs in **Reading view** and **Live Preview**, but **not** in Source mode (fence stays raw CodeMirror text — Phase 1.4 requires no extra overlay).

**Do not** detect Live Preview with `el.closest('.markdown-source-view')`. That was tried first and failed: Live Preview embeds rendered blocks under CodeMirror, not reliably under `.markdown-source-view`, so both views fell through to the Reading renderer.

**Use** `src/plugin/view-mode.ts` (`detectAbcBlockViewMode(app, el)`):

1. `el.closest('.markdown-reading-view')` → **Reading**
2. Else find the `MarkdownView` leaf that contains `el` (`iterateAllLeaves` + `containerEl.contains`); if `currentMode === previewMode` → **Reading**
3. Else → **Live Preview**

**Also avoid** `MarkdownView.getMode() === 'preview'` alone — it is true for both Reading and Live Preview.

### View routing and CSS hooks (Phase 1)

| View | Module | Root classes | Phase 2+ work |
| ---- | ------ | ------------ | ------------- |
| Reading | `render-reading.ts` | `abc-blocks-reading`, `abc-blocks-static` | abcjs SVG + empty staff shell (2.3–2.4 ✅) |
| Live Preview | `render-live-preview.ts` | `abc-blocks-live-preview`, `abc-blocks-interactive`, `abc-blocks-editor-mount` | abcjs + fallback + empty shell (2.1–2.3 ✅); editor UI in Phases 5+ |
| Source | *(processor not invoked)* | — | Edits visible when toggling to LP; sync 4.1–4.4 ✅; 4.5 verification pending |

Live Preview shell registers a `MarkdownRenderChild` that mounts `mountEditorWidget()` from `editor/editor-widget.ts` (stub until Phase 5).

### Manual check after view-routing changes

In dev vault, use a note with a sample ` ```abc ` block. **Reload app without saving** after code changes.

- **Live Preview:** click outside the fence → dashed accent border, “Live Preview” badge, editor widget stub
- **Reading view:** book icon → solid border, “Reading view” badge, static abcjs SVG (invalid ABC → fallback; no editor stub)
- **Source mode:** raw fence only; no `abc-blocks-*` DOM

Phase 5.9 (“strip editor chrome in Reading view”) should keep using the separate Reading render path — do not mount toolbar/editor UI from `render-reading.ts`.

### Phase 4 — debounced sync, undo, multi-block identity (4.1–4.4)

**Debounced write:** `AbcSyncScheduler` in `src/editor/sync.ts` (~300ms). One pending callback per block shell.

**Undo (4.4):** On shell `onunload`, call `flushAbcSyncScheduler()` (`src/editor/sync-lifecycle.ts`) — not `cancel()` — so the last edit is committed before teardown and the debounce timer cannot fire afterward.

**Reading fence body:** Never use `chooseBestAbcSource()` when a block index or open line is known — it prefers fences with music lines and will attach block 1’s ABC to block 2 in multi-block notes.

**Processor re-render trap:** Correct `data-abc-block-index` on the inner shell is **not** sufficient. Obsidian calls `registerMarkdownCodeBlockProcessor` again during inline embed edits; `code-block.ts` runs `el.empty()` on the processor host, destroying children. Identity must live on the processor `el`, and sibling blocks must skip full re-render when `isPreviewAbcMappingUnreliable()` returns true.

**Dev verification (4.4 exit — ✅ done):**

```bash
npm run build
npm run lint
npm run test:abc-sync-debounce
npm run test:abc-block-patch
```

Manual checklist `docs/manual-tests/phase-4-undo.md` executed in dev vault (reload app without saving after `npm run dev`).

---

## Error & UX copy principles

- Sentence case; short imperatives for actions
- Never show stack traces or “Error:” banners in the note
- Invalid ABC: show raw ABC in monospace + one-line friendly explanation
- Measure warning: informational, dismissible or subtle — not blocking

---

## Version & release notes (future)

- Bump `manifest.json` `version` (SemVer) per release
- Update `versions.json` with min app version mapping
- Community release (Phase 7.7): follow [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

