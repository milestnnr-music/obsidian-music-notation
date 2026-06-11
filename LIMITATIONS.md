# Limitations and roadmap

**Current status:** Phase 3 complete (v0.1.1). Read path and ABC ↔ `Score` serializer are done; editor sync and visual editing are not wired yet.  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md)

## What works today

- Plugin loads and enables in a dev vault without errors
- ` ```abc ` blocks register via `registerMarkdownCodeBlockProcessor`
- **Live Preview:** valid ABC renders as SVG notation via abcjs (Phase 2.1)
- **Reading view:** valid ABC renders as static abcjs SVG (Phase 2.4)
- **Invalid ABC:** graceful fallback — friendly message + monospace source, no error banner (Phase 2.2)
- **Source mode:** raw fence text unchanged — processors do not run (Obsidian default; no overlay registered)
- **Empty blocks:** implicit-default staff shell (4/4, C major, treble, quarter) via in-memory ABC; file stays empty until first edit (Phase 4.3)
- **Score model + serializer (Phase 3):** `parseAbc` / `writeAbc` round-trip for v1 — treble staff, key/time sig, whole/half/quarter/eighth notes, rests, accidentals, quarter default; chords and multi-staff parse with warnings and use first pitch/voice only
- **ABC normalization:** interior blank lines inside a fence are stripped before render (extra line breaks can break abcjs; the file on disk is not rewritten)
- Build pipeline (`npm run dev`, `npm run build`, `npm run lint`, `npm run test:abc-normalize`, `npm run test:abc-empty-shell`, `npm run test:roundtrip`)
- View mode routing via `src/plugin/view-mode.ts` (see `docs/DESIGN.md` → Agent development notes if LP and Reading look identical)

## What does not work yet

- Serializer is not yet wired into the Live Preview render or write-back paths (still abcjs-on-ABC text directly; Phase 4+)
- No visual editor, toolbar, or staff interaction
- No debounced sync to markdown
- No measure warning

## v1 scope (planned)

Implemented in serializer (Phase 3); UI integration in Phases 4–5:

- Single treble staff, one pitch per note (no chords in editor; chord ABC parses with warning)
- Note values: whole, half, quarter, eighth; rests; accidentals
- Key and time signature per block
- Default note duration: quarter

Still planned for v1:

- Soft warning after 4 measures (not a hard cap; pasted ABC can exceed)
- Live Preview: editable; Reading view: static; Source: raw ABC
- Hybrid editing with debounced ABC sync (~300ms)
- Graceful fallback for invalid ABC (no red error banners) — render path ✅; model path N/A until wired

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
