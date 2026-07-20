---
id: plan-00003-readability-tier-a
type: plan
role: main
status: open
parent: spec-00001-mvp-editor
---

# Plan: board readability Tier A (focus & visual hierarchy)

How to build the **Tier A** mechanisms of
[design-00003-board-readability-at-scale](../design/design-00003-board-readability-at-scale.md):
focus-and-dim, on-demand edge labels, relation-typed edge styling, and
parallel-edge separation. View/interaction layer only — **no DSL change and no
change to the layout engine** ([design-00002](../design/design-00002-structured-board.md)
invariants hold). Terms follow [CONTEXT.md](../../CONTEXT.md).

## Design

See design-00003 §2–§3 (Tier A) and §4 (rollout priority). Principle:
legibility comes from **focus**, not from untangling the full graph — the board
is read one chain at a time. All state added here is **view state**; the model
(nodes/edges/contexts) and computed positions are untouched.

## Scope

- In: edge styling by relation, focus-set derivation, node/edge dim, on-demand
  labels, parallel-edge separation. All in `lib/eventstorming`, `lib/store`,
  and `components/` (edges + nodes + `editor.tsx`).
- Out (later tiers): orthogonal routing, cross-context bundling, neighborhood
  isolation, semantic zoom/collapse, any band-order change (Tier B/C).

## Tasks

| # | Task | Delivers (design ref) | Depends | Verify |
|---|---|---|---|---|
| RA1 | Relation style map (pure data in `lib/eventstorming`): per `RelationType` a stable colour + stroke weight, split into a **causal chain** tier (`issues`, `handledBy`, `emits`, `triggers`, `invokes` — heavier/darker) and a **secondary** tier (`updates`, `informs`, `annotates` — thin/light) | §3 Tier A "relation-typed styling" | — | unit: every `RelationType` has a style; tiers partition the set (no gaps/overlap) |
| RA2 | Focus-set helper (pure, `lib/store` or `lib/eventstorming`): given a focused node id + edges, return the set of focused node ids (the node + its neighbours) and edge ids (incident edges); empty in, empty out | §3 Tier A "focus & dim" | — | unit: node → itself + neighbours + incident edges; unrelated excluded; null id → empty |
| RA3 | Store view state: add `hoveredId` (transient); keep `selectedId`; the **focus source** = hover if present else selection. No persistence, no serialize change | §3 Tier A | RA2 | unit: hover/clear updates state; focus source precedence hover>selection |
| RA4 | Custom edge component: render RA1 colour/weight; show the relation label **only** when the edge is in the focus set (or edge-hovered); dim to low opacity when a focus set is active and the edge is outside it | §3 Tier A "on-demand labels" + "focus & dim" | RA1,RA2,RA3 | run: labels hidden by default, appear on focus; edges coloured by relation; off-focus edges dim |
| RA5 | Node dimming + hover wiring: nodes outside the focus set drop to ~15% opacity; wire `onNodeMouseEnter/Leave` → `hoveredId`; clearing focus restores full opacity | §3 Tier A "focus & dim" | RA2,RA3 | run: hovering/selecting a node dims the rest; pane click / mouse-leave restores |
| RA6 | Parallel-edge separation: offset edges that share a corridor (same source/target band-column) so their paths do not perfectly overlap | §3 Tier A "parallel-edge separation" | RA4 | run: two edges in one corridor render as distinct paths; labels no longer collide |
| RA7 | Integration + regression: memoise focus-set per (focus source, edges); keep existing E2E green; add E2E for focus-and-dim and on-demand labels | §4 success criterion | RA4,RA5,RA6 | e2e + unit green; `bunx tsc`, `bun run lint`, `bun run build` clean |

## Detailed Acceptance Path

This is a **view-only** enhancement: it introduces no new `us`/`spec`
requirement and no DSL/GWT change, so acceptance is behavioural + quality gates
rather than a GWT-to-test map.

`resolved` only when:

- RA1–RA7 done; `bunx tsc`, `bun run lint`, `bun run build` clean; unit coverage
  on `lib/**` stays ≥90% ([TESTING.md](../../TESTING.md)); existing unit + E2E
  suites remain green (no regression to design-00002 behaviour).
- The design-00003 §4 success criterion is met and covered by an E2E test:
  **selecting a Domain Event (e.g. `Ride Requested`) leaves its chain clearly
  readable — its incident edges show labels and stay opaque — while unrelated
  nodes and edges recede to low opacity.** Clearing selection restores the full
  board.
- On-demand labels verified: relation labels are hidden in the un-focused board
  and appear for the focused set (E2E).
- Model unchanged verified: export/import and autosave round-trips are identical
  before and after (no view state leaks into the DSL).
