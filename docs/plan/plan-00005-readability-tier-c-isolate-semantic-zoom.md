---
id: plan-00005-readability-tier-c-isolate-semantic-zoom
type: plan
role: main
status: open
parent: spec-00001-mvp-editor
---

# Plan: board readability Tier C — neighborhood isolation + semantic zoom

Builds two of the [design-00003](../design/design-00003-board-readability-at-scale.md)
§3 Tier C mechanisms: **neighborhood isolation ("focus mode")** and the
**semantic-zoom** half of "semantic zoom + collapse". View/interaction layer only
— **no DSL and no layout-engine change** ([design-00002](../design/design-00002-structured-board.md)
invariants hold). Terms follow [CONTEXT.md](../../CONTEXT.md).

## Design

See design-00003 §3 Tier C. Two independent readability levers on top of Tier A/B:

- **Isolate**: beyond Tier A's dimming, temporarily *hide* everything outside the
  selected node's N-hop neighbourhood, with an upstream / downstream / both
  selector (dbt-style lineage). Anchored on selection (not hover). Generalises
  the existing 1-hop `computeFocus` to a directional N-hop walk.
- **Semantic zoom**: tie level-of-detail to zoom — zoomed out shows only the
  Domain Event backbone (+ participants); zooming in reveals detail. Bounded by
  the current **Level** (Big Picture/Process/Design, design-00002 §8): semantic
  zoom can only *narrow* below the Level, never show more than it.

All state added here is view state; the model and computed positions are
untouched. Isolate/semantic-zoom compose with the Level filter by set
intersection over `visibleNodes`.

## Scope

- In: directional N-hop neighbourhood helper; isolate view state + controls;
  zoom→detail filter; editor wiring to filter the rendered board.
- Out (deferred, later Tier C increments): **collapse a BC/slice into a card**
  (the "collapse" half of C2) and **reduce back-edges / band reorder** (C3,
  which is the only item that would touch the layout engine).

## Tasks

| # | Task | Delivers (design ref) | Depends | Verify |
|---|---|---|---|---|
| TC1 | Neighbourhood helper (pure): `computeNeighborhood(anchorId, edges, {depth, direction})` → `{nodeIds, edgeIds}`; `direction` = up (target→source) / down (source→target) / both; N-hop BFS. `computeFocus` remains the depth-1/both case | §3 C1 | — | unit: down vs up vs both keep different sets; depth 1 vs 2; anchor with no edges → itself; empty anchor → empty |
| TC2 | Store isolate view state: `isolate {active, direction, depth}` anchored on `selectedId`; setters; reset on clear/setModel; never serialized | §3 C1 | — | unit: toggles/reset; export/import unaffected |
| TC3 | Editor applies isolate: when active with a selected node, restrict `visibleNodes`/`visibleEdges` to the neighbourhood (composed with the Level filter); `fitView` to the subset when it changes; exit restores the full board | §3 C1 | TC1,TC2 | run: isolate hides non-neighbourhood nodes; changing direction changes the kept set; toggling off restores |
| TC4 | Isolate controls (property panel): Isolate toggle + direction (up/down/both) + depth stepper for the selected node; exit on toggle-off or deselect | §3 C1 | TC3 | run: toggling filters the board; direction/depth controls update it |
| TC5 | Semantic-zoom filter (pure): `typesForZoom(zoom, level)` → allowed element types, bounded by the Level; backbone (Domain Event + Actor/External System + Hotspot) at low zoom, full Level set at high zoom, with a middle tier | §3 C2a | — | unit: low zoom → backbone subset; high zoom → full Level set; result ⊆ Level types always |
| TC6 | Editor applies semantic zoom via `useViewport`, composing with Level and isolate filters | §3 C2a | TC5 | run: zooming out hides detail (read models/policies/commands); zooming in restores; never exceeds the Level |
| TC7 | Verify + acceptance: unit + E2E (isolate hide/direction; semantic-zoom detail drop) + visual on the ride-hailing model; coverage ≥90%; record; resolve | §4 | TC1–TC6 | gates green; `docs/record/` acceptance checklist |

## Detailed Acceptance Path

View-only; no new `us`/`spec` requirement. Acceptance is behavioural + quality
gates.

`resolved` only when:

- TC1–TC7 done; `tsc`, `bun run lint`, `bun run build` clean; unit coverage on
  `lib/**` stays ≥90% ([TESTING.md](../../TESTING.md)); existing unit + E2E stay
  green (Tier A/B behaviour unaffected).
- **Isolate**: with a Domain Event selected and isolate on, the board shows only
  that node's neighbourhood; `downstream` keeps only the downstream chain,
  `upstream` only the upstream; toggling isolate off restores the full board.
  Covered by E2E.
- **Semantic zoom**: zooming out below the threshold hides detail types and
  leaves the Domain Event backbone; zooming back in restores; the visible set is
  never larger than the current Level. The `typesForZoom` unit test covers the
  mapping; an E2E (or component test) covers the zoom-driven hide.
- Model unchanged: export/import round-trip and autosave identical before/after
  (isolate/zoom state is render-only, never serialized).
