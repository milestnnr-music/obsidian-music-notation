# Limitations and roadmap

**Current status:** Phase 4 in progress (v0.1.1). Steps 4.1–4.4 complete (debounced sync, first-edit write, undo validation, multi-block LP identity). **Next:** Phase 4.5 (Source mode reflects Live Preview edits).  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md)

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
- **Multi-block Live Preview (Phase 4.4):** sibling blocks stay isolated during manual Source edits and inline embed source edit on block 1 (see DESIGN.md agent notes)
- **Score model + serializer (Phase 3):** `parseAbc` / `writeAbc` round-trip for v1 — treble staff, key/time sig, whole/half/quarter/eighth notes, rests, accidentals, quarter default; chords and multi-staff parse with warnings and use first pitch/voice only
- **ABC normalization:** interior blank lines inside a fence are stripped before render (extra line breaks can break abcjs; the file on disk is not rewritten)
- Build pipeline (`npm run dev`, `npm run build`, `npm run lint`, `npm run test:abc-normalize`, `npm run test:abc-empty-shell`, `npm run test:roundtrip`, `npm run test:abc-block-patch`, `npm run test:abc-sync-debounce`, `npm run test:abc-first-edit`)
- View mode routing via `src/plugin/view-mode.ts` (see `docs/DESIGN.md` → Agent development notes if LP and Reading look identical)

## What does not work yet

- **Phase 4.5:** formal verification that Source mode always reflects Live Preview sync edits (checklist in `docs/manual-tests/phase-4-source-mode.md`)
- **Phase 4 exit:** full “sync works end-to-end” for real editor gestures (dev test buttons only until Phase 5)
- No visual editor, toolbar, or staff interaction (Phase 5)
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
