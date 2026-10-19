# Phase 4.4 — Manual undo & debounced sync checklist

**Status:** ✅ **Complete** (dev vault verified; automated tests passing).

**Goal:** Confirm Live Preview ABC edits persist correctly and Obsidian undo/redo stays coherent when debounced sync (~300ms) is pending.

**Prerequisites**

- Dev vault symlinked per [README.md](../../README.md) (`Desktop/Ideas/Obsidian Dev Vault`)
- `npm run dev` running; **Reload app without saving** after pulling this change
- ABC Blocks enabled in Community plugins
- Note open in **Live Preview** (not Reading view)

**Implementation note (4.4):** `AbcLivePreviewShell.onunload` calls `flushAbcSyncScheduler()` so any pending debounced write runs before the block shell tears down. That prevents a timer-fired write from landing after unmount (ghost write / undo corruption). Helper lives in `src/editor/sync-lifecycle.ts`.

---

## Setup note

Create a test note, e.g. `Phase 4 undo tests.md`, with:

```markdown
# Undo tests

```abc
X:1
M:4/4
L:1/4
K:C
CDEF|
```

```abc

```
```

The first block has ABC; the second is empty (for first-edit / 4.3 button tests).

---

## 1. Edit → wait → undo → redo (single block)


| Step | Action                                                                    | Expected                                                           |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1.1  | Open the note in Live Preview; click **outside** the first ````abc` block | Dashed border, “Live Preview” badge, phase 4.2 test button visible |
| 1.2  | Click **Write test note (phase 4.2)**                                     | Staff / widget updates; wait **≥ 400 ms** for debounce             |
| 1.3  | Toggle **Source mode** (or open split Source)                             | Fence body shows `CDEF|GABc|` (or current test ABC)                |
| 1.4  | Return to Live Preview; **Cmd/Ctrl+Z** once                               | Markdown reverts to prior ABC (e.g. `CDEF|` only)                  |
| 1.5  | **Cmd/Ctrl+Shift+Z** (redo)                                               | Test ABC restored in Source                                        |
| 1.6  | Live Preview re-renders after undo/redo                                   | Block matches Source; no duplicate fences or wrong block updated   |


**Pass:** One undo step reverses the sync write; redo restores it; no extra ABC appearing in the wrong block.

---

## 2. Two blocks — correct fence, undo isolation


| Step | Action                                                                                          | Expected                                                           |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2.1  | Click outside **block 1**; run **Write test note (phase 4.2)**; wait ≥ 400 ms                   | Only **first** fence body changes in Source                        |
| 2.2  | Click outside **block 2** (empty); run **Place first note (phase 4.3)** if shown; wait ≥ 400 ms | Only **second** fence gets headers + first note; block 1 unchanged |
| 2.3  | **Cmd/Ctrl+Z** repeatedly until block 2 edit is undone                                          | Block 1 ABC unchanged throughout                                   |
| 2.4  | Redo block 2 edit                                                                               | Block 2 ABC returns; block 1 still correct                         |


**Pass:** Each block’s sync and undo steps affect only that fence (see DESIGN.md multi-block identity notes).

---

## 3. Rapid clicks before debounce completes


| Step | Action                                                                                               | Expected                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 3.1  | On block 1, click **Write test note** 3–5 times quickly (< 300 ms apart)                             | At most **one** logical write after debounce settles                                                          |
| 3.2  | Wait ≥ 400 ms; check Source                                                                          | Single updated body (not duplicated lines or multiple partial writes)                                         |
| 3.3  | **Cmd/Ctrl+Z** once                                                                                  | Reverts the batched write as one undo step                                                                    |
| 3.4  | Scroll away / switch note / toggle Reading then back to Live Preview **within 300 ms** after a click | Either pending edit is flushed on unmount (Source shows final ABC) or no ghost write appears after navigation |


**Pass:** Coalesced debounce; no double-write; unmount flush does not leave a late write that breaks a subsequent undo.

---

## 4. Undo before debounce fires (edge case)


| Step | Action                                                                | Expected                                                                                                   |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 4.1  | Edit block (phase 4.2 button); within **200 ms** press **Cmd/Ctrl+Z** | Document behavior: undo may target the sync write once it lands, or prior content if write not yet applied |
| 4.2  | Wait ≥ 400 ms; inspect Source and undo history                        | No “stuck” state: ABC matches what undo/redo shows; no surprise re-appearance after waiting                |


**Pass / note:** Full widget-driven undo (Phase 5) is out of scope. Flag any case where ABC in Source disagrees with visible undo state after debounce settles — file a follow-up.

---

## 5. Manual Source edit — sibling block must not mirror block 1

### 5a. Full Source mode (pencil icon — entire note)


| Step | Action                                                        | Expected                                 |
| ---- | ------------------------------------------------------------- | ---------------------------------------- |
| 5a.1 | Two-block note; switch note to **Source** via the pencil icon | Raw fences only; no plugin widgets       |
| 5a.2 | Edit **block 1** ABC; return to Live Preview                  | Block 2 unchanged in LP and in its fence |


### 5b. Inline embed source (per-block pencil on the embed)


| Step | Action                                                                                        | Expected                                                                     |
| ---- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 5b.1 | Stay in **Live Preview**; two-block note with block 1 containing music                        | Block 2 empty shell                                                          |
| 5b.2 | Click the **small inline source icon** on **block 1 only** (not the note-level Source toggle) | Block 1 shows raw ````abc` text inline; block 2 stays in preview widget      |
| 5b.3 | Edit block 1 ABC inline; wait ≥ 400 ms                                                        | Block 2 LP appearance **unchanged**; block 2 fence in markdown **unchanged** |
| 5b.4 | Close inline source on block 1 (click away or toggle icon)                                    | Both blocks render correctly; fences balanced                                |


**Pass:** Sibling display uses **stable block index** (`data-abc-block-index`), not a remapped DOM index while block 1’s preview embed is hidden during inline source edit.

---

## 6. Dev verification commands

From repo root:

```bash
npm run build
npm run lint
npm run test:abc-sync-debounce
npm run test:abc-block-patch
```

**4.4 exit:** all commands above pass; sections 1–5b executed in dev vault. Re-run section 5 after any change to `block-source.ts`, `block-identity.ts`, `code-block.ts`, or `render-live-preview.ts` refresh logic.