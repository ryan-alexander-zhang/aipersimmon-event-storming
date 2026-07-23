---
id: issue-00015-compare-diff-overlaps-hidden-bands
type: issue
role: main
status: resolved
parent: spec-00008-model-versioning-compare
---

# Compare diff overlaps stickies when the snapshot was captured at Big Picture

## Problem

In the Compare (unified diff) view, stickies visibly **overlap** — Read Model piled on
Hotspot, Policy on Read Model, Command on Domain Event, labels doubled (user
screenshot). It looks like two models are rendered at once. They are not: only the
target model is rendered; the elements are laid out on top of each other.

## Context / trigger

Reproduces when the compared snapshots were captured at a level that hides some
element types — most easily **Big Picture** (hides Command, Constraint, Aggregate,
Policy, Read Model). A model built at Design and then snapshotted at Big Picture
still contains those elements, and the diff renders them.

## Root cause (first principles)

1. **Observed**: level-hidden element types render at collapsed y-positions,
   overlapping each other and the next visible band. **Expected**: one coherent
   board with every element in its own band (like the live board).
2. **Mechanism**: `web/lib/layout/layout.ts` `computeRows` (line ~150) gives bands
   **hidden at the level zero height** so the visible bands sit adjacent
   (issue-00009). The live board tolerates this because `editor.tsx` *filters out*
   hidden-type nodes (`visibleNodes` via `typesForZoom`) before rendering — the
   collapsed bands are empty. `components/snapshot-board.tsx` instead laid the diff
   out at the **snapshot's stored level** (`fromModel(model).level`) and then
   rendered **all** nodes, including the hidden-type ones — which land on the
   zero-height collapsed bands and pile up.
3. **True root cause**: a mismatch between *layout level* and *what is rendered*. The
   diff renders every element, so it must lay out with **every band present**. It is
   not a React Flow, diff-engine, or double-render bug — only the layout level was
   wrong for a render-everything surface.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` "compare diff lays out all bands so level-hidden types don't
overlap [issue-00015]": add a Domain Event + a Command (Command is hidden at Big
Picture), capture two snapshots **at Big Picture**, open Compare, and assert the diff
board's Command sits fully above the Domain Event (`cmd.bottom <= evt.top`). Before
the fix the Command collapses onto the event band and the assertion fails.

## Fix

`snapshot-board.tsx`: lay the diff board out at the full **`"design"`** level
(`computeLayout(nodes, edges, contexts, "design")`) instead of the snapshot's stored
level. At Design no band is hidden, so nothing collapses and every rendered element
gets its own band. The stored level is still shown in the picker label, purely
informational.

## Verification

**Resolved 2026-07-23.** The repro test now passes — the diff board's Command sits
fully above the Domain Event (`cmd.bottom ≤ evt.top`) instead of collapsing onto it.
235 unit + 44 e2e green; tsc/lint/build clean. Real-browser: the overlap is gone; the
diff shows one coherent board with each element in its own band, only added/changed
elements ringed and removed listed in the summary.
