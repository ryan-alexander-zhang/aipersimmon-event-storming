---
id: issue-00008-free-nodes-evacuate-past-placed
type: issue
role: main
status: resolved
parent: plan-00006-level-aware-grammar-and-creation
---

# Connecting one node shifts all free same-band nodes far to the right

## Problem

With several free (unconnected) Commands tiled together, connecting **one** of
them to a Domain Event makes **all** the Commands jump to the right, scattering the
band. The connected Command correctly aligns above its Event, but the other,
untouched Commands move too — and end up past every Event's column.

## Context / Trigger

Found after issue-00007. Reproduced (`createESStore`): three free Commands and
three Domain Events all start at columns `[0,1,2]`. Connecting `command0 → event2`
(`produces`) gives command columns `[2,3,4]` while events stay `[0,1,2]` — the
whole Command band moved right of the timeline.

## Root Cause (first principles)

1. **Observed**: connecting `command0 → event2` moves commands `[0,1,2] → [2,3,4]`;
   events stay `[0,1,2]`. **Expected**: `command0` aligns above `event2` (col 2)
   and the other two stay in the low columns `[0,1]`, so the band stays compact and
   aligned with the events.
2. **Mechanism**: `produces` makes step 2 place `command0` at its event's column
   (col 2) — correct. But step 4 free-tiling starts free nodes at
   `(max placed column in the (ctx, band)) + 1`
   ([`layout.ts`](../../web/lib/layout/layout.ts) step 4, the `freeBase`/`freeCol`
   maps). With one placed command at col 2, `freeBase = 2`, so the remaining free
   commands tile at cols 3 and 4 — even though cols 0 and 1 are empty.
3. **True root cause**: free nodes are placed **after the highest** placed column
   instead of filling the **lowest available** (unoccupied) columns. A single
   placed node at a high column evacuates the entire free set past it. This is a
   flaw in the issue-00007 fix (the `freeBase = max` start), not in the `produces`
   co-location, which is correct.

## Reproduction (test-first)

`web/lib/store/store.test.ts` (issue-00008): three free Commands + three Domain
Events (all at cols 0,1,2); connect `command0 → event2`; assert the three command
columns, as a set, equal the three event columns (both `{0,1,2}`). Fails before the
fix (commands are `{2,3,4}`), passes after.

## Fix (direction)

Gap-fill: for each `(context, band)`, collect the columns occupied by placed nodes,
then assign each free node the lowest column ≥ 0 not yet occupied or taken by an
earlier free node. Free nodes then fill the empty low columns (0,1,…) and only skip
columns a placed node holds, so an unrelated placed node no longer pushes them
right.

## Verification

- Regression test `web/lib/store/store.test.ts` (issue-00008): after connecting
  `command0 → event2`, the three command columns equal the three event columns as a
  set. Failed before the fix (commands `{2,3,4}` vs events `{0,1,2}`), passes after.
- Repro (`createESStore`): connecting `command0 → event2` now yields command columns
  `[2,0,1]` — `command0` aligns above `event2` (col 2), the other two fill the empty
  low columns `0,1` — instead of the old `[2,3,4]`.
- Gates: unit **113 passed**, e2e **24 passed**, `tsc` / lint clean.
- Live (Design): with three Commands over three Domain Events, connecting one
  Command keeps the band compact (all three in cols 0–2, aligned with the events);
  only the connected Command aligns above its Event. Confirmed by screenshot.

Note: the connected Command intentionally moves to sit above the Event it produces
(the `produces` spine); the bug was only the *other* free Commands being evacuated
rightward. Concurrency sub-lane stacking is unchanged.
