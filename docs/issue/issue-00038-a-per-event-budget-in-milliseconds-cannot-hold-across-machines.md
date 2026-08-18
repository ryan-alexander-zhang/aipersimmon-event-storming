---
id: issue-00038-a-per-event-budget-in-milliseconds-cannot-hold-across-machines
type: issue
role: main
status: resolved
parent: issue-00028-camera-and-hover-re-render-the-board-inside-a-committed-scope
---

# A per-event budget in milliseconds cannot hold across machines

## Problem

`a wheel zoom does not re-render the board on every tick [issue-00028]` fails on every
run: `expected 6.98 to be less than 3`. It has been failing throughout several unrelated
changes — every session reported it as "the pre-existing `[issue-00028]` failure" and
carried on, which is exactly how a guard stops being one.

## Context / Trigger

Reported as "fix failed" after it appeared in yet another full e2e run. It fails on a
clean tree, so no change caused it.

## Root Cause (first principles)

1. **Observed**: the guard asserts `avg < 3` ms of main-thread time per `wheel` event and
   measures ~7 ms here. **Expected**: the guard fails when the board re-renders on every
   tick, and passes otherwise.
2. **The property still holds.** Measured on this machine with the board's own
   `MutationObserver` counter: 20 wheel ticks mutate **0** node and **0** edge elements,
   and the fix at [`editor.tsx:332`](../../web/components/editor.tsx) — subscribing to the
   semantic-zoom *band* rather than the raw zoom — is intact. Nothing regressed.
3. **Two independent defects in the guard itself:**
   - **The wrong statistic.** Per-tick costs are skewed: over 20 ticks, median **4.4 ms**,
     mean **7.8 ms**, max **17 ms**. A few ticks share a frame with layout or GC and drag
     the mean far above what a wheel event costs. The mean was compared against a budget
     derived from a median-like figure.
   - **An absolute budget in a machine-dependent unit.** The numbers recorded in
     issue-00028 were 5.1 ms per tick before the fix and 1.8 ms after, on the machine it
     was written on. Here the same code measures 4.4 ms healthy, and with the regression
     deliberately reintroduced, 25 ms. **The pre-fix cost on the fast machine (5.1 ms) is
     lower than the post-fix cost on the slow one (4.4 ms is close, and other machines will
     be slower still).** No constant separates the two states everywhere, so the assertion
     was unfalsifiable-by-design: on some machines it can only fail.
4. **True root cause**: the guard measured **absolute cost** where the property is
   **relative** — "a wheel tick does not do work proportional to the board". Cost per event
   scales with the machine; the ratio between a board-touching event and a board-free one
   does not.

**Ruled out**: a counting guard instead of a timing one. A React re-render that produces
identical output mutates no DOM, so the `MutationObserver` counter reads 0 both with and
without the regression — verified by reintroducing it. Counting DOM mutations would have
been a guard that cannot fail, which is worse than one that always fails.

## Fix

`e2e/editor.spec.ts`:

- `eventCost` returns the **median** as well as the mean.
- The wheel guard normalises: it now also generates six `mousedown`/`mouseup` pairs inside
  the same trace — an event that touches no board state — and asserts
  `wheel.median / mousedown.median < 8`, plus a generous absolute floor (`< 15 ms`) in case
  the yardstick itself inflates. The yardstick is measured on the same machine, in the same
  run, under the same dev server, so it scales with everything the absolute budget could not.

## Reproduction (test-first)

The failing guard *is* the reproduction; what needed proving is that the rewritten one
still fails for the original reason. The issue-00028 regression was reintroduced at
`editor.tsx:332` (`useStore((s) => \`${s.transform[2]}|…\`)`, so the selector changes on
every tick) and the guard re-run:

| state | wheel median | mousedown median | ratio | guard |
| --- | --- | --- | --- | --- |
| fixed (4 runs) | 3.8 – 4.6 ms | 1.03 – 1.10 ms | ~4.1 | passes |
| regression reintroduced (2 runs) | 25.1 / 26.2 ms | 1.03 / 1.05 ms | ~21 – 24 | fails: `expected 21.2 to be less than 8` |

The old assertion under the same two states: 6.3 – 8.3 ms (fails) and 32 ms (fails) — it
could not tell them apart on this machine.

## Verification

- e2e **94 passed, 0 failed** (`bunx playwright test`) — the first clean full run in this
  work; both issue-00028 guards pass, and the wheel guard was confirmed to fail again with
  the regression reintroduced and to pass with it removed. One run in between failed on
  `Isolate stays visible with nothing selected and exits with Esc [design-00003]`, which
  passed alone and on the next full run — the same flake record-00023 observed; not touched
  here, and now the only known instability in the suite.
- unit **347 passed**, `tsc --noEmit` and lint clean.

## Noted, not fixed

The sibling guard `hover inside a committed scope costs nothing [issue-00028]` has the same
shape — an absolute `avg < 2` ms — and passes here, so it was left alone rather than
rewritten speculatively. It will need the same treatment the first time it fails on a slower
machine; the median is already available to it.
