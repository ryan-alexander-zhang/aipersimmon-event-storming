---
id: record-00013-scale-navigation-acceptance
type: record
role: main
status: active
parent: plan-00013-scale-navigation
---

# Acceptance record: scale — navigation (search / filter / minimap)

Acceptance evidence for [plan-00013](../plan/plan-00013-scale-navigation.md),
implementing [us-00018](../us/us-00018-navigate-large-board.md) per
[spec-00006](../spec/spec-00006-scale-navigation-nesting.md), within
[decision-00006](../decision/decision-00006-no-event-nesting-scale-via-navigation.md)
(FR8 event-nesting dropped). Verified 2026-07-22. An independent subagent
cross-checked every us-00018 GWT and both spec-00006-XAC scenarios against the
tests; verdict **PASS**. The one cosmetic nit (XAC-2.1 id absent from a test
header) was closed by tagging the covering e2e test.

## Gate results

- Unit: **199 passed** (`bun run test`); `lib/**` coverage ≥90% lines/funcs
  (`filter.ts` 100% lines, `store.ts` 100% lines).
- E2E: **38 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00018-AC-1.1 (search highlights matches + count) | filter.test.ts `matchesQuery`; e2e "search highlights matching elements and reports a count" (count=1, ring on match only) | pass |
| us-00018-AC-2.1 (submit fits view to matches) | filter-controls.tsx `onSubmit`→`fitView({nodes})`; viewport change confirmed in a real browser | pass (manual) |
| us-00018-AC-3.1 (type filter hides non-selected) | filter.test.ts `isShownByFilter` type; store.test.ts `toggleFilterType`; e2e "type filter hides non-selected types…" (Command → 0) | pass |
| us-00018-AC-4.1 (context filter; Ungrouped=null) | filter.test.ts `isShownByFilter` context; store.test.ts `toggleFilterContext` incl. null; `visibleNodes` applies it | pass |
| us-00018-AC-5.1 (search/filter never change export) | e2e "search and filter never change the exported model" (export identical under `normalize`) | pass |
| us-00018-AC-6.1 (minimap pan/zoom) | editor.tsx `<MiniMap zoomable pannable>`; pan/zoom is React Flow native, confirmed in a real browser | pass (manual) |
| us-00018-AC-7.1 (filter composes with Level, never widens) | e2e "type filter … composes with Level" (Command stays hidden at Big Picture even when filter-selected) | pass |
| spec-00006-XAC-1.1 (export + re-import → no filter state) | e2e "search and filter never change the exported model"; store.test.ts "resets the filter on clear and setModel"; `filter` absent from serialize.ts/persistence.ts | pass |
| spec-00006-XAC-2.1 (off-Level types stay hidden under filter) | e2e "type filter … composes with Level [… spec-00006-XAC-2.1]" | pass |

## Manual verification (not automatable / real-browser)

Confirmed in a real browser: search rings the matching node and shows the count
(1 of 2); pressing Enter fits the view to matches (viewport transform changed);
the Filter popover renders type + Bounded-Context chips ("Nothing selected = show
all"), and filtering to Ungrouped hid both Context-1 events (0 shown) while adding
Context 1 restored them (2). Minimap renders with `zoomable pannable` (React Flow
native pan/zoom). No bugs found this pass.

## Deliverables

- `lib/store/filter.ts`: pure `matchesQuery` (label+description, case-insensitive)
  and `isShownByFilter` (type/context sets; empty = all; Ungrouped = `null`);
  `FilterState` + `EMPTY_FILTER`.
- `store.ts`: transient `filter` slice + `setFilterQuery`/`toggleFilterType`/
  `toggleFilterContext`/`clearFilter`; reset in `setModel`/`clear`; never persisted.
- `editor.tsx`: `visibleNodes` composes `isShownByFilter` after Level+Isolate
  (narrow-only); `matchIds` → blue search ring; `<MiniMap zoomable pannable>`.
- `filter-controls.tsx`: toolbar search input + match count + Enter→fit; Filter
  popover of type/context toggle chips; hidden in Discovery Mode.
- **No DSL/schema change, no migration** — entirely view-only.

## Scope note (decision-00006)

FR8 "drill into a Domain Event → nested board" was **dropped**: a Domain Event is
an instant, not a container of a sub-process, and Event Storming has no such
nesting primitive (evidence in decision-00006). Scale is served by this navigation
feature; Event-Storming-faithful decomposition (region / Bounded Context scoped)
is deferred beyond this phase. prd-00002 FR8 and analysis-00002 §6 were corrected.
