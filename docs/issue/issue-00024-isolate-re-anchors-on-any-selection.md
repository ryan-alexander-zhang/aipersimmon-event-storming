---
id: issue-00024-isolate-re-anchors-on-any-selection
type: issue
role: main
status: resolved
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Isolate re-frames itself on every selection, so reading one element's chain keeps moving

## Problem

Isolate was anchored on `selectedId` **continuously**, not on the element it was
opened for. So while isolating, clicking any element inside the view immediately
re-framed the whole board around *that* element — new neighbourhood, new relayout,
new refit. Reading a chain therefore fought the act of inspecting it: clicking a
node to see its properties threw away the frame the modeller had chosen. Clearing
the selection (empty-canvas click) dropped the frame entirely while the mode
stayed on, so the toggle read "On" over a full board.

Isolate exists to answer "what is connected to *this* element". Its frame has to
outlive the clicks made inside it.

## Context / Trigger

Raised from use: "after isolate you should not be able to click another element and
switch to that element's isolate — clicking an element and turning isolate on is
for looking at *that* element's relations."

This supersedes the sticky-mode decision recorded a step earlier (isolate stays on
across the clearing click, next selection re-anchors): the mode is still sticky in
the sense that it is a mode, but the anchor no longer follows the selection, and
the clearing click now exits.

## Root Cause (first principles)

1. **Observed**: the isolate view is a function of the *current* selection, so any
   click inside it re-frames it, and no selection means no frame. **Expected**: the
   view is a function of the element the mode was opened on.
2. **Mechanism**: `IsolateState` carried only `{active, direction, depth}`
   ([`store.ts:33`](../../web/lib/store/store.ts) before the fix) and the editor
   derived the neighbourhood straight from the live selection:
   ```ts
   isolate.active && selectedId ? computeNeighborhood(selectedId, edges, {...}) : null
   ```
   ([`editor.tsx:355`](../../web/components/editor.tsx) before the fix).
3. **True root cause**: **the anchor was never a piece of state.** It was inferred
   from selection, so it could not be pinned — and the two concepts have different
   lifetimes: a selection is "what I am pointing at right now", an anchor is "what
   this view is about". Conflating them makes the frame as volatile as the pointer.
   - Ruled out: the relayout (issue-00021) and the camera recentre — both key off
     whatever anchor they are given, and behave correctly once the anchor is stable.

## Reproduction (test-first)

`store.test.ts` (issue-00024): switching Isolate on pins `anchorId` to the current
selection; selecting another element, clearing the selection, and changing
`depth`/`direction` all leave `anchorId` alone; switching off releases it, and
switching on again pins whatever is selected then; `clear()` resets both.

`e2e/editor.spec.ts` (issue-00024): isolating **Order Placed** (both, depth 2)
frames 4 nodes; clicking **Order View** (`rm1`, a leaf) must leave the view at 4
nodes with the command still on screen, and only move the property panel to
"Order View". Failed before the fix with `Expected: 4, Received: 3` — the view had
re-anchored on the leaf. Passes after.

## Fix

- `store.ts`: `IsolateState` gained `anchorId: string | null`. `toggleIsolate`
  pins `anchorId` to the current `selectedId` when switching on and releases it
  when switching off; `setIsolateDirection` / `setIsolateDepth` re-frame the same
  anchor; `clear` / `setModel` reset both.
- `editor.tsx`: the neighbourhood is derived from `isolate.anchorId`, with a guard
  for an anchor that is no longer on the board (deleted, or hidden by the Level) so
  a dangling anchor frames nothing instead of emptying the canvas. `isoKey` (the
  refit key) follows the anchor, so selecting another element inside the view no
  longer refits.
- `editor.tsx` `onPaneClick`: the clearing click now also leaves Isolate — with a
  pinned anchor nothing else would take the view back to the whole board — and the
  camera recentres on that anchor (issue-00021).

Re-anchoring stays available, explicitly: select the new element, toggle Off then
On. The toolbar chip, Esc, and the panel's Off all exit.

## Verification

- Regression tests (`store.test.ts` + `e2e` issue-00024): fail before, pass after.
- The pre-existing isolate specs still pass unchanged ("isolate keeps only the
  selected node's neighbourhood", the camera-on-exit spec of issue-00021).
- Full suite: 4 consecutive runs, e2e **61 passed** each; unit **276 passed**;
  `tsc` and `lint` clean.
