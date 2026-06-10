# Limitations and roadmap

**Current status:** Phase 0 complete. Phase 1 (block lifecycle) is next.  
**Design reference:** [`docs/DESIGN.md`](docs/DESIGN.md)

## What works today (Phase 0)

- Plugin loads and enables in a dev vault without errors
- Project structure, stub modules, and build pipeline (`npm run dev`, `npm run build`, `npm run lint`)
- Settings types defined in `src/settings/types.ts` (not wired to UI)
- **No ` ```abc ` behavior yet** — code block processor is a stub (`src/plugin/code-block.ts`)

## What does not work yet

- No ABC rendering (abcjs not integrated)
- No visual editor, toolbar, or staff interaction
- No debounced sync to markdown
- No empty-block staff shell
- No invalid-ABC fallback UI in practice (stub only)
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
