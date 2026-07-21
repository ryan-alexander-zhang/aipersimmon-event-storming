---
id: issue-00005-lane-offset-drift-node-width
type: issue
role: main
status: resolved
parent: plan-00004-readability-tier-b-orthogonal
---

# Lane offsets don't clear when a corridor's nodes differ in width

## Problem

Even after issue-00004 separated the cross-column `invokes` edge, two edges in
the same column still overlap: `triggers` (`Arrived At Pickup → Auto-Start Policy`)
and `annotates` (`GPS hotspot → Arrived At Pickup`). Their vertical runs sit only
~8px apart — inside React Flow's 20px edge hit-zone — so hovering `triggers` still
emphasises the wrong edge (now `annotates` instead of `invokes`).

## Context / Trigger

Found while verifying the issue-00004 fix on the ride-hailing example at `Design`.
Node positions/sizes in the running app: `Arrived (x=1150, w=131 → center 1215)`,
`Auto-Start (1150, w=128 → center 1214)`, `GPS hotspot (1150, w=200 → center 1250)`.
The three column edges get lanes `triggers=0`, `invokes=+26`, `annotates=−26`, yet
`triggers` renders at x≈1214.8 and `annotates` at x≈1206.8 — 8px, not 26px.

## Root Cause (first principles)

1. **Observed**: two edges assigned adjacent lanes (offset 0 and −26) end up ~8px
   apart on screen, not 26px. **Expected**: a lane offset of one `GAP` (26px)
   produces 26px of on-screen separation, clearing the hit-zone.
2. **Mechanism**: `computeEdgeOffsets`
   ([`edge-spread.ts`](../../web/lib/layout/edge-spread.ts)) reasons in the node's
   **top-left** coordinate (`node.position.x`) and returns a pure lane displacement.
   But edges render from node **centers**: React Flow attaches handles at
   `position.x + width/2`, and `offsetOrthogonalPath`
   ([`edge-path.ts:22`](../../web/lib/layout/edge-path.ts)) anchors the jogged run
   at `(sx + tx)/2 + offset` — the midpoint of the two endpoint **centers**. When a
   corridor's nodes have **different widths**, each edge's center-midpoint drifts by
   `width/2`, so the lane offset is added to a different baseline per edge.
   `annotates` connects to the wide GPS node (center 1250): its baseline midpoint is
   ~18px right of `triggers`', and its −26 lane cancels against that +18 drift →
   net ~8px.
3. **True root cause**: lane offsets are computed in **top-left space** but applied
   in **center space**, and they are relative to each edge's *own* center-midpoint
   rather than a **shared corridor centreline**. So "one lane = 26px apart" only
   holds when every node in the corridor has the same width. It is *not* the
   issue-00004 mis-filing (that is fixed and the edges are now correctly grouped);
   it is a coordinate-space mismatch amplified by variable node widths.

## Reproduction (test-first)

`web/lib/layout/edge-spread.test.ts` (issue-00005): a column with three overlapping
vertical edges where one edge's endpoint is a **wider** node, so its center-midpoint
drifts. Compute each edge's rendered vertical-run x as
`centerMidpoint + returnedOffset` (mirroring `offsetOrthogonalPath`) and assert all
three are pairwise `>= GAP` apart. Fails before the fix: the wide-node edge nets
~8px < GAP against the centred edge.

## Fix (direction)

Feed node **sizes** into `computeEdgeOffsets` (widths/heights are on
`node.measured` after React Flow measurement) and anchor every edge in a corridor to
one **shared centreline** — the center-midpoint of the lane-0 (shortest) edge —
returning `offset = referenceCentre + laneOffset − edgeCentreMidpoint`. Then
`offsetOrthogonalPath`'s `(sx+tx)/2 + offset` resolves to `referenceCentre +
laneOffset` for every edge, so adjacent lanes are exactly one `GAP` apart on screen
regardless of node width — and, because the interaction hit-zone width also scales
with zoom, the separation clears it at every zoom level. Corridor grouping still
keys on the column (source top-left x, issue-00004); only the offset magnitude
becomes size-aware. Uniform-width corridors are unchanged.

## Verification

- Regression test `web/lib/layout/edge-spread.test.ts` (issue-00005): a column with
  a wide node — the three edges' rendered vertical runs are asserted pairwise
  `>= GAP` apart. Failed before the fix (8.5px), passes after.
- All existing edge-spread tests (issue-00003/00004) stay green. `bun run test`
  104 passed; `tsc`, lint, `build` clean.
- Live app (ride-hailing, `Design`): the three column edges' vertical runs sit at
  flow x ≈ `1184` (`annotates`), `1210` (`triggers`), `1236` (`invokes`) — each one
  `GAP` (26px) apart. `document.elementsFromPoint` along that row resolves three
  clean, non-overlapping hit-bands, so hovering `triggers` emphasises `triggers`
  (confirmed: 5px stroke + glow). Visually the three render as distinct parallel
  lanes where they were coincident before.
