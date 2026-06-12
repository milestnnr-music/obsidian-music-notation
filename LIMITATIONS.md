# Limitations and roadmap

**Current status:** **v1.0.0** — v1 personal ship. Phase 5 complete (5.1–5.8). **Next:** Phase 6 (polish + docs). Phase 4 complete (4.1–4.5).  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md) · **5.2 spec:** [`docs/HANDOFF-phase-5.2-snap-interaction.md`](docs/HANDOFF-phase-5.2-snap-interaction.md) · Multi-block LP fixes: [`docs/phase-4.5-multi-block-lp-resolution.md`](docs/phase-4.5-multi-block-lp-resolution.md)

## What works in v1.0.0

### Block lifecycle and views

- Plugin loads and enables in a dev vault without errors
- ` ```abc ` blocks register via `registerMarkdownCodeBlockProcessor`
- **Live Preview:** valid ABC renders as SVG notation via abcjs; full visual editor (toolbar + staff)
- **Reading view:** valid ABC renders as static abcjs SVG only — no toolbar, badges, or click-to-edit (Phase 5.8)
- **Invalid ABC:** graceful fallback — friendly message + monospace source, no error banner
- **Source mode:** raw fence text unchanged — processors do not run (Obsidian default; no overlay registered)
- **Empty blocks:** implicit-default staff shell (4/4, C major, treble, quarter) via in-memory ABC; file stays empty until first edit

### Visual editor (Live Preview)

- **Toolbar (Phase 5.1):** abcjs-rendered duration glyphs and quarter-rest icon; accidental (♯/♭/♮) controls; default quarter
- **Key / time signature (Phase 5.6):** per-block key (C, G, F, D, Bb) and time (4/4, 3/4, 2/4) pickers; debounced ABC sync for `K:` / `M:` headers
- **Measure-length hint (Phase 5.7):** dismissible informational banner when a block has more than 4 measures; editing is not blocked
- **Snap staff interaction (Phase 5.2):** hover guide line + click to place (measure + append); Shift+hover/click to select; debounced ABC sync
- **Delete selected note (Phase 5.3):** Shift+click to select (outline highlight), then Delete or Backspace; selection clears on click outside the block (toolbar clicks keep selection so duration-on-selection works)
- **Change duration on selection (Phase 5.4):** Shift+click a note, then click a toolbar duration — updates that note, debounced ABC sync + re-render
- **Rest placement (Phase 5.5):** toolbar **Rest** button toggles rest mode; staff click appends rest to clicked measure; accidentals disabled in rest mode
- **Rest select/edit:** Shift+click rests to select; toolbar duration changes rest length; Delete/Backspace removes selected rest

### Sync and persistence

- **Debounced sync (Phase 4.1–4.2):** toolbar and staff edits → Score → ABC → markdown write (~300ms debounce); per-block `AbcSyncScheduler`; multi-block notes target the correct fence when block index is established
- **First edit (Phase 4.3):** empty fence receives headers + body on first scored toolbar/staff edit
- **Undo / teardown (Phase 4.4):** pending debounced writes flushed on shell unmount; manual undo/redo checklist passed (`docs/manual-tests/phase-4-undo.md`)
- **Multi-block Live Preview (Phase 4.5):** each fence renders and syncs independently — initial open, inline source edit in LP, both-empty fences, and staff/toolbar edits (see resolution doc)
- **Source reflects LP sync (Phase 4.5):** after debounced sync write, Source mode shows the updated fence body (`docs/manual-tests/phase-4-source-mode.md` §1–4 passed)

*Dev note:* Live Preview may still expose internal sync test buttons for agent/manual verification; the user-facing write path is toolbar + staff interaction.

### Model, render, and tooling

- **Score model + serializer (Phase 3):** `parseAbc` / `writeAbc` round-trip for v1 — treble staff, key/time sig, whole/half/quarter/eighth notes, rests, accidentals, quarter default; chords and multi-staff parse with warnings and use first pitch/voice only
- **ABC normalization:** interior blank lines inside a fence are stripped before render (extra line breaks can break abcjs; the file on disk is not rewritten)
- Build pipeline (`npm run dev`, `npm run build`, `npm run lint`, `npm run test:all`, `npm run test:phase-4.5`, `npm run compare:phase-4.5-probe` with Obsidian + dev vault)
- View mode routing via `src/plugin/view-mode.ts` (see `docs/DESIGN.md` → Agent development notes if LP and Reading look identical)

## Retired (do not restore)

The v0.2.1 **free-coordinate click-to-place** path (`analyzeStaffClick`) is **removed** — pitch was unreliable in Live Preview. Replaced by geometry-only snap grid (v0.2.4+; coordinate bugs fixed v0.2.5–0.2.7). See [`docs/HANDOFF-phase-5.2-snap-interaction.md`](docs/HANDOFF-phase-5.2-snap-interaction.md).

**5.2 interaction (Shift modifier only; no Place/Select toolbar buttons):**

| Mode | Input | Behavior |
| ---- | ----- | ---------- |
| Place (default) | Hover | Horizontal guide line at snapped pitch (staff + one ledger) |
| Place (note) | Click | Append note to end of clicked measure; toolbar duration/accidental |
| Place (rest mode) | Click | Append rest to end of clicked measure; toolbar duration |
| Duration (note selected) | Toolbar duration | Change selected note’s duration; debounced sync |
| Select | Shift+hover | Note hover preview; no guide line |
| Select | Shift+click note | Outline highlight (`data-abc-blocks-selected`) |
| Select | Shift+click empty | Clear selection |
| Any score edit | — | Clear selection |
| Delete | Delete or Backspace (note selected) | Remove note from score; debounced ABC sync |

**Rhythm:** measure + append (beat-grid X snap is a later phase).

## Explicitly out of scope

These are intentional v1 boundaries — not bugs or missing polish:

- Audio playback
- Vault-wide settings panel (types only; UI in Phase 7)
- Insert command / hotkey
- Chords or multiple simultaneous pitches
- Multi-staff / grand staff
- Hard measure cap (v1 uses a soft 4-measure informational warning only)
- MuseScore-level engraving or layout
- Beat-grid X snap for rhythmic placement (measure + append only in v1)
- Red error banners or stack traces in the note UI
- Mobile-optimized visual editing (desktop-first; plugin loads on mobile but editing is not a v1 target)

**v1 musical subset (implemented, not expandable without v2 work):** single treble staff, one pitch per note, whole/half/quarter/eighth notes, rests, accidentals, key and time signature per block, quarter default duration.

## v2+ roadmap

- Chords (multiple simultaneous pitches)
- Up to 2 staves with configurable clefs
- Staff layout via UI and ABC (equally editable)
- Beat-grid X snap for rhythmic placement
- Vault-wide default settings tab
- Insert ABC block command
- Optional per-block playback
- Community plugin release
