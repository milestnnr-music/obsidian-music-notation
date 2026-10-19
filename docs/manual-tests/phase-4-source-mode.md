# Phase 4.5 — Source mode reflects Live Preview sync edits

**Goal:** After a debounced sync write in Live Preview, toggling to **Source mode** shows the updated ````abc`fence body. The open editor buffer is what Source displays; sync writes use`applyAbcBodyViaEditor` when the markdown editor is open (Phase 4.1–4.2).

**Prerequisites**

- Dev vault symlinked per [README.md](../../README.md) (`Desktop/Ideas/Obsidian Dev Vault`)
- `npm run dev` running; **Reload app without saving** after pulling this change
- ABC Blocks enabled in Community plugins
- Note open in **Live Preview** (not Reading view)

**Read-path note (4.5):** `readNoteMarkdown()` in `block-source.ts` prefers `editor.getValue()` over `MarkdownView.data` when an editor exists, so plugin reads match the buffer Source mode shows after LP sync.

---

## Setup note

Create a test note, e.g. `Phase 4 source mode tests.md`, with:

```markdown
# Source mode tests

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

The first block has ABC; the second is empty (whitespace-only fence body).

---

## 1. Filled block — LP write → Source


| Step | Action                                                                    | Expected                                                                                                 |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1.1  | Open the note in Live Preview; click **outside** the first ````abc` block | Dashed border, “Live Preview” badge, **Write test note (phase 4.2)** button visible                      |
| 1.2  | Click **Write test note (phase 4.2)**                                     | Staff / widget updates                                                                                   |
| 1.3  | Wait **≥ 400 ms** for debounce                                            | Notice: “ABC block updated (phase 4.2 test)”                                                             |
| 1.4  | Toggle **Source mode** (toolbar or hotkey)                                | Raw markdown visible; **no** `abc-blocks-`* plugin DOM                                                   |
| 1.5  | Inspect the **first** fence body                                          | Contains `CDEF|GABc|` (or current phase 4.2 test ABC); opening/closing ````abc` / ````` fences unchanged |
| 1.6  | Toggle back to Live Preview                                               | Block still renders the synced ABC; no duplicate fences                                                  |


**Pass:** Source shows the same ABC body that sync wrote; fences are intact.

---

## 2. Empty block — first edit → Source


| Step | Action                                              | Expected                                                                                                             |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Click outside the **second** (empty) ````abc` block | Empty staff shell; **Place first note (phase 4.3)** button if shown                                                  |
| 2.2  | Click **Place first note (phase 4.3)**              | Widget updates                                                                                                       |
| 2.3  | Wait **≥ 400 ms**                                   | Notice: “First edit saved (phase 4.3 test)”                                                                          |
| 2.4  | Toggle **Source mode**                              | Second fence body has ABC headers + first note (e.g. `X:1`, `M:4/4`, `L:1/4`, `K:C`, and a note line); **not** blank |
| 2.5  | First fence unchanged                               | Still `CDEF|` (or whatever block 1 had before this test)                                                             |


**Pass:** First edit on an empty fence appears in Source; other blocks untouched.

---

## 3. Two blocks — isolation


| Step | Action                                                                                                | Expected                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 3.1  | Return to Live Preview; click outside **block 1**; run **Write test note (phase 4.2)**; wait ≥ 400 ms | Only **first** fence body changes in Source                                         |
| 3.2  | Click outside **block 2**; run **Place first note (phase 4.3)** if needed; wait ≥ 400 ms              | Only **second** fence body changes                                                  |
| 3.3  | Source mode: scroll both fences                                                                       | Block 1 = test ABC (`CDEF|GABc|`); block 2 = first-edit ABC; no cross-contamination |
| 3.4  | Live Preview: both blocks                                                                             | Each renders its own fence body from Source                                         |


**Pass:** Multi-block notes keep per-fence identity in Source after LP sync (see DESIGN.md Phase 4 agent notes).

---

## 4. Empty vs has-content (no spurious writes)


| Step | Action                                                                | Expected                                                     |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| 4.1  | New note with a single **empty** ````abc` fence; open in Live Preview | Staff shell; fence body empty in Source                      |
| 4.2  | Do **not** click sync test buttons; wait 1 s; check Source            | Fence body still empty (no headers written until first edit) |
| 4.3  | Note with existing ABC; open in Live Preview **without** editing      | Source and LP agree on current ABC; no surprise overwrite    |


**Pass:** Empty fences stay empty in Source until a real first edit; existing ABC is not clobbered by merely opening LP.

---

## 5. Split Source + Live Preview (optional)


| Step | Action                                                                            | Expected                                          |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| 5.1  | Open the test note with **split** Source + Live Preview                           | Both panes show the same note                     |
| 5.2  | In LP, run **Write test note** on block 1; wait ≥ 400 ms                          | Source pane updates to match (same editor buffer) |
| 5.3  | Edit ABC manually in Source pane (e.g. change `K:C` to `K:G`); switch focus to LP | LP re-parses updated ABC after processor refresh  |


**Pass:** Sync writes appear in an open Source pane without reload; manual Source edits remain visible when returning to LP.

---

## 6. Dev verification commands

From repo root:

```bash
npm run build
npm run lint
npm run test:abc-block-patch
```

All three must pass before marking 4.5 done.

---

## Failure signals (file a follow-up)

- Source shows **old** ABC after debounce settled and LP widget shows new notation → sync may have used `vault.modify` while editor was open, or editor buffer not updated.
- **Wrong fence** updated in Source → block identity bug (DOM open line); not a Source-mode overlay issue.
- Source shows plugin DOM or rendered staff → view mode routing bug (processor should not run in Source).

