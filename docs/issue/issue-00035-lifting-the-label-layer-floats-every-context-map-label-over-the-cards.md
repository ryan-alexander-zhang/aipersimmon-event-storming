---
id: issue-00035-lifting-the-label-layer-floats-every-context-map-label-over-the-cards
type: issue
role: main
status: resolved
parent: issue-00034-a-hovered-edges-label-is-swallowed-by-the-sticky-it-crosses
---

# Lifting the edge-label layer floats every Context Map label over the cards

## Problem

On the Context Map, relationship labels ("Published Language", "Supplier ▶ Customer")
started painting **over** the Bounded Context cards they cross, hiding the context's
name and classification — a label sat across the middle of the `Ledger` card and cut
its title in half. The board is unaffected, because there a label only exists while
its edge is emphasised.

## Context / Trigger

Reported from the Context Map with a 7-context model, as "edge text now has priority
over nodes — the layering is wrong". A regression of
[issue-00034](issue-00034-a-hovered-edges-label-is-swallowed-by-the-sticky-it-crosses.md),
introduced by its fix (`e536f99`), not by the Isolate work committed alongside it
(`b7a3903`, `5a2e8cf`), which touches no stacking.

## Root Cause (first principles)

1. **Observed**: a resting relationship label paints above the context card it
   crosses. **Expected**: only the label being interacted with rises above the cards;
   the rest stay under them.
2. **Mechanism**: issue-00034 lifted the whole layer —
   `.react-flow__edgelabel-renderer { z-index: 1001 }` in `globals.css`. Both surfaces
   render their labels through that one renderer, so the rule applies to every label
   that exists, not to the emphasised one.
3. **True root cause**: **the elevation was attached to the layer, while the thing that
   earns it is a single label.** That held only under the board's invariant "a label
   exists only while emphasised" (`relation-edge.tsx` renders none otherwise), and the
   Context Map breaks it by design: the label carries the type picker, which has to be
   readable at rest (`context-relation-edge.tsx`). A layer-wide rule cannot tell the two
   apart, so the board's exception became the Context Map's default.

## Reproduction

Regression spec `e2e/editor.spec.ts` (issue-00035) on the new
`fixtures/context-map-overlap.json`: three contexts in one grid row with a
relationship from the first to the third, so its label lands on the middle card.
`document.elementsFromPoint` at the label's centre must list the context node above the
label at rest, and the label above the node once the relationship is hovered.

- Before: label above the card at rest (the report), and the first assertion fails.
- After: card above the label at rest, label above the card on hover.

## Fix

Drop the layer rule and carry the lift on the label itself (`EDGE_LABEL_Z`, exported
from `edge-style.ts` so both surfaces share one value):

- `relation-edge.tsx` sets it on every label it renders — the board only renders
  emphasised ones, so its behaviour is exactly what issue-00034 delivered.
- `context-relation-edge.tsx` sets it only while the relationship is emphasised, so a
  resting label goes back under the cards and the hovered one still rises with its
  picker and delete reachable. The line stays hoverable where the label is covered, so
  the lift is always reachable.

A label's own `z-index` escapes the node layer because the renderer keeps
`z-index: auto` and creates no stacking context — verified by the issue-00034 spec,
which passes unchanged.

## Verification

- Regression spec (issue-00035) fails before the fix and passes after; the issue-00034
  spec passes unchanged.
- Live `examples/big.json` Context Map: all seven context names legible, no label over
  a card.
- Gates: e2e **73 passed**, unit **284 passed**, `tsc` and `lint` clean. The one failing
  e2e (`issue-00028` wheel-zoom render budget) fails identically without this change.
