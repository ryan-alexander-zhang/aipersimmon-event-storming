---
id: issue-00018-deleting-a-hovered-edge-dims-every-edge
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Deleting an edge from its hover-revealed control leaves every remaining edge dimmed

## Problem

On the timeline board, deleting a relation edge via the delete control that appears
on hover (us-00025-AC-1.1) leaves the board in a state that edge-hover isolation is
never supposed to produce: **every remaining edge sits at the dim opacity (0.12)
with no edge emphasised**, while all nodes stay at full opacity. The board reads as
if its connections vanished. Moving the pointer away does not restore it.

## Context / trigger

Only the hover-revealed delete path triggers it (`X` on the edge label). It needs
the neutral state — no focused Bounded Context and no selected element — which is
the ordinary board state. Deleting the same edge by clicking it and pressing
`Delete` (us-00025-AC-4.1) is unaffected, because that path goes through
`selectedEdgeId`, which *is* cleared.

## Root cause (first principles)

1. **Observed**: after the hover-delete, all remaining edges render at
   `DIM_OPACITY` and none is emphasised. **Expected**: with the pointer no longer on
   any edge, no isolation is active and every edge renders at full opacity.
2. **Shared mechanism**: `components/editor.tsx:299-301` derives
   `candidateEdgeId = hoveredEdgeId ?? selectedEdgeId` and, in the neutral state,
   passes it through unchanged as `activeHoveredEdgeId`.
   `components/editor.tsx:416-420` then evaluates, per edge,
   `activeHoveredEdgeId ? (e.id === activeHoveredEdgeId ? "on" : "dim") :
   undefined`. An id that names **no surviving edge** therefore dims *every* edge
   and emphasises none. `components/editor.tsx:361-365` looks the same id up for the
   bright node set, finds nothing and returns `null`, so nodes stay bright — hence
   the mixed state: bright nodes, invisible connections.
3. **Two independent ways that id goes stale** — both confirmed by measurement, each
   sufficient on its own:
   - **`selectedEdgeId` (the one that makes it permanent).** The label is rendered
     through `EdgeLabelRenderer`, which portals its content out of the edge's SVG
     but keeps it inside this edge in the **React tree**. React events propagate up
     the React tree, not the DOM tree, so the delete button's click bubbles into
     React Flow's edge click → `components/editor.tsx:519`
     `onEdgeClick → setSelectedEdge(e.id)`. Target-phase handlers run first, so this
     fires **after** `removeEdge` has already cleared the selection:
     `selectedEdgeId` ends up naming the edge that was just deleted.
   - **`hoveredEdgeId`.** `components/edges/relation-edge.tsx:104` renders the delete
     control only while `emphasised`, and `relation-edge.tsx:100` clears the hover on
     the label's `onMouseLeave`. Clicking removes the edge, so the label
     **unmounts** — and React does not fire `mouseleave` on unmount, so that
     handler never runs. `lib/store/store.ts:462` `removeEdge` cleared
     `selectedEdgeId` but not `hoveredEdgeId`.
4. **True root cause**: a view-only edge id is allowed to outlive the edge it names,
   from two directions — an event escaping the label portal into edge selection, and
   a hover that no unmount can clear — while the render path treats "an id that
   matches nothing" as "something is hovered". It is not a styling bug (`DIM_OPACITY`
   and the emphasis rules are correct) and not a focus bug: with focus inactive,
   nodes measured 1.0 while edges measured 0.12, which rules out the
   `focusState === "off"` path entirely.

Ruling out the near-miss: fixing only `hoveredEdgeId` leaves the board dimmed
(`selectedEdgeId` still stale, and it never self-heals because clearing the hover
falls back to it); fixing only the propagation leaves it dimmed too (stale
`hoveredEdgeId`). Both were measured in isolation — see Verification.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` adds an issue-00018 regression test: load `model.json` at
Design level, hover edge `r1`, click its hover-revealed delete control, move the
pointer off every edge, then assert another edge (`r3`) is back at opacity `1` and
no edge carries the emphasised `animated` class. It failed on the unfixed board with
`unexpected value "0.12"`.

`web/lib/store/store.test.ts` adds the store-level guard: a removed edge must not
stay the hovered edge.

Measured before the fix, on the real board in Chromium:

```
BASELINE          nodes all 1        edges all 1
HOVERING r1       a1,c1=1 rest 0.15  r1=1, rest 0.12, animated=1   (correct isolation)
AFTER-DELETE      nodes all 1        r2..r6 all 0.12, animated=0   (expected all 1)
POINTER AWAY      nodes all 1        r2..r6 all 0.12, animated=0   (does not self-heal)
HOVERING r3       —                  r3=1, rest 0.12, animated=1   (hover still works)
LEAVING r3        —                  r2..r6 all 0.12, animated=0   (falls back to the
                                                                    stale selection)
```

That last pair is what identified `selectedEdgeId` as the second cause: clearing the
hover does not restore the board, because `candidateEdgeId` falls back to it.

## Fix

Both stale paths are closed:

- `components/edges/relation-edge.tsx`: `e.stopPropagation()` in the delete
  control's `onClick`, so the click cannot escape the label portal into React Flow's
  edge click and select the edge being removed.
- `lib/store/store.ts` `removeEdge`: clear `hoveredEdgeId` when it names the removed
  edge, symmetric with the existing `selectedEdgeId` clearing.

Both are transient view fields — no model change, and the delete behaviour itself is
untouched.

The Context Map's own hover isolation (added alongside in `b895f52`) is immune by a
third route: `components/context-map-canvas.tsx` resolves the hovered id to a live
relationship before isolating, so an id that matches nothing isolates nothing.

## Verification

**Resolved 2026-07-28.** Each fix was measured in isolation against the running
board, so neither is speculative:

| `stopPropagation` | `removeEdge` clears hover | issue-00018 e2e |
| --- | --- | --- |
| no | no | fails (0.12) |
| no | yes | fails (0.12) |
| yes | no | fails (0.12) |
| yes | yes | passes |

271 unit + 54 e2e green (up from 270 + 53: one store test, one e2e regression test);
lint and `tsc --noEmit` clean. The e2e runs in real Chromium, so the whole
hover→delete→leave interaction is confirmed end-to-end.
