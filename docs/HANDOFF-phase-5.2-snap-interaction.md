# Handoff: Phase 5.2 — Snap staff interaction (place + select)

**Date:** 2026-06-11  
**Status:** ✅ **Phase 5.2 place + select complete** (v0.2.7). Snap place + Shift select verified in Live Preview. Bug-fix chain: octave mismatch (v0.2.5) → per-note calibration jump-over (v0.2.6) → geometry/coordinate drift (v0.2.7). **Phase 5.3** (delete) ✅ done at v0.2.8. **Phase 5.4** (duration on selection) ✅ v0.3.4 (LP verified). **Phase 5.5** (rests via toolbar) ✅ v0.3.3. **Phase 5 complete** at v0.3.4. Supersedes the v0.2.1 free-click placement approach (broken in Live Preview).

**Prior:** Phase 5.1 (toolbar) at v0.2.0; first 5.2 attempt at v0.2.1–v0.2.3 (free-Y hit-test — **retire**).  
**Next after 5.2:** ~~Phase 5.3~~ ✅; ~~5.4~~ ✅; ~~5.5~~ ✅.

> **Historical (do not re-implement):** [`docs/HANDOFF-phase-5.2-staff-placement.md`](HANDOFF-phase-5.2-staff-placement.md) — documents the abandoned free-coordinate click path.

---

## Why we redesigned

The v0.2.x **click-anywhere** pipeline (`analyzeStaffClick` free-Y math in `pitch-hit-test.ts`) was unreliable in Obsidian Live Preview:

- Notes landed above the crosshair (pitch/register errors).
- SVG client vs intrinsic coordinate scaling made continuous Y→pitch fragile even after calibration fixes.

**New model:** discrete **snap targets** — pitch slots for placement, rendered note elements for selection. No free-coordinate pitch math.

---

## Root cause: octave mismatch (v0.2.5 fix)

After the snap redesign landed (v0.2.4), manual testing showed a **display/serializer mismatch** that looked like a hit-test bug:

| Layer | What it used | Example at middle C |
| ----- | ------------ | ------------------- |
| Snap grid / guide line | abcjs **vertical positions** correctly (`p0` = middle C, `p2` = E4 bottom line, etc.) | Guide at `verticalPos` 0 |
| `verticalPosToPitch` (pre-fix) | **Musical** octaves (`vp0` → `{ step: C, octave: 4 }`) | Wrong register for serializer |
| `pitchToAbc` + plugin serializer | **Model** octaves — uppercase `C` = model octave **3** = abcjs `p0`; lowercase `c` = model octave **4** = abcjs `p7` | ABC `c` renders ~7 diatonic steps higher |

**User symptom:** aim at C, get D (or higher); notes rendered **above** the crosshair/guide line even though the guide snapped to the correct pitch slot.

**Fix (v0.2.5):** `verticalPosToPitch` in `src/editor/pitch-hit-test.ts` now maps abcjs `verticalPos` → **model octaves** (`octave = 3 + floor(vp / 7)`) so `pitchToAbc` produces ABC that abcjs renders at the snapped p-class.

**Tests:** `scripts/check-staff-placement.mjs` asserts `vp0` → model `{C, octave: 3}` → ABC `C` → rendered `.abcjs-p0`.

---

## Root cause: per-note snap calibration (v0.2.6 fix)

After the octave fix (v0.2.5), placing a note (e.g. A) then hovering to place another at the **same pitch** could make the guide line **jump over** the existing notehead — duplicate pitches felt impossible.

| What happened | Why |
| ------------- | --- |
| Per-note calibration moved slot `N` to the **rendered notehead Y** | `.abcjs-p{N}` samples overwrote individual `slotClientY` entries |
| Neighbor slots stayed on **staff geometry** | Only occupied pitches were pulled to note centers |
| Hover just below a notehead | Nearest slot became the **next pitch down** (e.g. G instead of A) |

**Fix (v0.2.6):** Removed per-note slot overrides; snap slots are **fixed staff positions** from line geometry only.

**Superseded by v0.2.7** — see below. Do **not** reintroduce per-note or global median calibration.

