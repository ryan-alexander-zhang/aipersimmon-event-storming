---
id: issue-00004-cross-column-vertical-edge-overlap
type: issue
role: main
status: resolved
parent: plan-00004-readability-tier-b-orthogonal
---

# A cross-column vertical edge overlaps a same-column edge (hover hits the wrong one)

## Problem

Two edges of the policy pattern `Arrived At Pickup → Auto-Start Policy → Start Trip`
render on the **same vertical line**. Hovering the `triggers` edge
(`Arrived At Pickup → Auto-Start Policy`) emphasises the *other* edge,
`invokes` (`Auto-Start Policy → Start Trip`): the hovered line is dimmed and the
edge behind it lights up. The two connections are indistinguishable and
edge-hover isolation (a81d6e0) points at the wrong one.

## Context / Trigger

Found by hovering the ride-hailing example (`examples/ride-hailing-event-storming.json`)
at the `Design` level. Reported as "issue-00003 didn't actually fix it". It is a
**gap in the issue-00003 corridor model**, exposed by a chain whose far endpoint
sits in a *different column*.

Confirmed in the running app (edge ids `e-trp-16` = triggers, `e-trp-17` = invokes):

- Node positions (top-left): `Arrived (1150,676)`, `Auto-Start (1150,948)` — same
  column; `Start Trip (1380,272)` — a different column.
- Both edges' vertical segments are drawn at screen `x=490`, overlapping over
  `y∈[296,356]`.
- Hovering `(490,325)` — visually on `e-trp-16` — makes `e-trp-17` emphasised
  (stroke 5px + glow, opacity 1) while `e-trp-16` dims (opacity 0.12).
- Both edges render with `getSmoothStepPath` rounded corners, i.e. `pathOffset===0`
  for both — the lane separation never fired.

## Root Cause (first principles)

1. **Observed**: two edges sharing the node `Auto-Start Policy` draw one on top of
   the other; the browser hit-tests the coincident interaction paths and reports
   the later-painted edge, so hover emphasises the wrong connection.
   **Expected**: edges whose drawn segments occupy the same column are separated
   into distinct lanes (issue-00003's promise).
2. **Mechanism**: `computeEdgeOffsets`
   ([`edge-spread.ts:41`](../../web/lib/layout/edge-spread.ts)) buckets a vertical
   edge into a "corridor" keyed by the **midpoint of the two endpoints' x**:
   `V:${round((s.x + t.x)/2)}`.
   - `triggers` (Arrived→Auto-Start): both endpoints `x=1150` → corridor `V:1150`.
   - `invokes` (Auto-Start→Start): endpoints `x=1150` and `x=1380` → corridor
     `V:1265`.
   They land in **different corridors**, are never compared, and both keep offset
   `0` — so both render collinear and coincide.
3. **True root cause**: the corridor key assumes a vertical edge runs down its
   *midpoint* column. That is false for a **cross-column** vertical edge:
   `getSmoothStepPath` runs the long vertical segment out of the **source handle**,
   i.e. in the **source's column** (here `x=1150` / screen `x=490`), and only jogs
   across to the target column near the far end. So `invokes` physically shares
   `Auto-Start`'s column with `triggers`, but the midpoint key (`1265`) files it
   into a phantom corridor that no real segment occupies. It is *not* the
   "hover isn't scoped to the selected node" problem — the two lines are literally
   drawn on the same pixels; no hover-scoping rule would separate them, and
   selecting the shared node `Auto-Start Policy` makes *both* edges "related" so it
   could not disambiguate either.

## Reproduction (test-first)

`web/lib/layout/edge-spread.test.ts` (issue-00004): a column with two vertical
edges joined at a shared node, where one edge's far endpoint is in a **different
column** so the current midpoint key splits them:

- `A(x=0, y=0)`, `B(x=0, y=200)` — same column; `C(x=400, y=-200)` — other column.
- Edge `A→B` (down, within the column) and `B→C` (up-and-across).
- Their drawn vertical runs both occupy column `x=0` and overlap over `y∈[0,200]`.

Assert the two overlapping edges get **distinct offsets** (they are separated).
Fails before the fix: `A→B` keys `V:0`, `B→C` keys `V:200` → different corridors →
each is alone in its corridor → both offset `0` (coincident).

## Fix (direction)

Key a vertical edge's corridor by the column its **vertical segment actually
occupies** — the source handle's column under the current top/bottom smoothstep
routing — instead of the endpoint midpoint (and symmetrically, key a horizontal
edge by its source row). Then `invokes` is grouped into `Auto-Start`'s column
alongside `triggers`, their intervals overlap, lane assignment gives them distinct
offsets, and `offsetOrthogonalPath` bows them apart so hover targets the line under
the cursor. Keep the interval-overlap / shorter-edge-keeps-centre rules unchanged;
within-column edges (`s.x === t.x`) are unaffected because source column already
equals the midpoint. The exact keying is settled by making the reproduction test
pass without regressing the issue-00003 cases.

## Verification

- Regression test `web/lib/layout/edge-spread.test.ts` (issue-00004): a same-column
  chain whose far endpoint is in another column — the two edges now get distinct
  offsets. Failed before the fix (`inv` offset `0`), passes after.
- Existing issue-00003 edge-spread tests stay green. `bun run test` 104 passed;
  `tsc`, lint, `build` clean.
- Live app (ride-hailing, `Design`): `invokes`' vertical run moved off `Auto-Start
  Policy`'s column (flow x≈1214 → x≈1236), no longer coincident with `triggers`;
  hovering `triggers` no longer emphasises `invokes`.

## Follow-up

A **second** edge overlapped `triggers` — `annotates` from the wide GPS-hotspot
node — separated by only ~8px because lane offsets were computed in node-top-left
space but rendered from node centres (a distinct root cause). Tracked and fixed in
[issue-00005](issue-00005-lane-offset-drift-node-width.md).
