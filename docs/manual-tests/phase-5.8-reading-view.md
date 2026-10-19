# Phase 5.8 — Reading view chrome checklist

**Status:** Manual verification in dev vault (automated: `npm run build`, `npm run lint`).

**Goal:** Reading view shows **static notation only** — no Live Preview toolbar, badges, sync test buttons, or click-to-edit.

**Prerequisites**

- Dev vault symlinked per [README.md](../../README.md) (`Desktop/Ideas/Obsidian Dev Vault`)
- `npm run build` (or `npm run dev`); **Reload app without saving** after pulling this change
- ABC Blocks enabled in Community plugins

---

## Setup note

Create or open a test note with **two** ` ```abc ` blocks, e.g.:

```markdown
# Reading view test

```abc
X:1
M:4/4
L:1/4
K:C
CDEF|GABc|
```

```abc
X:2
M:3/4
L:1/8
K:G
GAB c2|
```
```

Optional third block — empty fence — for empty staff shell:

````markdown
```abc

```
````

---

## Checklist — Reading view

Switch the note to **Reading view** (book icon in the ribbon or command palette: *Toggle reading view*).

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Inspect both ABC blocks | abcjs SVG notation visible |
| 1.2 | Look for view badges | **No** “Reading view” or “Live Preview” labels |
| 1.3 | Look for toolbar | **No** duration / accidental buttons |
| 1.4 | Look for sync controls | **No** “Write test note (phase 4.2)” or “Place first note (phase 4.3)” |
| 1.5 | Hover / click staff SVG | **No** snap guide line; **no** note placement; cursor stays default |
| 1.6 | Empty block (if present) | Implicit-default empty staff shell only (no LP chrome) |
| 1.7 | Invalid ABC block (optional) | Friendly fallback message + monospace source; still no LP chrome |

---

## Contrast — Live Preview (sanity check)

Toggle back to **Live Preview** (or open the same note in edit mode).

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Click outside a fence | Dashed accent border, “Live Preview” badge, toolbar, sync test button(s) |
| 2.2 | Staff interaction | Snap guide on hover; click places notes (5.2+) |

Reading and Live Preview must remain **visually and behaviorally distinct**.

---

## Implementation note

- Routing: `code-block.ts` → `render-reading.ts` (Reading) vs `render-live-preview.ts` (LP).
- Reading path must **never** call `mountEditorWidget`, `mountToolbar`, or `attachStaffInteraction`.
- CSS: `.abc-blocks-reading` — minimal padding; SVG `pointer-events: none` in Reading mount.
