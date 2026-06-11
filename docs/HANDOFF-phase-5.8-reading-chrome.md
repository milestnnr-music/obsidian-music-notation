# Handoff: Phase 5.8 — Strip editor chrome in Reading view

**Date:** 2026-06-11  
**Status:** Phase 5.8 **complete** (v0.2.9). Reading view is static notation only.  
**Branch / repo:** `obsidian-abc-blocks` (local: `Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks`)

---

## Goal (Phase 5.8) — done

Reading view shows **static abcjs notation only** — no toolbar, no sync test buttons, no view badges, no click-to-edit. Live Preview and Reading paths stay separate.

**Blocked by:** 5.1 ✅ (toolbar exists in LP only).

**Not in scope:** 5.4–5.7 (duration on selection, rests, key/time controls, measure warning).

---

## What changed (v0.2.9)

### `src/plugin/render-reading.ts`

- Removed dev **“Reading view”** badge (`abc-blocks-view-badge`).
- Reading path unchanged otherwise: `mountEmptyStaffShell` for empty blocks; `mountAbcOrFallback` for content.
- **Does not** import or call `mountEditorWidget`, `mountToolbar`, `attachStaffInteraction`, or sync test helpers.

### `styles.css` (Phase 1.2 / 5.8 section only)

- Removed bordered “card” chrome and badge styles from `.abc-blocks-reading`.
- Minimal vertical padding; notation mount only.
- `.abc-blocks-reading-mount svg { pointer-events: none; cursor: default; }` — no click-to-edit affordance.

### Docs & version

- PATCH bump `0.2.8` → `0.2.9` in `manifest.json`, `package.json`, `versions.json`.
- Status lines in `docs/DESIGN.md`, `README.md`, `LIMITATIONS.md`, `AGENTS.md`.
- Manual checklist: [`docs/manual-tests/phase-5.8-reading-view.md`](manual-tests/phase-5.8-reading-view.md).

---

## Architecture (unchanged)

```
code-block.ts
  ├─ detectAbcBlockViewMode() → 'reading'
  │    └─ render-reading.ts  → mountAbcOrFallback / mountEmptyStaffShell
  └─ → 'live-preview'
       └─ render-live-preview.ts → mountEditorWidget + toolbar + staff interaction + sync test buttons
```

**Do not** mount editor UI from `render-reading.ts`. LP-only modules (untouched in 5.8): `editor-widget.ts`, `toolbar.ts`, `staff-interaction.ts`, `render-live-preview.ts`.

---

## Verification

```bash
npm run build
npm run lint
```

**Manual (dev vault):** [`docs/manual-tests/phase-5.8-reading-view.md`](manual-tests/phase-5.8-reading-view.md)

1. Open note with two ` ```abc ` blocks in **Reading view**.
2. Confirm notation only — no LP toolbar, badges, or “Write test note” buttons.
3. Toggle LP — confirm dashed border, toolbar, and sync buttons still present.

---

## Next session

| Step | Task | Status |
|------|------|--------|
| 5.4 | Change duration on selection | Pending |
| 5.5 | Rests via toolbar | Pending |
| 5.6 | Key / time signature controls | Pending |
| 5.7 | Soft 4-measure warning | Pending |

**Files to @-mention:** `docs/DESIGN.md`, `AGENTS.md`, `docs/HANDOFF-phase-5.2-snap-interaction.md` (staff interaction spec).
