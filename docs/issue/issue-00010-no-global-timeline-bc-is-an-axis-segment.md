---
id: issue-00010-no-global-timeline-bc-is-an-axis-segment
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# There is no global timeline — a Bounded Context is modeled as an x-axis segment

## Problem

The board has **no single global timeline**. Each Bounded Context owns its own
private, per-context event ordering, and contexts are concatenated left→right as
separate column blocks. Consequences:

- An event in a later context always renders to the right of every event in an
  earlier context, regardless of when it happens. You **cannot place a Payment
  event chronologically between two Ordering events** — the core thing an Event
  Storming timeline is for.
- Two contexts' "slot 0" are unrelated integers with no shared meaning, so there
  is no notion of "these two events across contexts are simultaneous."
- The narrative walkthrough (spec-00005) visits events in an order that does not
  even match the board's own left→right order (see root cause §2).

## Context / Trigger

Surfaced while reviewing the timing logic of the walkthrough (spec-00005). The
question "what is the walk's sequence across contexts?" exposed that the
divergence is not a walkthrough bug but a base-model defect in how the timeline
and Bounded Context relate.

Event Storming (Brandolini, Big Picture): there is **one** shared timeline — the
whole business's Domain Events on one left→right chronological/causal line.
Bounded Contexts are clusters/regions that emerge **over** that single timeline
(and may overlap in time); they are an attribute of events, not separate parallel
timelines.

## Root cause (first principles)

1. **Observed**: `order` is scoped to a context and contexts are laid out as
   adjacent column blocks, so the x-axis is a concatenation of per-context
   timelines. **Expected**: a single global timeline where any event may sit at
   any global position and a Bounded Context is an orthogonal grouping.

2. **Mechanism** (smallest diverging pieces):
   - `order` is normalized **per context** to `0..k-1`
     (`web/lib/store/timeline.ts` `normalizeContextOrders` / `slotOrders` filter
     by `n.data.context === ctx`).
   - A new Domain Event's order is seeded from its **own context only**
     (`web/lib/store/store.ts` `addNode`: "next order among events in the same
     context"). So the integer is, initially, the creation order *within that
     context* — later editable by drag/nudge (us-00010), never global, never a
     timestamp.
   - The board places contexts as **side-by-side column groups**: x =
     `(context.order block) then (event.order within block)`
     (`decision-00002` clause 3 "Bounded contexts are first-class — column groups
     along the timeline"; `CONTEXT.md` "one column group along the timeline";
     `web/lib/layout/layout.ts` `computeContextBoxes` + `CTX_GAP_COLS`).
   - The walkthrough sequence sorts by `(order, contextId, id)`
     (`web/lib/store/timeline.ts` `timelineOrder`), while the board's visual
     left→right is `(context.order, order)`. **These diverge for ≥2 contexts.**

3. **True root cause**: **Bounded Context is modeled as a segment of the x-axis
   (the time axis).** Because time already owns x and element type owns the
   y-bands, giving a context its own stretch of x forces one private timeline per
   context and makes a shared global timeline unrepresentable. The
   walkthrough-vs-board mismatch is a *symptom* of this, not the cause; so is the
   inability to interleave contexts.

## Design-invariant conflict (must be resolved to fix)

Current behavior **matches the documented spec**: `decision-00002` deliberately
made Bounded Contexts "column groups along the timeline" and `us-00006` frames
the board as "bounded contexts along an ordered timeline". So this is not an
implementation slip — it is a limitation of that decision. Resolving it requires
a decision to change the model; recorded in
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)
(**Option A**: one global timeline, Bounded Context as an orthogonal
attribute/region, not an axis segment).

## Reproduction (test-first)

To be written failing before the fix, kept as the regression guard:

- `layout.test.ts` + `timeline.test.ts` (issue-00010): build two contexts —
  Ordering `[A order 0, C order 1]` and Payment `[B order 0]` — that on a single
  Event Storming timeline are chronologically `A < B < C`. Assert the board's
  left→right x-order equals `timelineOrder(nodes)`.
  - **Fails now**: board x-order = `[A, C, B]` (Ordering block then Payment
    block); `timelineOrder` = `[A, B, C]`. They are not equal, and neither is the
    intended `A < B < C` reachable while `order` is per-context.
  - **Passes after** the Option-A fix: one global `order` makes both the board
    and `timelineOrder` yield `[A, B, C]`.

## Fix

Direction fixed by [decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)
(**Option A**): promote `order` to a single global timeline; demote Bounded
Context to an orthogonal attribute rendered as colour/region (not an x segment);
concurrency = equal global order; `timelineOrder` and the board both derive from
the one global order. Implementation (layout engine, DSL migration of per-context
→ global order, walkthrough) is a Phase-2 change tracked in a follow-up
`spec`/`plan` under [prd-00002](../prd/prd-00002-complex-business-analysis.md);
not applied by this issue.

## Verification

**Resolved 2026-07-22** (Option A, spec-00009 / plan-00011). The reproduction test
`web/lib/layout/global-timeline.test.ts` (board x-order == `timelineOrder`) is
green as a plain `it`; the board's left→right order and the walkthrough now agree,
and events interleave across contexts on one global timeline. Full acceptance in
[record-00011-global-timeline-acceptance](../record/record-00011-global-timeline-acceptance.md).
