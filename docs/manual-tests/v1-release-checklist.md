# v1.1.0 — Release manual test checklist

**Status:** ✅ **Signed off** — v1.1.0 release checklist complete in dev vault (2026-06-12).

**Goal:** Confirm ABC Blocks v1 works end-to-end in the dev vault — install, render in all view modes, visual edit loop, debounced sync, measure warning, Reading chrome, and core regressions.

**Prerequisites**

- Dev vault at `Desktop/Ideas/Obsidian Dev Vault` (separate from your main vault)
- Plugin repo built: `npm run build` (or `npm run dev` watching `src/` → `main.js`)
- Symlink and enable steps in [README.md](../../README.md) → *Development setup*

**Related checklists (do not skip for release sign-off)**

- Reading view chrome: [phase-5.8-reading-view.md](./phase-5.8-reading-view.md)
- Undo after debounced sync: [phase-4-undo.md](./phase-4-undo.md)
- Source reflects Live Preview sync: [phase-4-source-mode.md](./phase-4-source-mode.md) (§1–4 required)

---

## Setup note

Create a test note, e.g. `ABC Blocks v1 release test.md`, with:

````markdown
# v1 release test

## Valid melody

```abc
X:1
M:4/4
L:1/4
K:C
CDEF|GABc|
```

## Invalid ABC

```abc
X:1
M:4/4
K:C
not valid abc music
```

## Empty block

```abc

```

## Second block (sync isolation)

```abc
X:2
M:3/4
L:1/8
K:G
GAB c2|
```
````

Open the note in **Live Preview** unless a section says otherwise. After toolbar or staff edits, wait **≥ 400 ms** before checking Source or undo (debounce is ~300 ms).

---

## 1. Install


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 1.1 | Symlink repo to dev vault per README (`plugins/abc-blocks` → repo root; `manifest.json` at symlink root) | `.../plugins/abc-blocks/manifest.json` exists; not nested `abc-blocks/obsidian-abc-blocks/` | ✅ |
| 1.2 | Run `npm run build` (or `npm run dev`) from repo root | `main.js` updated; no build errors | ✅ |
| 1.3 | Open dev vault in Obsidian; **Settings → Community plugins** → turn on community plugins | Community plugins section available | ✅ |
| 1.4 | Enable **ABC Blocks** under Installed plugins | Plugin toggles on without error toast | ✅ |
| 1.5 | **Command palette → Reload app without saving** | App reloads; ABC Blocks still enabled | ✅ |
| 1.6 | Open the test note (create if needed) | Note opens; no console errors related to `abc-blocks` | ✅ |

**Section pass:** Plugin loads from symlink; enable + reload succeeds; note opens cleanly.

---

