---
id: spec-00010-bounded-context-focus
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: bounded context focus + compact context header

> The shippable capability: make the Bounded Context header **scale to many
> contexts** (compact, fixed-height) and let a Modeler **click a context to focus
> it** — its slice stays vivid while everything else dims — so membership is
> readable at a glance without boxing contexts or touching the layout.

## 1. Context

The context header (`board-chrome.tsx`) renders one tall row per Bounded Context
(colour + name input + classification `<select>` + "+ Event" + delete). With 7+
contexts the header grows into a wall and eats vertical canvas space. Separately,
membership is only conveyed by the sticky per-node **tint** (decision-00005); with
many overlapping contexts on one global timeline the tint alone is hard to read.

This spec keeps the model exactly as
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)
defines it — **one global timeline; Bounded Context is an orthogonal attribute,
not an axis segment; layout stays x=time / y=band and is derived, never dragged.**
It adds **no** spatial frame and **no** layout change. It only adds a transient
**Focus** view interaction (spotlight one context's slice, dim the rest) and a
compact header. Because it does not change the axis/region model, it needs **no
new decision**; it aligns with decision-00005.

Focus is deliberately distinct from the existing **Filter** (hides elements) and
from **Walkthrough** (steps events in order). Focus **dims**, never hides, so the
global timeline and the cross-context seams stay visible — the two things a Big
Picture exists to show.

New term **Bounded Context Focus** enters `CONTEXT.md` as part of this spec's
implementation (plan-00018), when the code lands.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US24 | [us-00024-focus-bounded-context](../us/us-00024-focus-bounded-context.md) | draft | Click a context to focus its slice (dim the rest); compact fixed-height header that scales to many contexts |

## 3. Cross-cutting requirements

- **spec-00010-XFR-1** (Ubiquitous) Focus is transient view state; the system
  shall never write it to the DSL, the persisted Model, or a Snapshot.

### Acceptance (XAC)

- **spec-00010-XAC-1.1** (spec-00010-XFR-1)
  Given a context is focused
  When the Model is exported/saved and re-imported
  Then the DSL contains no focus state and the reloaded board starts unfocused

## 4. Technical Design (inline — small spec)

Reuse the **existing focus/dim pipeline** rather than build a parallel one: the
board already dims off-focus nodes (`NODE_DIM_OPACITY`) and edges
(`ESEdgeData.focusState`) from a `FocusSet` computed by `computeFocus` in
`lib/store/focus.ts`, driven by hover/selection. Bounded Context Focus is the
same emphasis at context granularity — a second `FocusSet` source. So:

- **Store** (`store.ts`): add transient `focusedContext: string \| null` plus
  `setFocusedContext(id \| null)` (single-select; passing the current id clears).
  Not serialized (sits with `selected`/`hover`, not in the DSL); cleared by
  `removeContext`/`setModel`/`clear`.
- **Focus set** (`lib/store/focus.ts`, beside `computeFocus`):
  `computeContextFocus(contextId, nodes, edges): FocusSet`. `nodeIds` = **member
  nodes** (`data.context === contextId`) ∪ their edge neighbours **that are not in
  a different context** (own/Ungrouped supporting Commands/Actors/Aggregates…).
  `edgeIds` = every edge incident to a member — so a relation to another context
  (a **seam**) is `"on"` (highlighted) while that other context's node stays
  dimmed. Unit-tested in isolation.
- **Wire-in** (`editor.tsx`): feed the context focus into the existing `focus`
  memo — when a context is focused, `focus = computeContextFocus(...)` (hovering a
  node still previews its chain via `computeFocus`). No `data.dimmed`, no new
  field, **no change to `element-node.tsx` / `relation-edge.tsx`**; dimming falls
  out of the existing pipeline.
- **Header** (`board-chrome.tsx`): rebuild the context legend as a **single
  compact row** (horizontal-scroll on overflow, so height is constant regardless
  of count). Each chip shows colour + name + subdomain badge always; the chip
  body is the **focus toggle** (`setFocusedContext(id)`). Edit actions move behind
  progressive disclosure (hover/`⋯`): rename (double-click / menu),
  classification, delete. "+ Event" stays as the per-context creation entry point
  (unchanged behaviour).
- **Clear focus**: click the focused chip again, press `Esc`, or click empty
  canvas (`onPaneClick`).
- **Relation to Filter**: Focus **dims** via this pipeline; the existing
  `toggleFilterContext` (context filter) **hides**. Distinct, complementary; no
  change to Filter.

## 5. Error handling

- Focusing a context with no members dims everything else and leaves that
  context's (empty) slice — no crash, no layout change.
- Deleting or renaming the focused context clears/keeps focus consistently (focus
  holds an id; a removed id clears focus).

## Links

- PRD: prd-00002 · Aligns with decision-00005 · US:
  [us-00024](../us/us-00024-focus-bounded-context.md) · Plan:
  [plan-00018-bounded-context-focus](../plan/plan-00018-bounded-context-focus.md)
