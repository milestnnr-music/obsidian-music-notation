# Handoff: Phase 5.7 — Soft 4-measure warning

**Date:** 2026-06-11  
**Status:** ✅ **Phase 5.7 complete** (v0.3.1). Live Preview shows a dismissible informational banner when a block’s score has more than four measures. Editing and rendering are not blocked.

**Prior:** Phase 5.6 key/time at v0.3.0.  
**Next:** Phase 5 complete at v0.3.4 — **Phase 6** (polish + docs).

---

## User-visible behavior

| Condition | UI |
| --------- | -- |
| ≤ 4 measures | No banner |
| > 4 measures | Subtle banner below toolbar: “Examples work best at 4 measures or fewer.” |
| Dismiss (×) | Banner hides until measure count changes while still over threshold |
| Delete back to ≤ 4 | Banner hides automatically |
| Pasted ABC with 6+ measures | Banner appears on parse/render; staff still renders |

- **Live Preview only** — Reading view has no editor chrome (5.8).
- **Informational tone** — muted colors, no red error styling; not blocking.
- **No hard cap** — place/delete/sync continue normally.

---

## Architecture

```
currentScore change → renderStaff()
  → refreshMeasureWarning()
  → getScoreMeasureCount(score)
  → getMeasureWarning(count)
  → mountMeasureWarning(mount, count)
```

| Module | Role |
| ------ | ---- |
| `measure-warning.ts` | `getScoreMeasureCount`, `getMeasureWarning` (threshold from `ABC_DEFAULTS.measureWarningThreshold`) |
| `measure-warning-ui.ts` | `mountMeasureWarning` — create/update/dismiss banner DOM |
| `editor-widget.ts` | `measureWarningMount` between toolbar and staff; `refreshMeasureWarning` on every `renderStaff` |
| `styles.css` | `.abc-blocks-measure-warning` block |

**Not touched:** `toolbar.ts`, `key-time-controls.ts`, `staff-interaction.ts`, `render-reading.ts`, sync/block-identity modules.

---

## Dismiss semantics

- Dismiss stores the current measure count on the mount element (`data-abc-measure-warning-dismissed-at`).
- Banner stays hidden while count equals that dismissed value.
- Any measure-count change (place, delete, paste/sync re-parse) re-evaluates; if still > 4 and count changed, banner shows again.

---

## Verify

```bash
npm run build
npm run lint
```

### Manual (dev vault)

1. Empty ` ```abc ` block — no banner (1 implicit measure).
2. Place notes into a 5th measure — banner appears below toolbar.
3. Delete notes until ≤ 4 measures — banner hides.
4. Paste ABC with 6+ measures in Source → switch to LP — banner appears; notation renders.
5. Click × — banner hides; add another measure — banner returns if count changed.

**Dev setup:** symlink repo; `npm run build`; **Reload app without saving**.

---

## Phase exit (5.7)

- [x] Soft warning when measure count > `ABC_DEFAULTS.measureWarningThreshold` (4)
- [x] Uses existing `getMeasureWarning()` copy
- [x] Re-evaluates on place/delete/header change (via `renderStaff`)
- [x] Pasted long ABC shows warning without blocking render
- [x] Dismissible, informational styling (not error banner)
- [x] `npm run build` + `npm run lint` pass
- [x] Version **0.3.1** (PATCH bump)
