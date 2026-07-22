---
id: plan-00010-narrative-walkthrough
type: plan
role: main
status: resolved
parent: spec-00005-narrative-walkthrough
---

# Plan: narrative walkthrough

Implements [us-00014](../us/us-00014-narrative-walkthrough.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md). Read-only; reuses the
existing focus/dim rendering and selection. Two phases: the **order + cursor
core** (pure + store, unit-tested) lands first; the **UI** follows. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## Phase 1 — order + cursor core

| # | Task | Verify |
|---|---|---|
| P1.1 | `lib/store/timeline.ts`: pure `timelineOrder(nodes): string[]` — Domain Event ids sorted by `(order, context, id)`. | unit timeline.test.ts: mixed order/context → deterministic sequence; non-events excluded |
| P1.2 | `store.ts`: view-only `walk: { active, index }`; `startWalkthrough` (index 0, select first), `walkStep(dir)` (clamped, select current), `stopWalkthrough`. Not persisted; `clear`/`setModel` reset it. | unit store.test.ts: start selects first (us-00014-AC-1.1); step fwd/back (AC-2.1); clamp at ends (AC-3.1); stop leaves model unchanged (AC-5.1) |

## Phase 2 — UI

| # | Task | Verify |
|---|---|---|
| P2.1 | `editor.tsx`: suppress the arrow-key timeline nudge while `walk.active`. | run/e2e: arrows don't reorder during a walkthrough (us-00014-AC-4.1, spec-00005-XAC-1.1) |
| P2.2 | `components/walkthrough.tsx`: toolbar **Walk** toggle; while active, an overlay with `n / N`, the current event label, and Prev / Next / Exit; `fitView` on the current event when the index changes. | run: start → first slice framed + highlighted; Prev/Next move; Exit resumes |
| P2.3 | `e2e/editor.spec.ts`: start → first selected/focused; Next/Prev; clamp at last; exit; arrows don't reorder mid-walk. | `bun run test:e2e` green |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90% (lines/funcs).
- Behavioural: a walkthrough starts on the first event, steps forward/back with
  the current slice highlighted, clamps at both ends, is read-only (arrows do not
  reorder), and exits leaving the model unchanged.
- A subagent verifies from the docs that every linked `us-00014` GWT and the
  `spec-00005-XAC` scenario have a passing test and no requirement is unfinished;
  a `docs/record/` acceptance checklist links the GWT/XAC ids (CLAUDE.md §7). Any
  gap blocks `resolved`.

**Verified 2026-07-22** — subagent verdict PASS (every GWT/XAC test-backed; the
read-only assertion discriminates suppression from a real reorder); acceptance
evidence in
[record-00010-narrative-walkthrough-acceptance](../record/record-00010-narrative-walkthrough-acceptance.md).