---

## Root cause: geometry coordinate drift (v0.2.7 fix)

After v0.2.6, manual LP testing still showed two failure modes:

| Symptom | Cause |
| ------- | ----- |
| Guide line **wildly below the staff** | Staff lines read in **mixed coordinate spaces** (`getBoundingClientRect` vs raw path `d` at SVG root); bad `stepPx` / `bottomLineY` |
| Hover looks right but note placed **far above** (octave-like) | **Global median calibration** (`applyGlobalGeometryCalibration`) shifted the whole grid when geometry was already wrong — snap picked wrong `verticalPos` |
| Duplicate pitch still awkward after v0.2.6 | Residual grid drift from the above; guide anchored to `staffMount` instead of SVG box |

**Fix (v0.2.7):**

- **Removed** global median calibration entirely.
- **Unified** staff line Y via `elementClientCenterY()` in `svg-client-geometry.ts` (client rect first; element CTM fallback for zero-size rects).
- **Pick five evenly-spaced staff lines** when ledger lines inflate cluster count (`pickTrebleStaffLineClusters`).
- **Anchor guide line** to the SVG viewport box inside the staff mount (not mount top alone).

**Verified (dev vault, v0.2.7):** guide line tracks staff; placed notes match guide; duplicate pitches on the same line/space work.

---

## Locked interaction spec (design grill, 2026-06-11)

| # | Decision |
| --- | -------- |
| 1 | **Hybrid:** pitch slots for **Place**; rendered note elements for **Select** |
| 2 | **Explicit mode** — no ambiguous nearest-wins heuristics |
| 3 | **Modifier only** — no new toolbar tool buttons |
| 4 | **Rhythm:** measure + append (X picks measure; note appends to measure end). **Beat-grid X snap** is an explicit later phase |
| 5 | **Pitch snap:** staff geometry grid only (no per-note or global note calibration) |
| 6 | **5.2 scope:** Place + **Shift select highlight** (no delete / duration-on-selection yet) |
| 7 | **Shift** = Select mode (held during click or hover) |
| 8 | **Shift+click empty staff** → clear selection |
| 9 | **Hover tracking** + minimal Place-mode visual |
| 10 | **Select click:** DOM hit-test (`elementsFromPoint` → note group) |
| 11 | **Place hover visual:** horizontal guide line at snapped pitch |
| 12 | **Selected note:** CSS class `.abc-blocks-note-selected` on note SVG group |
| 13 | **On score change:** clear selection (index re-resolve deferred to later) |
| 14 | **Pitch range:** treble staff lines/spaces **plus one ledger line** above and below |
| 15 | **DOM → Score:** `data-measure-index` + `data-event-index` on note groups after render |
| 16 | **Shift hover:** note hover preview (outline); **hide** guide line while Shift held |
| 17 | **Code:** **full replace** of free-Y path; new snap-grid module; **retain** bar-line X→measure logic |

---

## User-visible behavior

### Place (default — no modifier)

1. Hover over staff → crosshair cursor; **horizontal guide line** snaps to nearest valid pitch slot.
2. Click → append note at snapped pitch to **end of clicked measure** (toolbar duration + accidental).
3. Debounced sync writes ABC (~300ms, existing Phase 4 path).

### Select (Shift held)

1. Hover → **note hover preview** (outline on note under cursor); **no** pitch guide line.
2. **Shift+click** on note → select it (`.abc-blocks-note-selected`); read `data-measure-index` / `data-event-index`.
3. **Shift+click** on empty staff (no note hit) → **clear selection**.
4. Any score edit (place, etc.) → **clear selection** (re-render destroys DOM; do not re-resolve in 5.2).

### Toolbar

- Unchanged from 5.1: duration + accidentals only.
- **No** Place/Select tool buttons in 5.2.

---

## Implementation architecture

### Module plan (replace free-click)