## 2. Render


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 2.1 | **Live Preview** — valid melody block | abcjs SVG notation visible; dashed border + “Live Preview” badge when block is focused; toolbar present | ✅ |
| 2.2 | **Reading view** — same note (book icon or *Toggle reading view*) | Valid block shows static SVG only — no badge, toolbar, or click-to-edit (see §6) | ✅ |
| 2.3 | **Live Preview** — invalid ABC block | Friendly message (“Couldn't render this ABC.”) + monospace source; **no** red error banner | ✅ |
| 2.4 | **Reading view** — invalid ABC block | Same fallback message + source; still no editor chrome | ✅ |
| 2.5 | **Live Preview** — empty block | Treble staff shell + toolbar; implicit 4/4, C major; fence body still empty in Source until first edit | ✅ |
| 2.6 | **Reading view** — empty block (if present) | Empty staff shell only; no LP chrome | ✅ |

**Section pass:** Valid ABC renders in LP and Reading; invalid ABC fails gracefully; empty block shows defaults without writing ABC prematurely.

---

## 3. Edit loop

Use the **valid melody** block unless noted. Click **outside** the fence first so the block shows LP chrome.


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 3.1 | Quarter duration selected; hover staff | Horizontal guide line at snapped pitch | ✅ |
| 3.2 | Click a measure on the staff | Note appends to end of that measure; staff re-renders | ✅ |
| 3.3 | **Shift+hover** a placed note, then **Shift+click** it | Outline highlight on that note; no placement guide line while Shift held | ✅ |
| 3.4 | With note selected, click a different toolbar duration (e.g. eighth) | Selected note’s duration changes; staff updates | ✅ |
| 3.5 | **Shift+click** the note again; press **Delete** or **Backspace** | Note removed; selection clears | ✅ |
| 3.6 | Click toolbar **Rest** (rest mode on); click a measure | Rest appends to measure; accidentals disabled in rest mode | ✅ |
| 3.7 | **Shift+click** the rest; choose another duration on toolbar | Rest length updates | ✅ |
| 3.8 | Toolbar **key** picker → e.g. **G** | Key signature updates on staff; `K:` in ABC after sync | ✅ |
| 3.9 | Toolbar **time** picker → e.g. **3/4** | Time signature updates; `M:` in ABC after sync | ✅ |
| 3.10 | Toggle rest mode off; place a note with ♯ or ♭ on toolbar | Accidental applies to newly placed note | ✅ |

**Section pass:** Full v1 editor loop — place, select, duration change, delete, rests, key/time — works without errors.

---

## 4. Sync


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 4.1 | After §3 edits on valid melody block, wait ≥ 400 ms; toggle **Source mode** | Fence body matches visible notation (`K:`, `M:`, note lines updated) | ✅ |
| 4.2 | Return to Live Preview; block still matches Source | No duplicate fences; LP re-renders synced ABC | ✅ |
| 4.3 | **Empty block** — place first note via staff; wait ≥ 400 ms; check Source | Second fence gains headers + body (`X:1`, `M:4/4`, `L:1/4`, `K:C`, note line); was blank before | ✅ |
| 4.4 | Edit **valid melody** block only; wait ≥ 400 ms | Only that fence changes in Source | ✅ |
| 4.5 | Edit **second block** (G major example) — add or change a note; wait ≥ 400 ms | Only second fence changes; first fence unchanged | ✅ |
| 4.6 | Open Source + Live Preview split; edit block 1 in LP; wait ≥ 400 ms | Source pane shows same fence update (shared editor buffer) | ✅ |

**Section pass:** Debounced writes land in the correct fence; multi-block notes stay independent. For edge cases (empty-until-edit, no spurious writes), see [phase-4-source-mode.md](./phase-4-source-mode.md) §1–4.

---

## 5. Measure warning


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 5.1 | New note with single **empty** ` ```abc ` fence in Live Preview | No measure banner (implicit single measure) | ✅ |
| 5.2 | Place notes until a **5th measure** has content | Dismissible info banner below toolbar: “Examples work best at 4 measures or fewer.”; editing not blocked | ✅ |
| 5.3 | Click **×** on banner | Banner hides | ✅ |
| 5.4 | Add another note that changes measure count while still > 4 | Banner can reappear after count change | ✅ |
| 5.5 | Delete notes until ≤ 4 measures | Banner hides automatically | ✅ |
| 5.6 | Paste ABC with 6+ measures in Source; return to Live Preview | Notation renders; banner appears; still no red error styling | ✅ |

**Section pass:** Soft 4-measure warning appears, dismisses, and clears appropriately; long pasted ABC still renders.

---

## 6. Reading view

Run the full checklist in [phase-5.8-reading-view.md](./phase-5.8-reading-view.md). Minimum smoke test on the release test note:


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 6.1 | Switch note to **Reading view** | Valid blocks show SVG notation only | ✅ |
| 6.2 | Inspect all blocks | **No** “Live Preview” / “Reading view” badges | ✅ |
| 6.3 | Inspect all blocks | **No** duration / accidental toolbar | ✅ |
| 6.4 | Inspect all blocks | **No** internal sync or dev test buttons | ✅ |
| 6.5 | Click / hover staff SVG | No snap guide; no note placement; default cursor | ✅ |
| 6.6 | Toggle back to **Live Preview** | Dashed border, badge, toolbar, staff interaction return | ✅ |

**Section pass:** Reading view is static notation only; LP and Reading remain visually distinct. Full sign-off: [phase-5.8-reading-view.md](./phase-5.8-reading-view.md) checklist complete.

---

## 7. Regression

These paths were verified in Phase 4; re-run before release to catch sync or identity regressions.

### 7a. Undo after edit

Follow [phase-4-undo.md](./phase-4-undo.md) §1–3 (edit → wait → undo/redo; two-block isolation; rapid edits coalesce). Use toolbar + staff edits instead of any dev-only sync buttons if present.


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 7a.1 | Place a note in block 1; wait ≥ 400 ms; **Cmd/Ctrl+Z** once | ABC in Source reverts; LP matches | ✅ |
| 7a.2 | **Cmd/Ctrl+Shift+Z** (redo) | Edit restored | ✅ |
| 7a.3 | Two-block note: edit block 2 only; undo until block 2 edit gone | Block 1 ABC unchanged throughout | ✅ |

**Section pass:** [phase-4-undo.md](./phase-4-undo.md) §1–3 executed; no wrong-fence undo or ghost writes.

### 7b. Source reflects Live Preview

Follow [phase-4-source-mode.md](./phase-4-source-mode.md) §1–4 (filled block sync, empty first edit, two-block isolation, no spurious empty writes).


| Step | Action | Expected | Pass |
| ---- | ------ | -------- | ---- |
| 7b.1 | LP staff edit on filled block; wait ≥ 400 ms; Source mode | Fence body matches LP | ✅ |
| 7b.2 | First edit on empty fence; wait ≥ 400 ms; Source mode | Headers + note written; other fences untouched | ✅ |
| 7b.3 | Open empty fence in LP without editing; wait 1 s | Source fence still empty | ✅ |

**Section pass:** [phase-4-source-mode.md](./phase-4-source-mode.md) §1–4 executed.

---

## 8. Build verification (optional)

From repo root:

```bash
npm run build
npm run lint
npm run test:all
```

All commands pass before marking v1 release testing complete.

---

## Release sign-off


| Area | Pass |
| ---- | ---- |
| 1. Install | ✅ |
| 2. Render | ✅ |
| 3. Edit loop | ✅ |
| 4. Sync | ✅ |
| 5. Measure warning | ✅ |
| 6. Reading view (+ phase-5.8) | ✅ |
| 7. Regression (phase-4 undo + source §1–4) | ✅ |
| 8. Build verification | ✅ |

**Tester / date:** Miles Tanner / 2026-06-12

**Notes:**

- Full checklist passed in dev vault at **v1.1.0** (including §2.3–2.4 invalid ABC fallback after fix).
- `npm run build`, `npm run lint`, `npm run test:all` pass.
