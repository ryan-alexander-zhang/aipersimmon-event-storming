---
id: issue-00032-a-walkthrough-step-leaves-its-slice-scattered
type: issue
role: main
status: resolved
parent: plan-00021-walkthrough-reading-scope
---

# A walkthrough step leaves its slice scattered across the vacated space

## Problem

Walking to a Domain Event on a real board showed the step's own Command roughly
**1200px above** the event with nothing in between, and its Aggregate far off to
the right. The Reading Scope hid the other slices correctly, but what was left was
spread across the whole canvas instead of gathered around the step — the opposite
of the compact reading Isolate gives.

Reported as "怎么没有重排其他节点？…跟 isolate 的表现形式类似啊" against a
41-event board, walked to `Invoice Charged Back`.

## Context / Trigger

[plan-00021](../plan/plan-00021-walkthrough-reading-scope.md) deliberately chose to
**filter the full board in place** and skip `computeIsolateLayout`, to stop the
timeline's columns drifting between steps. It recorded the trade-off as "the vacated
space is off-screen anyway, because the camera frames the current slice". That
reasoning was wrong, and this issue is its correction.

## Root Cause (first principles)

1. **Observed**: the retained slice sits where the *full* board put it, hundreds of
   pixels apart. **Expected**: the step's slice reads as one group.
2. **Mechanism**: the full-board geometry is a function of the whole model, not of
   what is currently visible. Band tops are sized to the tallest content in each
   band anywhere on the board
   ([`layout.ts`](../../web/lib/layout/layout.ts) `computeRows`), and a supporting
   element shared by many events lands in the column of the **first** event that
   claims it (`computePlacement`'s `!place.has(id)` guard). Hiding the other slices
   changes neither. So the survivors keep coordinates computed for a board that is
   no longer on screen.
3. **True root cause**: **filtering is not layout.** Choosing *what* is visible
   cannot fix *where* it sits — the space the hidden elements vacated has to be
   reclaimed by recomputing positions for the retained set, which is exactly what
   `computeIsolateLayout` exists to do (issue-00021). And the fear that drove the
   original choice does not apply here: columns are the distinct `order` values of
   the **retained** events, and a walkthrough retains every event on every step, so
   the column sequence is identical step to step.

## Fix

- `editor.tsx`: the walkthrough's retained set (every Domain Event ∪ the Current
  Step's Reading Scope) goes through `computeIsolateLayout`, the same relayout
  Isolate uses.
- `editor.tsx`: Tier-A dimming stays on inside that layout. It was suppressed
  whenever an isolate layout existed, on the premise that isolate had already
  removed everything irrelevant — untrue for a walkthrough, which keeps the whole
  timeline as *context*, so the out-of-scope events must still dim.
- `walkthrough.tsx`: the camera frames the step's **own slice** (one hop), not the
  event alone and not the whole scope. Framing the event alone left its Command off
  screen; framing a wide scope shrank the board to an unreadable strip and pulled
  the frame's centre away from the step, because at scope 2–3 the neighbourhood
  reaches events far along the timeline. One hop also means the slider no longer
  throws the camera.

Byproduct, not a separate change: `draggable` is gated on `!isoLayout`, so a Domain
Event can no longer be dragged mid-walk. The `spec-00005-XFR-1` violation flagged
in plan-00021's out-of-scope list is closed by this fix rather than by a guard.

## Reproduction / Verification

Measured on `examples/big.json` (41 events, Design level), walked to
`Payment Attempt Failed` and stepped on:

- **Column drift, the risk this fix takes on**: `0 of 41` events changed their
  flow-space x between two consecutive steps (read from each node's own
  `transform`, so the camera cannot flatter it).
- **Compaction**: at scope 1 the step is centred with its Command directly above
  via `produces` and its two Policies directly below via `triggers`; the empty
  Constraints and Aggregates bands collapse. At scope 2 the two-hop context
  (`Resolve Payment Attempt`, `Book Journal Entry`, the neighbouring policies)
  appears around it at readable zoom.
- Suite: unit **283 passed**; e2e **71 passed, 1 failed** — the pre-existing
  `[issue-00028]` wheel-zoom budget (3 ms asserted, ~7 ms on this machine).
  `tsc --noEmit`, lint, build clean. The us-00029 e2e still passes unchanged,
  including its column-stability assertion, now under the relayout.

The regression guard is the existing us-00029 e2e, extended with a band-collapse
assertion: the first event's Command owns the only Aggregate on the board, which sits
in a band between the Commands and Domain Events rows, so on the full board it holds
the second event's Command away from its own event; walking to that event drops the
Aggregate, collapses its band, and closes the gap. Confirmed by disabling the
relayout branch — the test goes red. Note *where* it goes red: hiding and compaction
now come from the same mechanism, so without the relayout the Aggregate is not hidden
either and the test fails on that assertion before reaching the gap.

The vertical gap is smaller but not zero at scope 2–3: a kept node in a distant
column keeps its band alive, so that band holds height across the whole board. It
is bounded by the scope and no longer dominates the frame.
