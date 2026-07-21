---
id: design-00004-timeline-editing
type: design
role: main
status: active
parent: spec-00001-mvp-editor
---

# Design: timeline editing by direct manipulation

Technical design for [us-00010](../us/us-00010-adjust-timeline.md): let the
Modeler adjust a Domain Event's timeline place by dragging it, dropping it onto
another to make them concurrent, splitting it out, or sending it to the ends.
Realizes the "drag events to change `order`" move promised in
[design-00002](design-00002-structured-board.md) §5 and produces/dismantles the
concurrency state of design-00002 §9 by hand. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## 1. Principle (unchanged invariant)

The user edits the **model**; the tool **computes the layout** (design-00002 §1).
A timeline drag is not free positioning: it edits the dragged event's integer
`order`, never its `{x,y}`. On drop the node snaps back to the layout-computed
position for its new order. `nodesDraggable` stays `false` by default and
spec-00001-XFR-4 (no hand-set positions) still holds.

## 2. What already exists

- `order: number` on each Domain Event = its timeline index within a context;
  equal orders are concurrent (design-00002 §9, us-00009).
- `computeLayout` → `computePlacement` step 1 maps each context's distinct
  `order` values to sequential columns and puts same-order events in sub-lanes,
  then propagates the column to the event's slice. **No layout change is needed**
  — it already renders any set of orders correctly.
- Store `reorderEvent(eventId, order)` writes the order and relays;
  property-panel chevrons (`moveEvent`) swap adjacent orders. This is the minimal
  us-00006-FR-3 implementation we are replacing with the richer interaction.

## 3. Order model: column slots, concurrency groups, normalization

Refine the vocabulary the code already relies on:

- **Column slot** — one timeline column in a context = one distinct `order`
  value. Slots are the sorted distinct orders.
- **Concurrency group** — the events sharing one slot's `order`.
- **Normalization** — after every adjustment, remap a context's distinct orders
  to a contiguous `0, 1, 2, …`, **preserving groups** (equal stays equal). This
  satisfies us-00010-FR-8 (no empty columns) and keeps "slot index k ⇔
  `order === k`", so hit-testing and keyboard moves stay simple.

Insertion uses a fractional order, then normalization collapses it back to
integers:

| Op | Target order written | Then |
|---|---|---|
| insert before slot p | `(orderOf(p-1) + orderOf(p)) / 2` | normalize |
| insert before first | `orderOf(0) - 1` | normalize |
| insert after last | `orderOf(last) + 1` | normalize |
| make concurrent with slot p | `orderOf(p)` (exact) | normalize |
| split out / nudge | insert at the adjacent gap (rows above) | normalize |

Split (FR-3) and gap-insert (FR-1) are the **same primitive** — a split just
happens to start from an event that shared its slot.

## 4. Store API (minimal)

One primitive plus a keyboard helper; all funnel through it and relay once:

- `setEventOrder(eventId, order: number)` — write the (possibly fractional)
  order, **normalize the event's context**, then `laidOut()`. Replaces the
  internals of `reorderEvent`. The UI computes `order` from the drop target per
  the table in §3.
- `nudgeEvent(eventId, dir: -1 | 1)` — column-aware move one slot toward the
  start/end: compute the adjacent-gap order in `dir` and call `setEventOrder`.
  Replaces the current adjacent-swap `moveEvent`. Serves FR-4 (ends) via a
  first/last variant and FR-5 (arrows).

Normalization is a pure helper (`normalizeContextOrders(nodes, ctx)`) so it is
unit-testable without React Flow.

## 5. Drag lifecycle (React Flow)

Enable dragging **only** on Domain Event nodes: set `draggable: true` per node in
the store→RF mapping; the global `nodesDraggable={false}` default keeps every
other type locked (React Flow's per-node flag overrides the default).

```
onNodeDragStart(e, node)  if node.type !== domainEvent → ignore
                          record { eventId, ctx }; enter "reordering" UI state
onNodeDrag(e, node)       hitTest(pointerX, ctx) → target:
                            { kind:'gap',  index }        // between/at ends
                            | { kind:'onto', order }      // over a slot center
                          update the transient drop indicator (FR-6)
onNodeDragStop            translate target → order (table §3) → setEventOrder
                          clear indicator; node snaps to computed position
Escape / drop outside ctx cancel: clear state, no store write (FR-7)
```

Only the pointer's **x** is used; y is ignored (bands are fixed). The dragged
node's transient RF position is never persisted.

## 6. Hit-testing geometry

Reuse the context/column geometry already produced for the chrome
(`computeContextBoxes` + layout constants `COL_W`, context base offset in
`web/lib/layout/layout.ts`). For the event's context:

- Each slot centers at `x = base(ctx) + slotIndex * COL_W`.
- The central band of a slot (≈ middle 50%, `COL_W` × a tunable ratio) is the
  **onto** (concurrency) zone → `{kind:'onto', order}`.
- Anything outside a slot center, including the space between slots and beyond
  the ends, is a **gap** → `{kind:'gap', index}` where `index` is the slot
  boundary nearest the pointer.

## 7. UI affordances

- **Insertion indicator**: a vertical marker at the gap boundary, spanning the
  Domain Events band.
- **Concurrency target**: a highlight/outline on the slot being hovered.
- **Buttons/keyboard** (property panel, Domain Event selected): keep the
  left/right chevrons (now `nudgeEvent`), add "move to start/end"; wire Left/Right
  arrows to `nudgeEvent` when the canvas has focus and an event is selected.

## 8. Non-goals

Cross-context drag (an event changing its `context`), dragging non-event nodes,
and free positioning are all out of scope — consistent with spec-00001-XFR-4.
Context reassignment stays the separate path in us-00006-FR-4 / design-00002 §11.

## 9. Testing hooks

- **Unit** (`lib/`): `normalizeContextOrders` (gaps, groups preserved) and
  `setEventOrder`/`nudgeEvent` covering insert-between, before-first/after-last,
  concurrency merge, and split. Pure, no React Flow. Keep `lib/**` ≥90%.
- **E2E** (Playwright): the button (move-to-start) and keyboard (arrow) paths —
  both commit through the same `setEventOrder`/`nudgeEvent` the drag uses — plus
  an assertion that only Domain Events are drag-enabled. **React Flow v12's
  pointer-drag (d3-drag) is not driveable by Playwright's synthetic mouse/pointer
  events** (`onNodeDragStart` never fires), so the pointer-drag itself is NOT
  e2e-asserted; it is covered by the store/unit logic tests above and verified in
  a real browser (agent-browser's CDP drag): drag-to-reorder, concurrency merge,
  the drop indicator, and out-of-context cancel all confirmed. See TESTING.md.

## Links
- Spec: spec-00001-mvp-editor · US: us-00010-adjust-timeline · Plan: plan-00007-timeline-editing
- Builds on: design-00002-structured-board §5, §9, §11
