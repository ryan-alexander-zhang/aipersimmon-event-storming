---
id: issue-00034-a-hovered-edges-label-is-swallowed-by-the-sticky-it-crosses
type: issue
role: main
status: resolved
parent: design-00003-board-readability-at-scale
---

# A hovered edge's label is swallowed by the sticky it crosses

## Problem

Hovering a relation lifts the line above the board, but its `produces ×` label stays
behind any sticky it crosses — reported from a walkthrough, where the current step's
incoming relation runs past the event in the lane above it and the label came out cut
in half. The line on top with its own label underneath reads as inconsistent.

It is not only cosmetic: the label carries the relation's **delete** control, and a
covered label hands the pointer to the sticky, so the `×` cannot be clicked.

## Root Cause (first principles)

1. **Observed**: the emphasised line paints above the stickies, its label below them.
   **Expected**: an emphasised edge and its label are one object and sit together.
2. **Mechanism**: React Flow's three viewport layers are siblings at `z-index: auto`,
   so they stack by DOM order alone — measured:
   `.react-flow__edges` → `.react-flow__edgelabel-renderer` → `.react-flow__nodes`.
   Every node therefore paints over every label. The line escapes only because
   `decoratedEdges` gives a hovered edge `zIndex: 1000`
   ([`editor.tsx`](../../web/components/editor.tsx)), which React Flow honours by
   putting that edge in its own layer; nothing carries that elevation across to the
   label, which is rendered through `EdgeLabelRenderer` into the shared label layer.
3. **True root cause**: **the edge's elevation is per-edge, the label's stacking is
   per-layer.** One cannot lift the other, so the two halves of the same emphasis end
   up on opposite sides of the nodes. Not a walkthrough bug — the walkthrough only
   makes it easy to hit, because a compacted board puts more stickies under the lines.

## Fix

`app/globals.css`: `.react-flow__edgelabel-renderer { z-index: 1001 }` — above the
nodes layer, and above the `1000` React Flow gives both a selected node
(`elevateNodesOnSelect`) and our hovered edge, so the label cannot be tied with
either. Labels only render for the emphasised set (hover/focus), so nothing else on
the board changes. Context Map relationship labels use the same renderer and are
fixed with it.

## Reproduction

e2e `editor.spec.ts` "a hovered edge's label is not swallowed by a sticky it crosses
[issue-00034]" on `fixtures/model.json`: the External System's `emits` relation runs
down past the Command sharing its column, so its label lands on that sticky. Hovering
it, the elements at the label's own centre are read topmost-first and no element
belonging to a node may sit above the label.

- Before: the stack is `path, path, DIV.mt-1 (the sticky's content), …` — the label
  is at index 4, the node at 2.
- After: the label is above every node element at that point.

## Verification

- e2e **72 passed, 1 failed** (`bun run test:e2e`) — the failure is the pre-existing
  `[issue-00028]` wheel-zoom budget (3 ms asserted, ~7 ms on this machine).
- unit **284 passed**; `tsc --noEmit`, lint, build clean.
