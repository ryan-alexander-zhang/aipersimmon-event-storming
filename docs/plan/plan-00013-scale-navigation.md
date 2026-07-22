---
id: plan-00013-scale-navigation
type: plan
role: main
status: resolved
parent: spec-00006-scale-navigation-nesting
---

# Plan: scale — navigation (search / filter / minimap)

Implements [us-00018](../us/us-00018-navigate-large-board.md) per
[spec-00006](../spec/spec-00006-scale-navigation-nesting.md), within
[decision-00006](../decision/decision-00006-no-event-nesting-scale-via-navigation.md)
(FR8 nesting dropped). View-only — **no DSL/schema change, no migration**. Terms
follow [CONTEXT.md](../../CONTEXT.md).

## Phase 1 — pure filter logic + store state

| # | Task | Verify |
|---|---|---|
| P1.1 | `lib/eventstorming/filter.ts`: `matchesQuery(node, query)` (case-insensitive label+description) and `isShownByFilter(node, {types, contexts})` (empty set = all; Ungrouped = context `undefined`). | unit: match/no-match; type/context include/exclude; empty-set = all |
| P1.2 | `store.ts`: transient `filter: { query, types, contexts }` + `setFilterQuery`/`toggleFilterType`/`toggleFilterContext`/`clearFilter`; reset in `setModel`/`clear`. | unit: setters mutate only `filter`; reset on clear/setModel |

## Phase 2 — pipeline + minimap

| # | Task | Verify |
|---|---|---|
| P2.1 | `editor.tsx`: extend `visibleNodes` with `isShownByFilter` (composed after Level + Isolate — intersection, us-00018-AC-7.1/XAC-2.1). | unit/e2e: type/context hide; Level still bounds |
| P2.2 | `editor.tsx`: compute `matchIds` from the query; matched nodes get a highlight ring (distinct from focus dimming); submit → `fitView` to matches. | e2e: search highlights + count; fit-to-matches |
| P2.3 | `editor.tsx`: add `zoomable pannable` to `<MiniMap>`. | run: minimap pans/zooms the main view |

## Phase 3 — UI + isolation proof

| # | Task | Verify |
|---|---|---|
| P3.1 | `toolbar.tsx` + `FilterControls`: search input with match count; Filter popover of element types + Bounded Contexts (+ Ungrouped) as toggles, all-on default. | e2e: search count; filter toggles hide/show |
| P3.2 | Prove view-only: export with active query+filters equals unfiltered export (us-00018-AC-5.1, spec-00006-XAC-1.1). | unit serialize / e2e export compare |

## Phase 4 — docs

| # | Task | Verify |
|---|---|---|
| P4.1 | Promote us-00018/spec-00006 → `active`; this plan → `open`; decision-00006 already active. (No CONTEXT.md term added — decision-00006.) | statuses correct |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green;
  `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: search highlights + counts + fits to matches; type/context filters
  hide non-matching and compose with Level/Isolate; minimap pans/zooms; export is
  unaffected by filter state.
- A subagent verifies from the docs that every us-00018 GWT and spec-00006-XAC
  scenario has a passing test and no requirement is unfinished; a `docs/record/`
  acceptance checklist links the ids (CLAUDE.md §7). Any gap blocks `resolved`.

**Verified 2026-07-22** — subagent verdict PASS; the one cosmetic nit (XAC-2.1 id
missing from a test header) closed by tagging the covering e2e. Acceptance evidence
in [record-00013-scale-navigation-acceptance](../record/record-00013-scale-navigation-acceptance.md).
199 unit + 38 e2e green; tsc/lint/build clean; filter.ts/store.ts 100% line coverage.
