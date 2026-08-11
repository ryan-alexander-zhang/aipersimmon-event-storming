---
id: design-00003-board-readability-at-scale
type: design
role: main
status: active
parent: spec-00001-mvp-editor
---

# Design: board readability at scale

How the board stays legible as the model grows (many nodes, many cross-context
relations). Builds on [design-00002](design-00002-structured-board.md) (the
deterministic banded layout) and does not change the DSL or the layout math.
Terms follow [CONTEXT.md](../../CONTEXT.md).

## 1. Problem

Past ~40–50 nodes the board becomes a hairball: edges overlap, labels collide,
and long connectors sweep across the whole canvas. Three independent causes
stack up (all grounded in the current code):

1. **Shared corridor.** A slice's elements sit in the **same column** (same `x`)
   — `computeLayout` in [`layout.ts`](../../web/lib/layout/layout.ts) places
   actor/command/aggregate/event/policy/readModel at one `globalCol`. Every
   inter-band edge of that slice runs in one narrow vertical channel, so edges
   and their always-on labels stack (the repeated `informs` / `updates` seen in
   practice).
2. **Back-edges.** Relation direction fights the fixed band order. `informs`
   goes Read Model (bottom band) → Actor (top band); `invokes` goes Policy →
   Command (upward). These cross every band in between.
3. **Long cross-context edges.** `triggers` / `invokes` that jump bounded
   contexts are drawn as long bezier curves with no routing or bundling
   ([`editor.tsx`](../../web/components/editor.tsx) uses default edge options and
   `routeHandles`), producing the sweeping arcs.

On top of the geometry, **everything renders at full opacity at all times**, with
**edge labels always shown** — there is no focus, no visual hierarchy.

## 2. Principle

**Legibility comes from focus, not from a perfectly untangled full view.** The
closest analogues — data-lineage DAGs (dbt, Dagster) — do not attempt to route a
dense graph cleanly; they let the user select a node and reveal only its
neighborhood, dimming the rest. A large model is read **one chain at a time**.

Corollary: the static full view only needs to be *good enough to orient*; the
interactive layer carries readability. This keeps the deterministic layout of
design-00002 intact and adds a rendering/interaction layer on top of it.

## 3. Mechanisms

Grouped by how much they touch. Tier A is render/interaction only (no layout
change); Tier B changes edge geometry; Tier C is structural.

### Tier A — focus & visual hierarchy (no layout change)

- **Focus & dim.** Highlight the node under attention, its incident edges, and
  their opposite endpoints; drop everything else to a low opacity (~15%). This is
  the primary readability lever — it collapses the hairball to the one chain under
  attention. Derivable from the existing `edges` (match `source`/`target` against
  the focused id); the store tracks `selectedId`. Focused edges are further
  emphasised — **thickened** and given a **directional flow** (marching-ants
  animation along the causal direction), honouring `prefers-reduced-motion` (a
  static thick line when motion is reduced).
  - **Node hover previews only in the neutral state.** When nothing is committed,
    hovering a node previews its chain. Once a scope is committed — a selected
    element **or** a focused Bounded Context (`focusedContext`, spec-00010) — that
    scope is sticky: node hover no longer overrides it, so reading labels or moving
    the pointer does not disturb the chosen highlight. Return to preview by
    clearing the scope (empty-canvas click / Esc). Precedence:
    edge-hover (below) → committed scope → neutral node hover.
  - **Which set "the scope" is.** For a selection or a focused Bounded Context it is
    that element's/context's own incident edges. Under **Isolate** it is the whole
    neighbourhood on screen, not the anchor's incident edges — everything rendered
    there was chosen by the modeller, so all of it traces on hover (issue-00023).
- **Edge-hover isolation.** When many edges are highlighted at once (a node with
  several incident edges), an individual connection is still hard to trace.
  Hovering a single edge emphasises just it — thicker, a soft glow, brought to
  front, its label shown — dims every other edge, **and dims every node except
  the edge's two endpoints**, so the connection reads as just "source → target".
  The node-focus baseline (flow + all incident labels) is unchanged; hover only
  isolates on demand. In the neutral state any edge is traceable. Inside a
  committed scope, only edges **within** that scope trace on hover (following one
  connection in a selected/focused range is intended, taking precedence over the
  committed highlight); hovering an out-of-scope line does nothing.
- **On-demand edge labels.** Hide relation labels by default; show a label only
  when its edge is in the focused set (or on edge hover). Removes label
  collisions directly. The relation is still carried on every edge (`edge.data.relation`).
- **Relation-typed edge styling.** Give each `RelationType` a stable colour and
  weight, and make the **backbone** (`emits`, `triggers` — the event spine)
  heavier/darker than secondary relations (`updates`, `informs`, `annotates`),
  which render thin/light. The eye follows a chain by colour instead of
  untangling geometry.
- **Parallel-edge separation.** Where several edges share the same corridor, give
  each a small curvature/offset so they no longer perfectly overlap.

### Tier B — edge geometry

- **Orthogonal (step) routing.** Replace bezier with right-angle, rounded-corner
  edges routed on the grid. Fewer crossings and bends than curves for dense
  graphs; standard in flow/diagram tooling.
- **Cross-context channel / bundling.** Collect long cross-context connectors
  into a dedicated gutter (top or bottom) or bundle same-direction edges into a
  metro-line-style bundle. Targets the sweeping arcs specifically.

