---
id: issue-00022-edge-baseline-count-does-not-retry
type: issue
role: main
status: resolved
parent: us-00025-delete-relation-edge
---

# Two edge-deletion e2e tests take their baseline with a non-retrying count()

## Problem

The two `us-00025` edge-deletion specs assert "one fewer edge than before" against a
baseline captured with `const before = await edges(page).count()`. `locator.count()`
resolves **once, without retrying** — unlike `expect(locator).toHaveCount(n)`, which
polls. Taken right after the model import, it can read a board that has rendered
only some of its edges, so `before` is too low and the later
`toHaveCount(before - 1)` fails against the correct final count.

Both specs are correct about the product; the flake is in the guard.

## Context / Trigger

Surfaced by [issue-00021](issue-00021-isolate-hides-without-relayout.md): adding
three Isolate specs raised the parallel load of the suite, and the two baselines
started losing the race. Observed failures (fresh production build on :3100):

- `editor.spec.ts:405` (delete control): `Expected: 3, Received: 5` — baseline read
  as 4 of the 6 edges.
- `editor.spec.ts:449` (click + Delete key): `Expected: 4, Received: 5` — baseline
  read as 5.

Each passes on its own (6/6 with `--repeat-each 6`) and fails in roughly one full
suite run in two, which is the signature of a load-dependent race, not a product
regression.

## Root Cause (first principles)

1. **Observed**: the assertion compares the post-delete count against a baseline
   that was never guaranteed to be the full edge set. **Expected**: the baseline is
   the board's complete edge count.
2. **Mechanism**: `count()` is a one-shot query. React Flow mounts edge paths after
   its nodes are measured, so between `setInputFiles` and the first `count()` the
   edge layer can legitimately be incomplete. Nothing in either spec waits for the
   edge set to be whole — the surrounding assertions are about *nodes* and about
   the deleted edge, both of which can be satisfied while an edge is still missing.
3. **True root cause**: the baseline is **read** rather than **asserted**. A value
   used in a later expectation must itself come from a retrying assertion (or be a
   known constant), otherwise the test encodes whatever the renderer happened to
   have finished.
   - Ruled out: the deletion path itself (the deleted edge always disappears, and
     `r1`'s endpoints always survive), and the Isolate changes of issue-00021 —
     they only added load; neither spec touches Isolate.

## Reproduction

A deterministic unit-level repro is not available (the race is in the browser's
render timing under parallel load), so the strongest available verification is used
instead, per `docs/issue/README.md`:

- Before: 2 failures across 3 consecutive full-suite runs, with the exact
  `Expected/Received` pairs above; both specs green in isolation.
- After: 4 consecutive full-suite runs, 61 passed, 0 failed.

## Fix

In both specs, make the baseline a stated constant and assert it with the retrying
matcher before using it:

```ts
const before = 6; // model.json at Design
await expect(edges(page)).toHaveCount(before);
```

Nothing else changed — no product code, no other assertion.

## Verification

- 4 consecutive `bun run test:e2e` runs: **61 passed** each (was 59–61 with 1–2
  failures in the same two specs).
- Unit **276 passed**, `tsc --noEmit` clean, `lint` clean.
