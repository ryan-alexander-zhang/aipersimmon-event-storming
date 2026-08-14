---
id: issue-00033-a-kept-subset-reserves-the-lanes-of-hidden-elements
type: issue
role: main
status: resolved
parent: issue-00032-a-walkthrough-step-leaves-its-slice-scattered
---

# A kept subset still reserves the lanes of the elements it hid

## Problem

Walking a board leaves a tall empty run inside a band: on a 49-event board the
Commands band measured ~620px of flow space while holding two commands, one at the
top and one six empty lanes below. Isolate on the same board is tight, so the two
modes read as inconsistent — reported as "为什么中间隔这么多…跟 isolate 好像不一致".

## Root Cause (first principles)

1. **Observed**: a band reserves height for lanes that hold nothing.
   **Expected**: a kept subset reclaims what its hidden elements vacated — the
   promise `computeIsolateLayout` already keeps on the column axis (issue-00021,
   "re-ranks the columns over the surviving events so the chain sits adjacent").
2. **Mechanism**: a node's sub-row inside its band **is** its event's concurrency
   lane ([`layout.ts`](../../web/lib/layout/layout.ts) `computeRows`):
   `sr = p.lane + stack`, and the band's height is `maxSubRow * STACK_H + BAND_H`.
   Lanes are dense over the *kept events* in a column, so Isolate never sees a gap:
   it drops the events, and their lanes go with them. A walkthrough deliberately
   keeps **every** event, so every lane is real — but the supporting elements of all
   but the Current Step are hidden, leaving their lanes empty in every supporting
   band while still paying for them.
3. **True root cause**: **the reclaim is dense on the column axis and absent on the
   lane axis.** Columns re-rank over the survivors; lanes do not. Nothing about the
   walkthrough is special here — Isolate has the same hole whenever it keeps an
   element belonging to a high lane, it is just rare to hit.

## Fix

`computeRows`, on the kept-subset path only (the flag that already collapses absent
bands): dense-rank the lanes each `(band, column)` actually occupies, preserving
their order. The Domain Events band is unaffected during a walkthrough — every lane
is occupied there, so the ranking is the identity and the timeline does not move.

**Trade-off, stated**: "this Command sits in lane 3" currently means "it belongs to
the fourth concurrent event of this column". Dense ranking keeps the relative order
but drops that absolute alignment, so membership reads from the edge rather than from
the row. Cross-band lane alignment is not readable in practice anyway — the bands in
between carry their own heights — and the compaction is what makes a step readable.

## Reproduction

unit `layout.test.ts` "a kept subset reclaims the lanes its hidden elements vacated
[issue-00033]": three concurrent Domain Events, each with its own Command; keep all
three events but only the third's Command. Before the fix that Command sits at
`2 * STACK_H` inside its band and pushes every band below it down by the same
amount; after, it sits at its band's top and the Domain Events band follows one
`BAND_H` below.

## Verification

- unit **284 passed** (`bun run test`): the reproduction was red on the reserved
  lane (`expected 140 to be +0`) and is green after. Every issue-00021 isolate test
  passes unchanged — columns, absent bands, and the chain's adjacency are untouched.
- e2e **71 passed, 1 failed** — the pre-existing `[issue-00028]` wheel-zoom budget.
  `tsc --noEmit`, lint clean.
- Measured live on a walkthrough: the Commands band now reports its events band one
  `BAND_H` (132px) below it on every step, i.e. exactly one lane tall, where before it
  paid for every lane its column held.

On the 49-event board this issue was reported from, the Commands band was
`7 * STACK_H + BAND_H = 622px` of flow space while holding two commands; it is now
`132px`. That is the ~490px of empty run in the screenshot.
