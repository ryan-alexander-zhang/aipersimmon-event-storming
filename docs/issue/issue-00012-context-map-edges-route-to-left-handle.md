---
id: issue-00012-context-map-edges-route-to-left-handle
type: issue
role: main
status: resolved
parent: spec-00004-strategic-subdomains-context-map
---

# Context Map relationship edges always leave and enter the left side

## Problem

On the Context Map (spec-00004 FR5 / us-00020), every relationship edge attaches to
the **left** side of both its source and target node, regardless of where the nodes
sit. A relationship to a node on the right leaves the source's left edge, loops
around, and enters the target's left edge — visually confusing (user screenshot).

## Context / trigger

Introduced with the Context Map surface (commit 243cebb). Reproduces whenever two
contexts are related and not stacked exactly vertically.

## Root cause (first principles)

1. **Observed**: edges connect left-handle → left-handle. **Expected**: an edge
   leaves the source on the side facing the target and enters the target on the
   side facing the source (as the timeline board's edges do).
2. **Mechanism**: `components/nodes/context-node.tsx` renders four sides
   `[left, right, top, bottom]`, each with a `source` **and** a `target` handle —
   the **left** pair is declared first. `components/context-map-canvas.tsx` builds
   each edge from a relationship with `{ id, source, target, type, markerEnd }` and
   **no `sourceHandle`/`targetHandle`**. When an edge omits the handle id, React
   Flow binds it to the node's *first* handle of the matching type — which is the
   left one. So both ends resolve to the left handle.
3. **True root cause**: the Context Map has **no geometry-based handle routing**.
   The timeline board solves the same problem in `editor.tsx` via `routeHandles`
   (`components/nodes/element-node.tsx`), picking a handle pair from the source/
   target positions. The map never ported that step. It is *not* a handle-count or
   a CSS bug — it is a missing routing computation.

## Reproduction (test-first)

`web/lib/layout/context-map.test.ts` asserts a pure router
`contextEdgeHandles(sourcePos, targetPos)` returns the geometry-correct handle pair
(e.g. target to the right → `s-right` / `t-left`). The function does not exist
before the fix, so the test fails (the map had no routing at all).

## Fix

- Add pure `contextEdgeHandles(a, b)` in `web/lib/layout/context-map.ts` (dominant
  axis → the facing handle pair; handle ids match `ContextNode`).
- `context-map-canvas.tsx`: build each edge's `sourceHandle`/`targetHandle` from the
  current node positions via `contextEdgeHandles`, recomputed as nodes move.
- `context-node.tsx`: give handles the ids the router returns
  (`s-left`/`t-left`/`s-right`/`t-right`/`s-top`/`t-top`/`s-bottom`/`t-bottom`).

While fixing, a **second, coupled defect** surfaced: the default grid pitch
(`COL_W=260`) was narrower than the nodes, so adjacent contexts nearly touched and
the on-edge label (type picker + delete) was crushed behind them — the delete `×`
landed *inside* the neighbouring node and could not be clicked. Widened the grid
(`COL_W=440`, `ROW_H=220`) so short-edge labels sit clear.

## Verification

**Resolved 2026-07-22.** `lib/layout/context-map.test.ts` (4 cases) green; 216 unit
+ 40 e2e green; tsc/lint/build clean. Real-browser confirmed: a right-ward
relationship now leaves the source's right side and enters the target's left side,
and the "Customer/Supplier" label + delete `×` sit clear of both nodes
(delete-button right edge 752 < target-node left 882).
