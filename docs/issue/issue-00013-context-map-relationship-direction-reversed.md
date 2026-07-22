---
id: issue-00013-context-map-relationship-direction-reversed
type: issue
role: main
status: resolved
parent: spec-00004-strategic-subdomains-context-map
---

# Context Map relationship direction is reversed

## Problem

Drawing a relationship on the Context Map by dragging from context A to context B
produced a relationship pointing **B → A**: the arrowhead landed on the drag's
*start* node instead of the *drop* node (user report).

## Context / trigger

Introduced with the Context Map surface (commit 243cebb). Reproduces on every
connect-drag.

## Root cause (first principles)

1. **Observed**: drag A→B stores `{ source: B, target: A }`. **Expected**:
   `{ source: A, target: B }` (source = where the drag starts).
2. **Mechanism**: `ContextNode` renders, per side, a `source` handle **then** a
   `target` handle at the same position. With equal stacking context the later
   element (the **target** handle) sits on top, so a connect-drag *starts* on the
   target handle. React Flow assigns `source`/`target` by handle **type**, not drag
   direction — so the start node (target handle) becomes the edge's `target` and the
   drop node (source handle) becomes the `source`. Inverted.
3. **True root cause**: two overlapping handles per side where the *target* is on
   top, so the drag starts from the wrong-typed handle. It is not a bug in
   `onConnect` (which faithfully stores `c.source`→`c.target`) nor in the router
   (issue-00012).

## Reproduction

React Flow's connect gesture is not simulable in unit tests (same limitation noted
for node drag in `e2e/editor.spec.ts` and the RF-drag memory), so this was
reproduced in a real browser: with left context `L` and right context `R`, a drag
from `L`'s right edge to `R`'s left edge stored `{ source: R, target: L }` — the
reverse of the gesture.

## Fix

`components/nodes/context-node.tsx`: render the **target** handle first and the
**source** handle last, so the source handle is on top and a drag starts from it →
the drag-start node becomes the edge's `source`. Both handle ids are unchanged, so
edge rendering / routing (issue-00012) is unaffected.

## Verification

**Resolved 2026-07-22.** Real-browser: drag `L`→`R` now stores
`{ source: L, target: R }` and the arrowhead points at `R` (Context 1 → Context 2).
Routing still correct (source's right side → target's left side). 216 unit + 40 e2e
green; tsc/lint/build clean.
