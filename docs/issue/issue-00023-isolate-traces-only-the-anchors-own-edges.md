---
id: issue-00023-isolate-traces-only-the-anchors-own-edges
type: issue
role: main
status: resolved
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Inside Isolate only the anchor's own edges trace on hover; the rest are inert lines

## Problem

In the Isolate view only the edges **incident to the anchor** respond to the
pointer. Every other edge of the neighbourhood — the hop-2 and deeper connections
that Isolate was opened to read — is drawn as a plain solid line that cannot be
hovered: no thickening, no glow, no relation label, no dimming of its
surroundings. On a depth-2 or depth-3 neighbourhood that is most of what is on
screen, so the one view built for tracing a chain is the view where the chain
cannot be traced.

## Context / Trigger

Reported from use: "why, after isolate, are only the clicked element's edges
hoverable and the others solid lines?" Confirmed in the code — the gate is a
scope test that predates Isolate.

## Root Cause (first principles)

1. **Observed**: hovering an edge that is inside the isolate view but not incident
   to the anchor produces no emphasis at all. **Expected**: any edge that is on
   screen in the isolate view traces on hover — everything rendered there is, by
   construction, inside the scope the modeller chose.
2. **Mechanism**: edge-hover emphasis is gated by `committed` / `activeHoveredEdgeId`
   ([`editor.tsx:330-340`](../../web/components/editor.tsx) before the fix):
   ```ts
   const committed = !!(focusedContext || selectedId);
   const activeHoveredEdgeId =
     candidateEdgeId && (!committed || focus.edgeIds.has(candidateEdgeId)) ? candidateEdgeId : null;
   ```
   While isolating, the anchor is selected, so `committed` is always true and the
   hover must pass `focus.edgeIds` — which is `computeFocus`'s **1-hop** incident
   set ([`focus.ts:103`](../../web/lib/store/focus.ts)), not the neighbourhood.
   `computeNeighborhood` (depth N) never feeds this gate.
3. **True root cause**: **two different sets are both called "the scope".** The
   committed-scope rule from [design-00003](../design/design-00003-board-readability-at-scale.md)
   §3 Tier A ("inside a committed scope, only edges *within that scope* trace on
   hover") was implemented against the 1-hop focus set, which is the right scope
   for a selection on the full board but strictly narrower than the isolate
   neighbourhood. Isolate then inherited a gate that contradicts its own purpose.
   - Ruled out: edge styling (relation colour/weight is applied to every edge
     alike), the isolate relayout of issue-00021 (positions are correct; the edges
     are simply inert), and `pointer-events` on the paths (the hover *is* received;
     the gate discards it).
   - Not part of this fix: the flow animation (marching ants) still marks the
     anchor's own edges only. That is the "you are here" cue, and animating a whole
     neighbourhood would trade one legibility problem for another.

## Reproduction (test-first)

`e2e/editor.spec.ts` (issue-00023), on `fixtures/model.json` at Design, isolating
**Order Placed** both directions at depth 2 → the view holds `e1`, `ag1`, `rm1`,
`c1`; `r3`/`r4` are the anchor's own edges and **`r2` (c1→ag1) is two hops out**:

- hovering `r2` must give it the `animated` emphasis class and dim `r3`'s path to
  `0.12`; leaving must restore both.
- Failed before the fix for exactly this reason — `r2` kept
  `"react-flow__edge react-flow__edge-relation nopan selectable"`, no `animated`.
  Passes after.

## Fix

One condition: while the isolate view is up, the committed scope **is** everything
rendered, so the 1-hop gate does not apply.

```ts
const committed = !!(focusedContext || selectedId) && !isoNodeIds;
```

`committed` moved below the `isoNodeIds` memo so it can read it. Behaviour outside
Isolate is untouched: a selection or a focused Bounded Context still restricts
tracing to its own scope (guarded by the pre-existing specs "a committed scope is
sticky vs node hover; only in-scope lines trace" and "hovering an edge isolates it
and dims the rest", both still green).

design-00003 §3 Tier A updated to say which set "the scope" means in the isolate
case.

## Verification

- Regression spec (issue-00023): fails before, passes after.
- Full suite after the fix: 4 consecutive runs, e2e **61 passed** each; unit
  **276 passed**; `tsc` and `lint` clean.
