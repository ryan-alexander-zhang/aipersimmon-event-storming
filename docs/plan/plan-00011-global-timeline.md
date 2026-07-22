---
id: plan-00011-global-timeline
type: plan
role: main
status: resolved
parent: spec-00009-global-timeline-bounded-context-region
---

# Plan: global timeline; bounded context as region

Implements [us-00015](../us/us-00015-global-timeline.md) per
[spec-00009](../spec/spec-00009-global-timeline-bounded-context-region.md),
resolving [issue-00010](../issue/issue-00010-no-global-timeline-bc-is-an-axis-segment.md)
and [decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md).
A model refactor with a DSL migration — larger than the prior Phase-2 features.
Extract a `design/` doc before Phase 1. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## Phase 0 — design + failing tests

| # | Task | Verify |
|---|---|---|
| P0.1 | ✅ `design/` doc: global-order model, context-region rendering, migration rule → [design-00005](../design/design-00005-global-timeline.md) (draft, pending review). | done |
| P0.2 | ✅ Reproduction test `lib/layout/global-timeline.test.ts` — board x-order == `timelineOrder`; red today, held green via `it.fails` (flip to `it` in Phase 1). The A<B<C interleave test is added in P1.2 once the global model exists. | done (red baseline) |

## Phase 1 — model, DSL, layout core

| # | Task | Verify |
|---|---|---|
| P1.1 | `timeline.ts`: global `normalizeOrders`; `timelineOrder` = sort by `(order, id)`. | unit: global order; board==walk (us-00015-AC-2.1) |
| P1.2 | `store.ts`: `addNode` assigns next **global** order; concurrency = equal global order. | unit: interleave A,B,C (AC-1.1); cross-context concurrency (AC-4.1) |
| P1.3 | `schema.ts` + `migrate.ts`: `order` global; migrate per-context→global deterministically; version bump if needed. | unit serialize/migrate: old file → global order, lossless (AC-5.1, spec-00009-XAC-1.1) |
| P1.4 | `layout.ts`: columns from global `order`; remove per-context x-blocks; expose per-context column spans for region rendering. | unit layout: two contexts interleave in x; reproduction test green |

## Phase 2 — context region UI + doc reconciliation

| # | Task | Verify |
|---|---|---|
| P2.1 | `board-chrome.tsx` + `element-node.tsx`: render Bounded Context as a background region (may overlap) and/or sticky tint; drop the column-group boxes. | run/e2e: contexts read as regions, interleaved (AC-3.1) |
| P2.2 | Update `us-00006`/`us-00009` tests to the global model; verify walkthrough (spec-00005) now matches the board with no code change. | unit/e2e green |
| P2.3 | Rewrite CONTEXT.md (Bounded Context, Timeline, Concurrent Events) and decision-00002 clauses 1/3 to the global-timeline model. | docs consistent with code |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green;
  `lib/**` coverage ≥90% (lines/funcs).
- issue-00010's reproduction tests pass; the walkthrough visits events in true
  global order matching the board; old per-context files import losslessly.
- Behavioural: events interleave across contexts on one timeline; a context reads
  as a region; concurrency works across contexts.
- A subagent verifies from the docs that every linked `us-00015` GWT and
  `spec-00009-XAC` scenario has a passing test and no requirement is unfinished;
  a `docs/record/` acceptance checklist links the GWT/XAC ids and marks
  issue-00010 resolved (CLAUDE.md §7). Any gap blocks `resolved`.

**Verified 2026-07-22** — subagent verdict PASS; acceptance evidence in
[record-00011-global-timeline-acceptance](../record/record-00011-global-timeline-acceptance.md).
