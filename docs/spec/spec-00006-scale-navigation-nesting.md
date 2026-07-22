---
id: spec-00006-scale-navigation-nesting
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: scale — navigation (search / filter / minimap)

> The shippable capability: help a modeller navigate a **large** board — search
> elements by text, filter by type / Bounded Context, and navigate via a
> pan/zoom minimap. Delivers [prd-00002](../prd/prd-00002-complex-business-analysis.md)
> FR7. FR8 (event-level nesting) is **dropped** per
> [decision-00006](../decision/decision-00006-no-event-nesting-scale-via-navigation.md);
> this spec introduces **no DSL change**.

## 1. Context

analysis-00002 §6 flags a scale ceiling: a few-hundred-element flat board is hard
to survey. This is a **view-only** capability over the existing single flat model
— it never mutates the Model or the DSL. It composes with the existing view
filters (Level `levels.ts`, Isolate `focus.ts`), all applied at one choke point
(`editor.tsx` `visibleNodes`).

Per decision-00006 there is **no "Drill-down / Nested board" term** — nesting a
board inside a Domain Event is not an Event Storming construct.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US18 | [us-00018-navigate-large-board](../us/us-00018-navigate-large-board.md) | active | Search by text (highlight + fit-to-matches), filter by type / context (hide non-matching), pan/zoom minimap; all view-only |

## 3. Cross-cutting requirements

- **spec-00006-XFR-1** (Ubiquitous) The system shall keep search and filter as
  transient view state only: never written to the Model, the DSL, or local
  persistence, and reset on model load/clear.
- **spec-00006-XFR-2** (Ubiquitous) The system shall compose search/filter with
  the existing Level and Isolate filters (intersection), never widening the
  visible set beyond what those allow.

### Acceptance (XAC)

- **spec-00006-XAC-1.1** (spec-00006-XFR-1)
  Given an active search query and type/context filters
  When the model is exported
  Then the exported DSL is identical to the unfiltered export (no filter state)
- **spec-00006-XAC-2.1** (spec-00006-XFR-2)
  Given the Level is Big Picture (Commands hidden)
  When a type filter would show Commands
  Then Commands stay hidden (Level still bounds the view)

## 4. Technical Design (inline — small, UI-only)

- **Pure filter module** (`lib/eventstorming/filter.ts`): `matchesQuery(node,
  query)` (case-insensitive over label + description) and `isShownByFilter(node,
  filter)` (type set + context set; empty set = "all"). Unit-tested in isolation.
- **Store** (`store.ts`): a transient `filter: { query: string; types: Set<ElementType>;
  contexts: Set<string | null> }` (isolate/discovery pattern) + setters; reset in
  `setModel`/`clear`. View-only — not in `serialize.ts` or `persistence.ts`.
- **Filtering pipeline** (`editor.tsx`): extend the `visibleNodes` filter with the
  type/context predicate (composed after Level + Isolate). Text search does **not**
  hide; it computes a `matchIds` set → matched nodes get a highlight ring and the
  toolbar shows a match count; submitting the search fits the view to the matched
  nodes (`fitView`). Search highlight is kept distinct from focus dimming to avoid
  clashing.
- **Minimap** (`editor.tsx`): add `zoomable pannable` to the existing `<MiniMap>`.
- **UI** (`toolbar.tsx` + a small `FilterControls`): a search input with a match
  count, and a Filter popover listing element types and Bounded Contexts (plus
  Ungrouped) as toggles; all-on by default.

## 5. Error handling

- Empty query → no highlight, no fit change; all nodes shown (subject to
  type/context filters + Level/Isolate).
- A filter that hides everything → an empty board is allowed (non-blocking); the
  minimap and search reflect the empty set. Clearing filters restores the view.
- Deleting a Bounded Context that was in the context filter → the filter simply
  no longer matches it; no crash (stale context ids are ignored).

## Links

- PRD: prd-00002 (FR7) · Decision: decision-00006 (FR8 dropped) · Plan:
  [plan-00013-scale-navigation](../plan/plan-00013-scale-navigation.md)
