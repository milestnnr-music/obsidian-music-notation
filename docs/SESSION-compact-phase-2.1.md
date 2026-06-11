# Session compact — Phase 2.1 (2026-06-10)

**Status:** Phase 2.1 **done** (v0.1.1). LP renders valid ABC as SVG.  
**Full detail:** [`HANDOFF-phase-2.1.md`](HANDOFF-phase-2.1.md)

---

## Goal

Wire **abcjs** into Live Preview for ` ```abc ` blocks (step 2.1 only; not 2.2–2.4).

## Exit criteria (met)

| Check | Result |
|-------|--------|
| Valid ABC in LP | SVG notation renders |
| Blank lines between headers | Auto-stripped in `normalizeAbcBlockBody()` |
| Regression check | `npm run test:abc-normalize` |

## Root cause (resolved)

Extra blank lines inside ` ```abc ` fences caused abcjs to render headers only (`paths: 0`). Fix: remove all interior blank lines in `normalizeAbcBlockBody()` before render. Markdown file unchanged.

## Key files

- `src/plugin/block-source.ts` — normalize (blank-line removal)
- `src/renderer/abcjs-adapter.ts` — abcjs render
- `scripts/check-abc-normalize.mjs` — smoke test

## Phase 2 follow-ups

| Step | Status |
|------|--------|
| 2.2 fallback UI | ✅ Done |
| 2.3 empty staff shell | ✅ Done |
| 2.4 Reading view abcjs | ✅ Done |

## Reference

- Design: `docs/DESIGN.md`
- Agent map: `AGENTS.md`
