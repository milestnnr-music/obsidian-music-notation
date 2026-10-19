# Handoff: Phase 4.5 — Multi-block Live Preview identity

**Date opened:** 2026-06-11  
**Date resolved:** 2026-06-11  
**Status:** ✅ **Complete** (plugin **v0.1.5**). Multi-block LP identity, inline source edit, and two-empty-fence sync verified manually in dev vault.

> **Canonical fix documentation:** [`docs/phase-4.5-multi-block-lp-resolution.md`](phase-4.5-multi-block-lp-resolution.md)  
> Read that file first for root causes, decision flow, file map, automation, and “do not regress” rules. This handoff retains **historical context** from the debugging session and early iterations.

---

## Goal (Phase 4.5) — met

After debounced sync writes in Live Preview, **Source mode** shows the updated ` ```abc ` fence body. In **multi-block notes**, each LP shell must:

1. Render the ABC from **its own** fence on first open (no LP↔Source toggle required). ✅
2. Show an **empty placeholder staff** for empty fences. ✅
3. Route **Write test note (phase 4.2)** / **Place first note (phase 4.3)** to the **clicked** block only. ✅
4. Stay isolated when the user **edits fence source inline** in Live Preview. ✅

Manual exit checklist: `docs/manual-tests/phase-4-source-mode.md` (§1–4) — passed.

---

## What was fixed (summary)

Three separate bug classes; see the resolution doc for full detail.

| Class | Symptom | Fix version |
| ----- | ------- | ----------- |
| **Probe / compare** | Compare always read stale `.abc-blocks/phase-45-probe.json` | v0.1.3 — write to `test-results/` via plugin path |
| **Inline LP source edit** | Bugs when typing in ` ```abc ` fences, not via test buttons | v0.1.4 — trust persisted processor index without shell |
| **Two empty fences** | Write on block 0 flashed notation on block 1 | v0.1.5 — DOM embed index when reliable; removed multi-block ordinal fallbacks |

Key entry points today:

- `resolveLivePreviewProcessorIdentity()` — `src/plugin/block-dom.ts`
- `resolveDomBlockIndexWhenReliable()` — sync + reconcile validation
- `npm run compare:phase-4.5-probe` — automated LP contract check

---

## Test note (minimal repro)

Fixture: `tests/fixtures/phase-4.5-two-block.md` (synced to dev vault `Test.md` via `npm run sync:test-note`).

```markdown
# Multi-block test

```abc
X:1
M:4/4
L:1/4
K:C
CDEF|
```

```abc

```
```

**Dev setup:** Symlink repo to `Desktop/Ideas/Obsidian Dev Vault/.obsidian/plugins/abc-blocks`; `npm run build`; **Reload app without saving** after each build.

**Agent workflow:**

```bash
npm run build && npm run verify:test-note
# Obsidian: reload → open Test.md in LP
npm run compare:phase-4.5-probe
npm run test:phase-4.5
```

---

## Historical session log (pre-fix)

The original session was a **multi-iteration fix loop** before the root causes above were understood. Kept for continuity — **do not re-apply these hypotheses blindly**.

### Iteration A — Harden identity + sync by block index

**Hypothesis:** Render ordinal race, stale processor attrs, and sync using cached `blockOpenLine` caused inverted/wrong fence targeting.

**Changes:** `block-identity.ts`, `sync.ts`, `abc-block-patch.ts`, `block-source.ts`, `block-dom.ts`, `code-block.ts`.

**Outcome:** User still saw swapped notation; indices on shells sometimes correct but display/sync wrong.

### Iteration B — Load-time reconcile + always refresh by index

**Hypothesis:** Skipping refresh when `isPreviewAbcMappingUnreliable()` left wrong initial `abcSource` until full re-process.

**Changes:** `reconcileFromEditorByIndex()` on `editor-change`; deferred `afterPreviewLayout` reconcile.

**Outcome:** Worse regression — empty block lost placeholder staff.

### Iteration C — Stop overwriting identity; remove load-time reconcile

**Hypothesis:** Load-time DOM reconcile raced empty staff mount and overwrote correct shell index before sync write.

**Changes:** Removed load-time reconcile; `reconcileIdentityIfUnset`; `buildSyncContext()` from shell attrs only.

**Outcome:** Issues persisted until probe tooling and DOM-first identity (v0.1.3–0.1.5).

### Original symptoms (all resolved)

| Symptom | Resolution |
| ------- | ---------- |
| Step 4 fails before button clicks | DOM-first identity + index-only read |
| Empty block totally blank | `mount()` guard + correct empty `abcSource` by index |
| Block 1 test button → notation on block 2 | DOM overrides stale persisted index; sync uses `blockIndex` |
| LP↔Source toggle “fixes” display | No longer needed as workaround |
| Shell indices correct but behavior wrong | `domEmbedIndex` in probe; reconcile validates DOM |

---

## Key files (current)

| File | Role |
| ---- | ---- |
| `src/plugin/block-dom.ts` | `resolveLivePreviewProcessorIdentity`, `resolveDomBlockIndexWhenReliable`, unreliable-mapping detection |
| `src/plugin/code-block.ts` | Processor entry; LP identity; conditional `el.empty()` skip |
| `src/plugin/render-live-preview.ts` | Shell lifecycle, `editor-change` reconcile, sync buttons, DOM validation on sync/reconcile |
| `src/plugin/block-identity.ts` | Persist/read `data-abc-block-index` / `data-abc-open-line` |
| `src/plugin/block-source.ts` | `readAbcBodyAtBlockIndex`; no `chooseBestAbcSource` when index known |
| `src/editor/sync.ts` | Debounced write, `resolveSyncBlockOpenLine` |
| `src/dev/phase-45-probe.ts` | Probe schema v2 for `compare:phase-4.5-probe` |

---

## Next steps for agents

**Phase 4.5 is done.** Proceed to **Phase 5** (visual editor) per `docs/DESIGN.md` when the user requests it.

If multi-block LP regresses:

1. Read [`phase-4.5-multi-block-lp-resolution.md`](phase-4.5-multi-block-lp-resolution.md) § “If multi-block LP breaks again”.
2. Reproduce with **inline source edit** and **both fences empty** — not only test buttons.
3. Run `npm run compare:phase-4.5-probe` and inspect `test-results/phase-45-probe.json`.

---

## Related docs

| Doc | Purpose |
| --- | ------- |
| [`phase-4.5-multi-block-lp-resolution.md`](phase-4.5-multi-block-lp-resolution.md) | **Canonical** fix reference for agents |
| `docs/DESIGN.md` | Phase plan and symptom→cause table (updated for 4.5 complete) |
| `docs/manual-tests/phase-4-source-mode.md` | Phase 4.5 manual exit checklist |
| `docs/manual-tests/phase-4-undo.md` | Phase 4.4 exit (done) |
| `AGENTS.md` | Agent onboarding |

---

## Session meta (for continuity)

- **False confidence:** Unit tests alone did not catch Obsidian’s async single-processor re-runs; `npm run test:phase-4.5` + probe compare were added.
- **Misleading signals:** v0.1.2 Notice without probe update; correct-looking `data-abc-block-index` with wrong notation.
- **Transcripts:** Cursor chats `1fd3b960-b06d-4007-859a-355e11bc5a9e`, `d7316c66-c03b-4d4a-bb5b-18f0409825fa` (continued debugging through v0.1.5).
