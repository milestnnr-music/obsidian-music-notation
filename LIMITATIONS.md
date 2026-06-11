# Limitations and roadmap

**Current status:** Phase 4 complete (v0.1.5). Steps 4.1–4.5 done (debounced sync, first-edit write, undo validation, multi-block LP identity, Source reflects LP edits). **Next:** Phase 5 (visual editor).  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md) · Multi-block LP fixes: [`docs/phase-4.5-multi-block-lp-resolution.md`](docs/phase-4.5-multi-block-lp-resolution.md)

## What works today

- Plugin loads and enables in a dev vault without errors
- ` ```abc ` blocks register via `registerMarkdownCodeBlockProcessor`
- **Live Preview:** valid ABC renders as SVG notation via abcjs (Phase 2.1)
- **Reading view:** valid ABC renders as static abcjs SVG (Phase 2.4)
- **Invalid ABC:** graceful fallback — friendly message + monospace source, no error banner (Phase 2.2)
- **Source mode:** raw fence text unchanged — processors do not run (Obsidian default; no overlay registered)
- **Empty blocks:** implicit-default staff shell (4/4, C major, treble, quarter) via in-memory ABC; file stays empty until first edit (Phase 4.3)
- **Debounced sync (Phase 4.1–4.2):** Score → ABC → markdown write via dev test buttons (~300ms debounce); per-block `AbcSyncScheduler`; multi-block notes target the correct fence when block index is established
- **First edit (Phase 4.3):** empty fence receives headers + body on first scored edit (dev test button)
- **Undo / teardown (Phase 4.4):** pending debounced writes flushed on shell unmount; manual undo/redo checklist passed (`docs/manual-tests/phase-4-undo.md`)
- **Multi-block Live Preview (Phase 4.5):** each fence renders and syncs independently — initial open, inline source edit in LP, both-empty fences, and test-button writes (see resolution doc)
- **Source reflects LP sync (Phase 4.5):** after debounced sync write, Source mode shows the updated fence body (`docs/manual-tests/phase-4-source-mode.md` §1–4 passed)
- **Score model + serializer (Phase 3):** `parseAbc` / `writeAbc` round-trip for v1 — treble staff, key/time sig, whole/half/quarter/eighth notes, rests, accidentals, quarter default; chords and multi-staff parse with warnings and use first pitch/voice only
- **ABC normalization:** interior blank lines inside a fence are stripped before render (extra line breaks can break abcjs; the file on disk is not rewritten)
- Build pipeline (`npm run dev`, `npm run build`, `npm run lint`, `npm run test:all`, `npm run test:phase-4.5`, `npm run compare:phase-4.5-probe` with Obsidian + dev vault)
- View mode routing via `src/plugin/view-mode.ts` (see `docs/DESIGN.md` → Agent development notes if LP and Reading look identical)

## What does not work yet

- No visual editor, toolbar, or staff interaction (Phase 5) — sync plumbing is ready; dev test buttons drive writes until Phase 5 UI
- No measure warning (Phase 5)
- Serializer not yet driving Live Preview render path (still abcjs-on-ABC text directly for display)

## v1 scope (planned)

Implemented in serializer (Phase 3); sync path (Phase 4) uses writer for persistence:

- Single treble staff, one pitch per note (no chords in editor; chord ABC parses with warning)
- Note values: whole, half, quarter, eighth; rests; accidentals
- Key and time signature per block
- Default note duration: quarter

Still planned for v1:

- Soft warning after 4 measures (not a hard cap; pasted ABC can exceed)
- Live Preview: editable; Reading view: static; Source: raw ABC
- Hybrid editing with debounced ABC sync from toolbar/staff (Phase 5; sync plumbing ✅)
- Graceful fallback for invalid ABC (no red error banners) — render path ✅; model path N/A until Phase 5 UI

## Explicitly out of scope for v1

- Audio playback
- Vault-wide settings panel (types only; UI in Phase 7)
- Insert command / hotkey
- Chords or multiple simultaneous pitches
- Multi-staff / grand staff
- Hard measure cap
- MuseScore-level engraving or layout

## v2+ (Phase 7+)

- Chords (multiple simultaneous pitches)
- Up to 2 staves with configurable clefs
- Staff layout via UI and ABC (equally editable)
- Vault-wide default settings tab
- Insert ABC block command
- Optional per-block playback
- Community plugin release