| Module | Responsibility |
| ------ | -------------- |
| `snap-grid.ts` | Discrete pitch slots from staff line geometry; five-line staff detection; clamp to staff + one ledger |
| `svg-client-geometry.ts` | `elementClientCenterY()` — consistent client Y for staff lines (v0.2.7) |
| `pitch-hit-test.ts` | **Remove free-Y `analyzeStaffClick`.** Keep or extract **bar-line X→measure** only (`readBarLinePositions`, `xToMeasureIndex`) |
| `note-selection.ts` *(new)* | DOM hit-test; selection state; hover preview; apply/clear `.abc-blocks-note-selected` |
| `staff-interaction.ts` | Orchestrate mousemove/click; mode from Shift; guide line overlay; wire place → `placeNoteInScore` → sync |
| `score-session.ts` | Unchanged role: `parseSourceToScore`, `placeNoteInScore`, `scoreToDisplayAbc` |
| Post-render pass | After abcjs render, annotate note groups with `data-measure-index` + `data-event-index` |

### Place pipeline

1. `mousemove` (no Shift): `snap-grid` → nearest pitch slot + measure from X (bar lines).
2. Draw/update horizontal guide line at slot Y (SVG overlay or absolutely positioned element in staff mount).
3. `click` (no Shift): slot → `verticalPosToPitch` (model octaves — see [Root cause: octave mismatch](#root-cause-octave-mismatch-v025-fix)) + `applyToolbarAccidental` → `placeNoteInScore` → re-render → `scheduleScoreToAbcBlock` → **clear selection**.

### Select pipeline

1. `mousemove` (Shift): `elementsFromPoint` → walk to note group → optional hover outline class (e.g. `.abc-blocks-note-hover`).
2. `click` (Shift): if note hit → select + store `{ measureIndex, eventIndex }` from `data-*`; else clear selection.
3. Do **not** use abcjs `clickListener` as the primary path (unreliable on empty staff; we own the SVG listener).

### Pitch snap grid (`snap-grid.ts`)

**Geometry (treble, abcjs `linePitch=2`):**

- Read `.abcjs-staff` horizontal lines; cluster Y values.
- `stepPx = (bottomLineY - topLineY) / 8` (verticalPos 2–10 span eight diatonic steps between bottom and top **lines**).
- **Do not** use adjacent-line distance as `stepPx` (that is two diatonic steps in abcjs).

**Valid verticalPos range (5.2):**

- Staff lines/spaces: **2–10** (E4 bottom line through F5 top line).
- **Plus one ledger step** above and below: allow **0** (middle C) and **12** (approx. A5); clamp clicks outside that range to nearest allowed slot.

**Coordinate space (v0.2.7 — do not regress):**

- All staff line Y values must be in **viewport client coordinates** via `elementClientCenterY()`.
- **Never** mix raw path `d` units with `getBoundingClientRect` in the same geometry pass.
- **Never** calibrate snap slots from notehead positions (per-note or global median).

### Measure detection (retain from v0.2.x)

- Bar lines: `svg.querySelectorAll('[data-name="bar"]')`, use `getBBox().x + width/2`.
- Count bars left of click X → `measureIndex`; default `0` when no bars.

### DOM → Score mapping (post-render)

After each abcjs render, walk score events in measure order and set on each note SVG group:

```html
<g data-measure-index="0" data-event-index="2" class="abcjs-note ...">
```

Selection reads these attributes from the hit element (or ancestor group). Required for 5.3 delete even though 5.2 clears selection on score change.

### Renderer requirements

- `add_classes: true` in `renderAbcToElement` (`.abcjs-staff`, `.abcjs-p{N}` must exist).
- Confirm abcjs note group selector stable enough for `elementsFromPoint` walk-up (document chosen selector in code).

---

## CSS (minimal 5.2)

| Class | When |
| ----- | ---- |
| `.abc-blocks-snap-guide` | Horizontal line at snapped pitch (Place hover) |
| `.abc-blocks-note-hover` | Shift hover preview on note |
| `.abc-blocks-note-selected` | Shift+click selected note |

Use theme variables where possible (`var(--background-modifier-border)`, etc.).

---

## Out of scope (5.2)

- ~~Delete key / delete gesture~~ — **5.3** ✅ (`deleteNoteFromScore`, Delete/Backspace, v0.2.8)
- ~~Change duration on selected note (5.4)~~ ✅ v0.3.4
- ~~Rests toolbar (5.5)~~ ✅ v0.3.3
- Beat-grid rhythmic X snap (future phase after 5.2 stable)
- Full crosshair / polished selection chrome (later polish)
- Configurable modifier key (Phase 7+)

---

## Tests

### Automated (add/update)

```bash
npm run test:staff-placement   # update for snap-grid; remove free-Y assertions
npm run test:editor-toolbar
npm run test:all
```

Unit-test `snap-grid.ts` in isolation: known staff geometry → expected `verticalPos` / `Pitch`; ledger clamp at 0 and 12.

**Octave round-trip (v0.2.5):** `verticalPosToPitch` → `pitchToAbc` → abcjs render → `.abcjs-p{N}` matches source `verticalPos` (see `check-staff-placement.mjs`).

### Manual (dev vault — verified v0.2.7)

Automated tests do not catch LP coordinate drift; the checklist below was run in the dev vault after v0.2.7:

1. Empty ` ```abc ` block → hover shows guide line on pitch slots including **middle C** (ledger below).
2. Click places note at guided pitch (not above/below crosshair).
3. Place two notes at the **same pitch** (e.g. two A’s) — guide stays on staff line, does not jump over first notehead.
4. Existing block → append in measure 2 via click X; pitch matches guide line.
5. Shift+hover → note outline, no guide line.
6. Shift+click note → selected class; Shift+click empty → cleared.
7. Place another note → selection clears.
8. Toolbar ♯/♭/♮ applies on next place.

**Dev setup:** symlink repo to dev vault; `npm run build`; **Reload app without saving**.

---

## Files to touch (implementation checklist)

- [x] `src/editor/snap-grid.ts` *(new)*
- [x] `src/editor/measure-hit-test.ts` — bar-line X → measure (extracted from pitch-hit-test)
- [x] `src/editor/note-selection.ts` *(new)*
- [x] `src/editor/note-annotate.ts` — post-render `data-*` on notes
- [x] `src/editor/pitch-hit-test.ts` — verticalPos → Pitch only (free-Y removed)
- [x] `src/editor/staff-interaction.ts` — snap + Shift modes
- [x] `src/editor/editor-widget.ts` — annotate after render; selection clears on re-render
- [x] `styles.css` — guide line, hover, selected
- [x] `scripts/check-staff-placement.mjs` — snap-grid + octave round-trip + geometry regression tests (v0.2.5–0.2.7)
- [x] `src/editor/pitch-hit-test.ts` — `verticalPosToPitch` uses model octaves (v0.2.5)
- [x] `src/editor/snap-grid.ts` — geometry-only slots; no note calibration (v0.2.6–0.2.7)
- [x] `src/editor/svg-client-geometry.ts` — unified client Y for staff lines (v0.2.7)
- [x] `src/editor/staff-interaction.ts` — guide anchored to SVG viewport (v0.2.7)
- [x] Manual dev-vault verification — place + duplicate pitch + guide line (v0.2.7)
- [ ] Bump minor when 5.2 phase formally closed (optional; patch fixes continue on 0.2.x)

---

## Phase exit (5.2 redesign)

- [x] Free-Y placement code removed; no `analyzeStaffClick` free-coordinate path.
- [x] Place: guide line + click places correct pitch (v0.2.5–0.2.7; automated + manual LP).
- [x] Select: Shift+click highlight + empty clear + hover preview.
- [x] Selection clears on score edit.
- [x] `npm run test:all` passes.
- [x] Status lines updated in `DESIGN.md`, `AGENTS.md`, `README.md`, `LIMITATIONS.md`.

---

## Example prompts for agents

```
Read docs/HANDOFF-phase-5.2-snap-interaction.md and implement the 5.2 snap redesign.
Replace free-Y pitch-hit-test; do not restore click-anywhere placement.
```

```
@docs/HANDOFF-phase-5.2-snap-interaction.md Fix snap guide line drift in Live Preview only.
```