### Tier C — structural (larger)

- **Neighborhood isolation ("focus mode").** Beyond dimming, temporarily *hide*
  everything outside the selected node's N-hop neighborhood, with an
  upstream / downstream / both selector. Mirrors dbt's `model+` / `+model`
  lineage selectors. For deep inspection of 50+ node boards.
  - **The neighborhood is relaid out as its own board** (issue-00021). Hiding
    alone leaves the survivors on their full-board coordinates, so the columns
    and bands the hidden elements vacated stay as empty space and an isolated
    chain reads *worse* than the dimmed full view. So layout is a function of
    `(model, Level, isolate neighborhood)`: the neighborhood's columns are
    re-ranked over its own surviving Domain Events and a band with no surviving
    node reserves no height. Like the per-Level reflow (issue-00009), this keys on
    a **discrete switch** — isolate on/off, depth, direction — never on semantic
    zoom or on search/filter (whose query changes per keystroke). Positions are
    still computed, never authored (§5 holds).
  - **An anchor is an element or a Bounded Context.** A context's slice is its
    members plus every element directly related to one of them: that pulls in its
    own and Ungrouped supporting elements *and* the element on the far side of a
    seam, so a cross-context relation still reads as a relation instead of
    vanishing with its endpoint. Entry point is the context chip's `⋯` menu
    ("Isolate this context"), **not** the chip body — clicking a chip stays the
    two-state Bounded Context Focus toggle of us-00024-AC-3.1 (dim, then clear).
    Bounded Context Focus keeps dimming; Isolate is what hides and reflows.
  - **A framed fit never drops below the detail threshold.** A context can span most
    of the timeline, and fitting such a slice whole zooms out past the semantic-zoom
    threshold (`FULL_DETAIL_ZOOM`), which drops the very detail the view was opened
    to read (measured: a 78-node context slice fitted at zoom 0.23, stickies 28px
    wide). Camera moves that frame a chosen subset — entering Isolate, and the
    recentre on leaving — clamp to that threshold and let the modeller pan. The
    whole-board fit is exempt: that view exists to orient, not to read.
  - **The anchor is pinned, and leaving recenters on it.** The neighbourhood is
    framed around the element selected when Isolate is switched on — the *anchor* —
    and that anchor is **pinned** for the life of the view: clicking another
    element inside it reads that element without re-framing, because the view
    answers "what is connected to *this* element" (issue-00024). Re-anchoring is
    explicit: select the new element, toggle Off then On. Exit is the clearing click
    on empty canvas, Esc, the toolbar chip, or the panel's Off; on exit the camera
    goes to **the element last read inside the view** — the last selection there, or
    the anchor when nothing else was selected — rather than refitting the whole
    board, so the modeller does not have to hunt for where they were (issue-00021,
    issue-00025). While the mode is on with
    nothing selected — the panel's control out of view — a toolbar chip carries the
    state and exits it.
- **Semantic zoom + collapse.** Tie level of detail to zoom and to the existing
  **Levels** (Big Picture / Process / Design, see design-00002 §8): zoomed out or
  at Big Picture, show only the Domain Event backbone and drop labels/read
  models; reveal detail on zoom-in. Allow **collapsing a bounded context or a
  slice into a single card** (hierarchical aggregation) and expanding on demand.
- **Reduce back-edges.** Revisit band order / intra-slice spacing so `informs`
  and `invokes` traverse fewer bands (e.g. place Read Model nearer the Actor
  band, or widen a slice so its cross-band edges do not share one column). This
  is the only Tier that touches the layout engine and should be weighed against
  the stability guarantees of design-00002.

## 4. Rollout priority

Ship **Tier A first** (focus & dim + on-demand labels + relation styling). It is
render/interaction only, carries the lowest risk, and resolves the majority of
the observed clutter because it replaces "see everything" with "see one chain".
Success is observable: selecting `Ride Requested` leaves its request→dispatch
chain clearly readable while the rest recedes.

Add **Tier B** (orthogonal routing, cross-context channel) if the static full
view is still too noisy after Tier A. Treat **Tier C** as demand-driven: focus
mode for deep debugging of very large boards, semantic zoom/collapse when board
size routinely exceeds one screen. Only Tier C's back-edge item changes the
layout engine.

## 5. Non-goals / trade-offs

- **No user-authored positions.** The design keeps design-00002's invariant: the
  user edits the model, the tool computes the layout. Readability is added
  *around* the layout, not by hand-placing nodes.
- **Focus over full-graph aesthetics.** We deliberately do not invest in making
  the un-focused full view perfectly clean; the interaction layer is the
  readability contract.
- **DSL unchanged.** None of Tier A/B, and only the back-edge item of Tier C,
  affect the persisted model; styling and focus are view state.

## 6. Precedents

- Focus/dim & neighbor highlight, orthogonal & floating edges — React Flow
  (custom edges, floating edges) and yFiles orthogonal layout.
- Edge bundling — Holten force-directed bundling; ordered-bundle edge routing.
- Node-focused lineage with upstream/downstream selectors — dbt DAG, Dagster
  lineage.
- Structure via pivotal events and colour-coded stickies — Miro / Avanscoperta
  EventStorming practice.
