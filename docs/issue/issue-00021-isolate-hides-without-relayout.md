---
id: issue-00021-isolate-hides-without-relayout
type: issue
role: main
status: resolved
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Isolate hides the rest of the board but never reflows, so the survivors stay far apart

## Problem

Turning **Isolate** on removes every element outside the selected node's N-hop
neighbourhood, but the surviving elements keep the positions computed for the
**full** board. The columns and bands that the removed elements vacated stay as
empty space, so on a large model an isolated chain of 3–4 stickies is spread
across a mostly empty canvas — the two ends of one relation can sit ~1000px
apart with nothing between them. Isolate is supposed to be the deep-inspection
lever for 50+ node boards (design-00003 §3 Tier C); instead its output is less
readable than the dimmed full board it replaces.

The auto-refit makes it worse, not better: the `fitView` after an isolate
([`editor.tsx:505`](../../web/components/editor.tsx)) fits the survivors'
*bounding box*, which still spans all the vacated space, so the stickies are
scaled down toward the corners of an empty rectangle. It also has no `maxZoom`,
so the opposite case — a 2-node neighbourhood — is blown up oversized (the same
symptom [issue-00009](issue-00009-level-switch-no-relayout-leaves-empty-bands.md)
recorded for Level switching).

## Context / Trigger

Raised from real use: "with many elements the gap between two elements is very
far and readability is very poor." The report assumed Isolate only *dims* the
rest; it does not — it hides. `visibleNodes`
([`editor.tsx:368`](../../web/components/editor.tsx)) drops the out-of-neighbourhood
nodes from the array handed to React Flow, and Tier-A dimming is explicitly
switched off while isolating (`dimActive = focus.active && !isoNodeIds`,
[`editor.tsx:391`](../../web/components/editor.tsx)). Dimming-instead-of-hiding
belongs to a different mechanism (**Bounded Context Focus**, which per
[CONTEXT.md](../../CONTEXT.md) "dims, never hides"). So the defect is not the
hide/dim choice — it is the missing reflow after the hide.

Confirmed by reading the code, not by rendering: this is a layout-input problem,
not a rendering glitch.

## Root Cause (first principles)

1. **Observed**: with Isolate on, each surviving node keeps its full-board `x`
   and `y`; the columns and bands the hidden nodes occupied remain as empty
   space. **Expected**: the neighbourhood reads as a compact board — adjacent
   columns along the timeline, adjacent bands down the slice.
2. **Mechanism** — position is a pure function of `(model, level)`, and *both*
   of its terms are computed over the **full** model:
   - **x**: `computePlacement` ranks the distinct `order` values of **every**
     Domain Event in the model into column indices
     ([`layout.ts:51-52`](../../web/lib/layout/layout.ts)), then
     `x = globalCol * COL_W` ([`layout.ts:170`](../../web/lib/layout/layout.ts)).
     A neighbourhood that keeps the events at `order` 0 and 5 keeps them in
     columns 0 and 5 — `5 * COL_W = 1150px` apart, with 4 empty columns between.
   - **y**: `computeRows` skips a band's height only when that band is hidden at
     the current **Level** (`visibleBand`,
     [`layout.ts:131`](../../web/lib/layout/layout.ts) and
     [`layout.ts:150`](../../web/lib/layout/layout.ts)) — never when the band
     simply has no surviving node. Isolating a Domain Event and its Read Model at
     Design leaves the Policy band's `BAND_H` reserved between them: `264px`
     apart for two adjacent elements.
   - **Nobody recomputes**: `isoNodeIds`
     ([`editor.tsx:355`](../../web/components/editor.tsx)) is a *filter over
     already-positioned nodes*. `computeNeighborhood`
     ([`focus.ts:41`](../../web/lib/store/focus.ts)) returns ids only; no code
     path feeds the neighbourhood back into `computeLayout`.
3. **True root cause**: **the Isolate neighbourhood is not an input to the layout
   function.** Layout is `f(model, level)`; Isolate changes which elements exist
   on screen without being able to change where they sit, so vacated space cannot
   be reclaimed. This is the same class of gap as issue-00009 (which made layout
   a function of `level`), one step further out.
   - Ruled out: node sizing (a fixed min/max width,
     [`element-node.tsx:104`](../../web/components/nodes/element-node.tsx)), edge
     routing, and the dim/hide choice. The missing `maxZoom` on the isolate
     `fitView` is a **second, independent** defect that amplifies the symptom; it
     is not the cause of the gaps.

## Design-invariant conflict (resolved before the fix)

Current behaviour matches the documented intent:
[plan-00005](../plan/plan-00005-readability-tier-c-isolate-semantic-zoom.md)
builds Isolate as "View/interaction layer only — **no DSL and no layout-engine
change**", and [design-00003](../design/design-00003-board-readability-at-scale.md)
§3 Tier C describes it purely as "temporarily *hide* everything outside the
selected node's N-hop neighborhood".

