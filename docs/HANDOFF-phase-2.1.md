# Handoff: Phase 2.1 — abcjs render path (Live Preview)

**Date:** 2026-06-10  
**Status:** Phase 2.1 **complete** (v0.1.1). Live Preview renders valid ABC as SVG.  
**Branch / repo:** `obsidian-abc-blocks` (local path: `Desktop/Ideas/Obsidian Extention Idea/obsidian-abc-blocks`)  
**Compact summary:** [`SESSION-compact-phase-2.1.md`](SESSION-compact-phase-2.1.md)

---

## Goal (Phase 2.1) — done

Integrate **abcjs** so valid ` ```abc ` fence bodies render notation SVG in Live Preview.

Steps 2.2 (fallback UI), 2.3 (empty staff shell), and 2.4 (Reading view SVG) are **not started**.

---

## Resolution summary

### Symptom

ABC blocks with **blank lines between header rows** (`X:`, `M:`, `K:`, etc.) failed to show notation. Compact ABC (no interior blank lines) rendered correctly.

### Root cause

abcjs treats heavily spaced header blocks as headers-only — SVG exists but `paths: 0` (height ~37px). Confirmed in Node/happy-dom.

### Fix (v0.1.1)

`normalizeAbcBlockBody()` in `src/plugin/block-source.ts` now **removes all interior blank lines** before resolution and render. Silent at render time; markdown on disk is not rewritten.

### Verification

```bash
npm run test:abc-normalize
```

Manual: reload plugin in dev vault; spaced-out ABC block should render staff.

---

## Architecture (unchanged)

`src/renderer/abcjs-adapter.ts` → `src/editor/editor-widget.ts` → Live Preview mount.

Source resolution: `src/plugin/block-source.ts` (editor buffer, fence scan, metadata cache).

---

## Docs note (user-facing)

Extra blank lines inside ` ```abc ` fences can break ABC notation. The plugin auto-normalizes at render time. See README → **ABC formatting**.

---

## Next session (when ready)

Do **not** assume 2.2–2.4 are in progress unless explicitly requested:

| Step | Task |
|------|------|
| 2.2 | Graceful fallback UI |
| 2.3 | Empty block staff shell |
| 2.4 | Reading view static abcjs render |

---

## Build / dev

```bash
cd obsidian-abc-blocks
npm run dev
npm run test:abc-normalize
```

Symlink: `Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins/abc-blocks` → repo root.

---

## Related docs

- `docs/DESIGN.md` — Phase 2 plan
- `AGENTS.md` — module map
- `LIMITATIONS.md` — current scope
