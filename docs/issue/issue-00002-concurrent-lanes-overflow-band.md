---
id: issue-00002-concurrent-lanes-overflow-band
type: issue
role: main
status: resolved
parent: plan-00002-structured-board
---

# Concurrent-event lanes overflow their band and collide with the next band

## Problem

When a context has 3+ concurrent Domain Events (same `order`, stacked in
sub-lanes per [design-00002](../design/design-00002-structured-board.md) §9),
the stacked lanes extend past the Domain Events band and overlap the Policies
band below. Observed on the ride-hailing example: `Driver Accepted` /
`Driver Declined` / `Match Timed Out` overlap `Begin Pickup Policy`.

## Context / Trigger

Found after rebuilding `examples/ride-hailing-event-storming.json` to use genuine
concurrency (Dispatch has three concurrent outcomes at one timeline slot).

## Root Cause (first principles)

1. **Observed**: with 3 concurrent events, the lowest event sticky sits on top of
   the first Policy sticky. **Expected**: each band reserves enough vertical space
   for its concurrent lanes; bands never overlap.
2. **Mechanism**: `computeLayout` ([`layout.ts:137`](../../web/lib/layout/layout.ts))
   sets `y = row * BAND_H + (lane + stack) * STACK_H` with `BAND_H = 132`,
   `STACK_H = 70`. A band occupies a **fixed** `BAND_H` slot, but every extra lane
   adds `STACK_H`. Concretely the Domain Events band is row 3 (base y = 396) and
   the Policies band is row 4 (base y = 528); three lanes place events at
   396 / 466 / **536**, and 536 > 528, so lane 2 lands inside the Policies band.
3. **True root cause**: band height is a fixed constant independent of how many
   lanes a band actually uses. Overlap occurs whenever
   `(lanes − 1) · STACK_H + nodeHeight > BAND_H` — already true at 2 extra lanes
   (`2 · 70 = 140 > 132`). It is not a z-index, edge-routing, or example-data
   problem; the same collision happens for any 3+ concurrent events.

## Reproduction (test-first)

`web/lib/layout/layout.test.ts` — a case with three concurrent events (same
`order`), each triggering a policy, asserting the Domain Events band's lowest
node stays above the Policies band's top. Fails before the fix (the third lane's
`y` exceeds the policy band base).

## Fix

Make band heights **variable**: each band grows to fit its own maximum sub-lane
count, and band tops become cumulative.

- Per band `r`, `maxSubRow[r] = max(lane + stack)` over its nodes.
- `bandHeight[r] = maxSubRow[r] · STACK_H + BAND_H` (so an un-stacked band keeps
  `BAND_H`).
- `bandTop[r] = Σ bandHeight[0..r-1]`; node `y = bandTop[row] + (lane + stack) · STACK_H`.
- Export `computeBandTops` so `BoardChrome` positions the band rail at the same
  offsets instead of `i · BAND_H`.

Bands with no concurrency are unchanged (`bandTop[r] = r · BAND_H`).

## Verification

- Regression test `web/lib/layout/layout.test.ts` "grows the band so concurrent
  lanes do not overlap the next band (issue-00002)": failed before the fix
  (`expected 606 to be less than or equal to 528`), passes after.
- `bun run test` 86 passed; the existing "each type in its band (y = bandIndex *
  BAND_H)" test still passes (no-concurrency boards unchanged). `tsc`, `bun run
  lint` clean; 17 E2E passed.
- Visual: on the ride-hailing example the Dispatch band (Driver Accepted /
  Declined / Match Timed Out) and Billing band (Payment Captured / Failed) no
  longer overlap the Policies band; the band rail tracks the new band tops.
