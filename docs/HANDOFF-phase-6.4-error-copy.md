# Handoff: Phase 6.4 — Error & notice copy pass

**Date:** 2026-06-12  
**Status:** ✅ **Phase 6.4 complete**. User-visible failure paths use calm, sentence-case copy. Dev/test Notices are prefixed with `[dev]`. No `Error:` banners or raw exception text in note UI.

**Prior:** Phase 6.1–6.3 (docs polish).  
**Next:** Phase 6.5 settings hooks (see `HANDOFF-phase-6.5-settings-hooks.md`).

---

## Principles applied (from `docs/DESIGN.md`)

- Sentence case; short imperatives for actions
- Never stack traces or `Error:` banners in the note
- Invalid ABC: monospace source + one friendly line
- Measure warning: informational, dismissible — not blocking
- Phase 4.2/4.3 test Notices marked `[dev]` so they do not read like product errors

---

## New module

| File | Role |
| ---- | ---- |
| `src/editor/error-copy.ts` | Central user-facing strings, dev Notice helpers, `friendlyAbcRenderError()` |

---

## Strings changed

### `src/editor/error-copy.ts` (new)

| Constant / helper | Value |
| ----------------- | ----- |
| `ABC_FALLBACK_MESSAGE` | Couldn't render this ABC. |
| `EMPTY_STAFF_FALLBACK_MESSAGE` | Couldn't render the default staff. |
| `EMPTY_STAFF_LOADING_MESSAGE` | Loading staff… |
| `measureWarningMessage(n)` | Examples work best at {n} measures or fewer. |
| `SYNC_FAILURE_NOTE_NOT_FOUND` | Couldn't find the note file. |
| `SYNC_FAILURE_BLOCK_NOT_FOUND` | Couldn't find this ABC block in the note. |
| `devNotice(msg)` | `[dev] ` + msg |
| `formatDevSyncFailureNotice(reason)` | `[dev] Couldn't save ABC block: {reason}` |
| `friendlyAbcRenderError()` | Always returns `ABC_FALLBACK_MESSAGE` (never forwards raw errors) |

### `src/ui/fallback.ts`

| Before | After |
| ------ | ----- |
| `ABC_FALLBACK_MESSAGE` defined locally | Re-exported from `error-copy.ts` (unchanged text) |
| `data-abc-render-error` = raw `result.error` | `friendlyAbcRenderError(result.error)` |

### `src/ui/empty-staff-shell.ts`

| Before | After |
| ------ | ----- |
| `EMPTY_SHELL_FALLBACK_MESSAGE` local constant | `EMPTY_STAFF_FALLBACK_MESSAGE` from `error-copy.ts` (unchanged text) |
| Loading label: `Empty staff…` | `Loading staff…` |
| `data-abc-render-error` = raw `result.error` | `friendlyAbcRenderError(result.error)` |

### `src/ui/measure-warning.ts`

| Before | After |
| ------ | ----- |
| Inline template string | `measureWarningMessage(threshold)` (unchanged text) |

### `src/ui/measure-warning-ui.ts`

| Before | After |
| ------ | ----- |
| Dismiss `aria-label`: `Dismiss measure length hint` | `Dismiss` |

### `src/editor/sync.ts` — sync failure reasons

| Before | After |
| ------ | ----- |
| `Note file not found` | `Couldn't find the note file.` |
| `Abc block identity not resolved` | `Couldn't find this ABC block in the note.` |
| `ABC block not found in note` | `Couldn't find this ABC block in the note.` |

### `src/editor/sync.ts` — dev Notices (phase 4.2/4.3 test buttons)

| Before | After |
| ------ | ----- |
| `ABC block updated (phase 4.2 test)` | `[dev] ABC block updated (phase 4.2 test)` |
| `ABC sync failed: {reason}` | `[dev] Couldn't save ABC block: {reason}` |
| `First edit saved (phase 4.3 test)` | `[dev] First edit saved (phase 4.3 test)` |
| `No change — fence already has abc or score is empty` | `[dev] No change — fence already has ABC or the score is empty` |

### `src/plugin/render-live-preview.ts`

| Before | After |
| ------ | ----- |
| Notice: `Abc block identity not resolved` | `Couldn't find this ABC block in the note.` |

*Dev button labels (`Write test note (phase 4.2)`, `Place first note (phase 4.3)`) unchanged — already clearly dev-scoped.*

### `src/renderer/abcjs-adapter.ts`

| Before | After |
| ------ | ----- |
| `Empty ABC source` | `Couldn't render this ABC.` |
| `No tune produced from ABC` | `Couldn't render this ABC.` |
| `ABC did not produce an SVG element` / abcjs warning text | `Couldn't render this ABC.` |
| `ABC SVG was empty after rendering` / abcjs warning text | `Couldn't render this ABC.` |
| `catch`: `err.message` or `String(err)` | `Couldn't render this ABC.` (no exception leakage) |

---

## Unchanged (already matched DESIGN.md)

- `ABC_FALLBACK_MESSAGE` body text: *Couldn't render this ABC.*
- Measure warning banner text: *Examples work best at 4 measures or fewer.*
- Live Preview interactive labels (not failure copy)
- `main.ts` load Notice (out of scope)

---

## Verify

```bash
npm run build
npm run lint
npm run test:all
```

Manual: invalid ABC block → friendly line + monospace source, no red banner; dev sync buttons → `[dev]` Notices only.
