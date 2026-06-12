# Handoff: Phase 5.6 — Key and time signature controls

**Date:** 2026-06-11  
**Status:** ✅ **Phase 5.6 complete** (v0.3.0). Toolbar key/time pickers update per-block `Score` headers, re-render staff, and debounced-sync ABC via existing Phase 4 path.

**Prior:** Phase 5.1 (toolbar) at v0.2.0; 5.2 snap interaction at v0.2.7; 5.3 delete at v0.2.8; 5.8 Reading chrome at v0.2.9.  
**Next:** ~~Phase 5.4~~ ✅; Phase 5 complete at v0.3.4 — **Phase 6** (polish + docs).

---

## User-visible behavior

| Control | Options (v1) | Effect |
| ------- | -------------- | ------ |
| **Key** `<select>` | C, G, F, D, Bb | Updates `K:` in score + ABC; staff re-renders with new key signature |
| **Time** `<select>` | 4/4, 3/4, 2/4 | Updates `M:` in score + ABC; staff re-renders with new time signature |

- Controls appear in the Live Preview toolbar (after duration/accidental groups).
- **Per block:** each ` ```abc ` fence has its own pickers; changing block 1 does not affect block 2 (Phase 4 multi-block identity preserved).
- **Empty fence:** key/time change updates in-memory staff shell only; file stays empty until first note (Phase 4.3). First placed note writes ABC with the selected headers.
- **Existing ABC:** debounced sync (~300ms) updates `K:` / `M:` lines in Source.
- **Selection:** header change triggers staff re-render; note selection clears (same as 5.2 score-edit behavior).

---

## Architecture

```
Toolbar key/time select
  → setKeySignature / setTimeSignature (score-header-mutations.ts)
  → onScoreChange → renderStaff() + scheduleScoreToAbcBlock
  → writeAbc(score) → debounced markdown patch
```

| Module | Role |
| ------ | ---- |
| `score-header-mutations.ts` | Immutable `setKeySignature`, `setTimeSignature` |
| `score-session.ts` | Re-exports mutations; `scoreToDisplayAbc` uses score headers for empty shells |
| `key-time-controls.ts` | Toolbar `<select>` UI + sync wiring |
| `editor-widget.ts` | Mounts key/time controls when sync deps present |

**Not touched:** `staff-interaction.ts`, `snap-grid.ts`, `pitch-hit-test.ts`, `note-selection.ts`, `render-reading.ts`, `render-live-preview.ts`, `measure-warning.ts`.

---

## `scoreToDisplayAbc` change

Empty scores previously called `getImplicitDefaultAbcShell()` (always C / 4/4). Now empty shells use `writeAbc(score)` + trailing `|` so toolbar key/time changes affect the rendered staff before first edit.

---

## Tests

```bash
npm run test:key-time-controls
npm run test:all
npm run build
npm run lint
```

### Manual (dev vault)

1. Two-block note — block 1 has notes, block 2 different key/time.
2. Change block 1 key to G, time to 3/4.
3. After debounce, Source shows updated `K:G` / `M:3/4` on block 1 only.
4. Block 2 headers unchanged.
5. Empty block: change key/time → staff updates; Source still empty until first note.

**Dev setup:** symlink repo; `npm run build`; **Reload app without saving**.

---

## Phase exit (5.6)

- [x] Key/time toolbar controls in Live Preview
- [x] Score model + `writeAbc` / `parseAbc` round-trip for headers
- [x] Debounced per-block sync via `scheduleScoreToAbcBlock`
- [x] Selection clears on header change (staff re-render)
- [x] `npm run test:key-time-controls` + `npm run test:all` pass
- [x] Version **0.3.0** (MINOR bump)
