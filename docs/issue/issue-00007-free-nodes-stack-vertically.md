---
id: issue-00007-free-nodes-stack-vertically
type: issue
role: main
status: resolved
parent: plan-00006-level-aware-grammar-and-creation
---

# Free (unconnected) same-band elements stack vertically instead of tiling

## Problem

Adding several free elements of the same type from the palette — e.g. two or
three Actors — stacks them **vertically** in one column. Vertical stacking is the
board's *concurrency* signal (parallel Domain Events share a timeline slot and
fan out into sub-lanes). An Actor is not a concurrent concept, so free Actors
should sit **side by side** along their band, not on top of each other.

## Context / Trigger

Surfaced after plan-00006 added the element palette: the palette creates free
(Ungrouped, edge-less) nodes, which are common now, whereas before almost every
node entered the board already wired into an event's slice.

## Root Cause (first principles)

1. **Observed**: N free Actors get the same `x` (one column) and increasing `y`
   (stacked). **Expected**: distinct `x` (tiled along the band), shared `y`.
2. **Mechanism**: `computePlacement` step 4 sends every still-unplaced node to
   **column 0** of its context: `if (!place.has(n.id)) set(n.id, ctxOf(n.id), 0, 0)`
   ([`layout.ts:93-94`](../../web/lib/layout/layout.ts)). `computeRows` then keys a
   collision counter on `(band, column, lane)` and pushes each extra node into a
   higher `subRow` ([`layout.ts:139-143`](../../web/lib/layout/layout.ts)), i.e. it
   stacks them vertically. Domain Events escape this because step 1 gives them
   columns by timeline `order`; only non-event free nodes fall through to step 4.
3. **True root cause**: step 4 collapses all free nodes onto one slot, so the
   sub-lane stacking (whose meaning is *concurrency*) is applied to nodes that are
   merely unconnected. Free nodes have no timeline slot; they should tile
   horizontally in their band, not share a column.

## Reproduction (test-first)

`web/lib/store/store.test.ts` (issue-00007): add three free `actor` nodes and
assert three distinct `x` and one shared `y`. Fails before the fix (`Set(xs).size`
is 1, not 3 — all share column 0).

## Fix (direction)

In `computePlacement` step 4, tile free nodes horizontally: give each free node in
a `(context, band)` its own incrementing column (lane stays 0). The starting column
is computed **per (context, band)** — a free node only clears placed nodes in its
**own** band. This matters because bands are separate rows: a free Actor and a
placed Domain Event never overlap, so the Actor must tile from column 0 (above the
events), not be pushed past them. (A first cut used a per-*context* base across all
bands and wrongly shifted free Actors to the right of the events — see the second
regression test.) Same-band free nodes get distinct `x` and one shared `y`; placed
slices are untouched.

## Verification

- Regression test `web/lib/store/store.test.ts` (issue-00007): three free `actor`
  nodes get three distinct `x` and one shared `y`. Failed before the fix
  (`Set(xs).size` was 1), passes after.
- Regression test `web/lib/store/store.test.ts` (issue-00007): with two Domain
  Events on the board, two free Actors align to the events' columns (`actor.x ===
  event.x`), not shifted right. Failed against the per-context base (actor at col 2,
  x=460 vs event x=0), passes with the per-band base.
- `web/lib/layout/layout.test.ts`: the test that asserted the old stacking
  ("stacks unrelated same-type nodes…") is re-scoped to the corrected tiling
  ("tiles unrelated same-type free nodes side by side… [issue-00007]") — distinct
  `x`, shared `y`.
- Gates: unit **112 passed**, e2e **24 passed**, `tsc` / lint clean.
- Live (Big Picture): three Actors added from the palette sit side by side in the
  Actors/Systems band (one row), not stacked; and with two Domain Events present,
  two Actors align directly above the events (same columns). Confirmed by
  screenshots.

Concurrency stacking is unchanged: Domain Events sharing a timeline `order` still
fan into vertical sub-lanes (that path is step 1, not step 4).
