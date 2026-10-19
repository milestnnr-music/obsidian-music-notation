# Handoff: Phase 5.2 — Click staff to place notes (superseded)

**Date:** 2026-06-11  
**Status:** ⚠️ **Superseded** — free-coordinate placement (v0.2.1–v0.2.3) was **broken in Live Preview** and is **not** the target architecture.

> **Implement from:** [`docs/HANDOFF-phase-5.2-snap-interaction.md`](HANDOFF-phase-5.2-snap-interaction.md)  
> **Product plan:** [`docs/DESIGN.md`](DESIGN.md) Phase 5.2 (snap interaction redesign).

---

## What shipped (historical, v0.2.1)

| Area | Module | Behavior |
| ---- | ------ | -------- |
| Hit-test | `src/editor/pitch-hit-test.ts` | Free Y → vertical position → `Pitch`; X → measure from bar lines |
| Score edits | `src/editor/score-session.ts` | `parseSourceToScore`, `placeNoteInScore`, `scoreToDisplayAbc` |
| Staff clicks | `src/editor/staff-interaction.ts` | Click → place note → re-render → sync |

**Why retired:** Continuous Y→pitch math drifted in scaled Live Preview embeds; notes appeared above the crosshair despite calibration attempts.

**Do not re-implement** the free-Y `analyzeStaffClick` pipeline documented below. Retain only **bar-line measure detection** when building the snap redesign.

---

## Archived: free-click hit-test approach (do not restore)

<details>
<summary>Original v0.2.1 pipeline (reference only)</summary>

We did **not** use abcjs `clickListener` for placement.

1. Listen on rendered `svg` (left click).
2. Convert client coords → SVG user space via intrinsic box scaling.
3. Y → pitch from staff line geometry + optional `.abcjs-p{N}` calibration.
4. X → measure from `[data-name="bar"]` elements.
5. `placeNoteInScore` → re-render → `scheduleScoreToAbcBlock`.

See git history at v0.2.1–v0.2.3 for full implementation.

</details>
