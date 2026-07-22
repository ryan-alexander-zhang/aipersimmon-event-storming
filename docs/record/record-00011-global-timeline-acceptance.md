---
id: record-00011-global-timeline-acceptance
type: record
role: main
status: active
parent: plan-00011-global-timeline
---

# Acceptance record: global timeline; bounded context as a region

Acceptance evidence for [plan-00011](../plan/plan-00011-global-timeline.md),
implementing [us-00015](../us/us-00015-global-timeline.md) per
[spec-00009](../spec/spec-00009-global-timeline-bounded-context-region.md) /
[design-00005](../design/design-00005-global-timeline.md), adopting
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)
(Option A) and resolving
[issue-00010](../issue/issue-00010-no-global-timeline-bc-is-an-axis-segment.md).
Verified 2026-07-22. An independent subagent cross-checked every us-00015 GWT and
spec-00009-XAC-1.1 against the tests; verdict **PASS**. Two flagged coverage
niceties and three stale comments were then closed.

## Gate results

- Unit: **172 passed** (`bun run test`); `lib/**` coverage ≥90% lines/funcs
  (changed files: `timeline.ts`, `layout.ts`, `migrate.ts` 100% lines;
  `store.ts` 100% lines).
- E2E: **32 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00015-AC-1.1 (one global timeline; interleave across contexts) | layout.test.ts "orders events on one global timeline…" + "places one context's event strictly between two of another" | pass |
| us-00015-AC-2.1 (board L→R == walkthrough order) | layout/global-timeline.test.ts "board left→right order equals the walkthrough order" (the converted issue-00010 reproduction, now a real `it`) | pass |
| us-00015-AC-3.1 (context = region/colour, not a column block) | layout.test.ts "derives a context box from its events' columns…"; e2e "a context'd event shows a context tint stripe" | pass |
| us-00015-AC-4.1 (cross-context same order → concurrent, one column) | layout.test.ts "makes events of different contexts at the same order concurrent" | pass |
| us-00015-AC-5.1 (pre-spec per-context file → global order, lossless) | serialize.test.ts v1→v3 chain + v2→v3 migration tests | pass |
| spec-00009-XAC-1.1 (v2 per-context import → global order, no error) | serialize.test.ts "migrates a v2 per-context doc to one global order, preserving concurrency" (A=0, A2=0, C=1, B=2) | pass |

Also: reorder keeps the event's Bounded Context unchanged (store.test.ts
"a reorder keeps the event's Bounded Context unchanged", decision Q1); reassigning
context does not move the column (us-00006-AC-4.1, updated).

## issue-00010 — resolved

Root cause was Bounded Context modeled as an x-axis segment (per-context `order`,
context column blocks). Fixed by Option A: `order` is global; context is an
attribute/region. The reproduction test (board x-order == `timelineOrder`) is
green as a plain `it`. Board left→right order and the walkthrough now agree.

## Deliverables

- `timeline.ts`: global `slotOrders`/`eventSlotIndex`/`normalizeOrders`;
  `timelineOrder` = `(order, id)`; `dropOrder` global (no out-of-context cancel).
- `store.ts`: `addNode` global order; `setEventOrder`/`nudgeEvent`/`moveEventToEnd`
  global; `reassignContext` keeps the column.
- `layout.ts`: columns from the global `order`; context = derived region span
  (empty contexts park after the timeline); free nodes tile per band globally.
- `schema.ts` `DSL_VERSION = "3.0"`; `migrate.ts` chained v1→v2→v3 (per-context →
  global, dense-ranked, concurrency preserved).
- `editor.tsx` drag global, Bounded Context unchanged; `element-node.tsx` context
  tint stripe.
- `CONTEXT.md` (Bounded Context, Timeline, Concurrent Events) + `decision-00002`
  clauses 1/3 reconciled to the global-timeline model.

## Deferred (recorded, not gaps)

Overlapping translucent background **region blocks** were deferred to the
strategic layer (spec-00004); v1 shows context as a sticky tint stripe plus the
derived-span header (design-00005 §6 fallback). us-00006/us-00009 semantics were
re-scoped by spec-00009 and their tests updated.