So this is a gap in that design decision, not an implementation slip: it
specified the *hide* and never the *reflow* of the space the hidden elements
vacate. Fixing it makes layout a function of `(model, Level, Isolate
neighbourhood)`. That refinement was recorded in design-00003 §3 Tier C (and noted
against plan-00005's "no layout-engine change") before the fix landed — the same
sequence issue-00009 followed for design-00002 §8. **Isolate** also gained a
CONTEXT.md entry: the glossary listed "isolate" only as a word to *avoid* for
Bounded Context Focus, leaving the shipped Isolate view unnamed.

Critical constraint (inherited from issue-00009): the reflow keys on **discrete,
intentional switches only** — Isolate on/off, and its `direction`/`depth`
changes. It must **not** key on semantic zoom (positions never depend on `zoom`)
nor on search/filter (`filter.query` changes per keystroke; relaying out there
would make the board jump while typing). Search/filter therefore keeps narrowing
the *visible* set without reflowing.

## Reproduction (test-first)

Written failing before the fix (4 failed / 14 passed in `layout.test.ts`), green
after. All at the pure layout layer (`lib/**`, where unit coverage lives — the UI
is covered by the Playwright suite). Each test first asserts today's full-board
gap, so the defect itself is pinned, then asserts the isolate layout:

- **vacated bands**: a slice model isolated to `{ev, rm}` at Design. The full
  board keeps them `2 * BAND_H` apart (the empty Policy band between); isolated,
  `ev` sits at `y = 0` and `rm` one `BAND_H` below.
- **vacated columns**: events at `order` 0…5 where
  `ev0 -triggers-> pol -invokes-> cmd -produces-> ev5`, isolated to that 4-node
  chain. The full board puts the two events `5 * COL_W` apart; isolated, they are
  adjacent (`COL_W`), each still sharing its column with its slice member.
- **band rail agreement**: the returned `bandTops` match the relaid nodes' `y`.
- **level composes**: isolating `{act, cmd, ev}` at Big Picture drops the Command
  (hidden at that level) and leaves the two survivors one `BAND_H` apart.
- Guard: the full board is unchanged — the empty-band collapse is opt-in, so the
  pre-existing layout tests still pass untouched (they rely on it: `sliceModel`
  has no Constraint node yet asserts `y === bandIndex(type) * BAND_H`).

## Fix

Made the neighbourhood an input to the layout, at one pure choke point so the
board and its chrome cannot disagree:

1. `layout.ts`: new `computeIsolateLayout(nodes, edges, contexts, level, keep)` —
   filters to the kept set (dropping what `level` hides), then reuses
   `computePlacement` (column ranks recompute over the surviving events → columns
   compact; lanes/stacks compact with them) and `computeRows` with a new **opt-in**
   `collapseAbsentBands` (a band holding no node reserves no height). Returns the
   relaid nodes **and** their `bandTops` together. `computeLayout` is unchanged
   apart from sharing the extracted `positioned` helper, so the full board keeps
   an empty band's space exactly as before.
2. `editor.tsx`: `isoLayout` (memoised on the isolate switch + Level only, never
   on zoom or `filter.query`) feeds a single `boardNodes`, which every
   position-derived layer now reads — `visibleNodes`, `routedEdges` (edge handle
   anchors) and `nodePos` (parallel-edge spread). The neighbourhood filter left
   `visibleNodes`, since `boardNodes` already is the kept set.
3. `board-chrome.tsx`: takes an `isolated` prop; while isolating, the rail labels
   only the bands the neighbourhood occupies and takes their tops from the same
   relayout. Without this it would label vacated bands at the wrong `y`.
4. `editor.tsx`: the isolate `fitView` gained `maxZoom: 1`, and Domain Event drag
   is locked while isolating (decision (a) below).

Deviation from the intended fix: **no node-position animation.** Adding a
`transition` to node transforms in the same commit that changes them is unreliable
and would interfere with dragging on the full board; the `fitView` camera already
animates over 300ms, which carries the continuity. Not worth the complexity.

Non-goals: no DSL change, no persisted state, no user-authored positions
(design-00003 §5 holds — the reflow is still computed). Bounded Context Focus
keeps dimming; only Isolate reflows.

## Decision

**Dragging a Domain Event while isolated.** Domain Events were `draggable` during
isolate ([`editor.tsx:422`](../../web/components/editor.tsx)) and a drag edits
`order`, not position (design-00004 §1). Under a compacted layout the drop-x no
longer maps to a full-timeline column, so "drop between the two visible events"
is ambiguous about the hidden orders between them. Two options:

- **(a) Lock the drag while Isolate is on** — **decided**. Isolate is a reading
  lever; the modeller re-orders on the full board. Smallest change, no ambiguous
  model mutation.
- (b) Keep it and define the mapping — a drop lands the event at an order between
  its visible neighbours. More code, and an edit whose result is only visible
  after leaving Isolate. Rejected.

## Verification

- Regression tests (`layout.test.ts`, issue-00021): **4 failed before** the fix
  (the capability did not exist; each test's full-board assertions pinned the
  gaps), **all pass after**.
- Gates: unit **275 passed / 21 files**, e2e **57 passed**, `tsc --noEmit` clean,
  `lint` clean. The pre-existing isolate e2e ("isolate keeps only the selected
  node's neighbourhood") still passes — hide semantics intact. No new e2e added:
  the behaviour is layout math, proven at the lowest level (TESTING.md).
- Live (ride-hailing example, production build on :3100): the full board renders
  53 nodes across all bands, unchanged. Isolating **Ride Requested** (both, depth
  2) leaves 10 nodes in **3 columns ~200px apart** with **consecutive bands** —
  the Constraint band between Commands and Aggregates is reclaimed (Aggregate sits
  one step below Command, not two) — and the band rail labels only the six bands
  the neighbourhood occupies, aligned to the relaid nodes. No oversized stickies.
  Confirmed by screenshot.
- Note (out of scope, not changed): the context header chip row still lists every
  Bounded Context while isolating, including contexts no surviving element belongs
  to. It is a non-positional model-level control, so nothing misaligns.
