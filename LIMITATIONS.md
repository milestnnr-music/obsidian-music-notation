# Limitations and roadmap

**Current status:** Phase 2.1 complete (v0.1.1). Live Preview renders valid ABC via abcjs. Steps 2.2–2.4 not started.  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md)

## What works today

- Plugin loads and enables in a dev vault without errors
- ` ```abc ` blocks register via `registerMarkdownCodeBlockProcessor`
- **Live Preview:** valid ABC renders as SVG notation via abcjs (Phase 2.1)
- **Reading view:** static shell with ABC source placeholder (abcjs render is Phase 2.4)
- **Source mode:** raw fence text unchanged — processors do not run (Obsidian default; no overlay registered)
- **Empty blocks:** whitespace-only fence bodies detected via `block-source.ts`; `data-abc-content="empty"` and `abc-blocks-empty` on both view shells
- **ABC normalization:** interior blank lines inside a fence are stripped before render (extra line breaks can break abcjs; the file on disk is not rewritten)
- Build pipeline (`npm run dev`, `npm run build`, `npm run lint`, `npm run test:abc-normalize`)
- View mode routing via `src/plugin/view-mode.ts` (see `docs/DESIGN.md` → Agent development notes if LP and Reading look identical)

## What does not work yet

- No Reading view abcjs render (Phase 2.4)
- No empty-block staff shell (Phase 2.3)
- No graceful fallback UI for invalid ABC (Phase 2.2; stub only)
- No visual editor, toolbar, or staff interaction
- No debounced sync to markdown
- No measure warning

## v1 scope (planned)

- Single treble staff, one pitch per note (no chords)
- Note values: whole, half, quarter, eighth; rests; accidentals
- Key and time signature per block
- Soft warning after 4 measures (not a hard cap; pasted ABC can exceed)
- Live Preview: editable; Reading view: static; Source: raw ABC
- Hybrid editing with debounced ABC sync (~300ms)
- Graceful fallback for invalid ABC (no red error banners)

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
