---
id: issue-00036-a-tall-sticky-covers-the-sticky-stacked-below-it
type: issue
role: main
status: resolved
parent: issue-00002-concurrent-lanes-overflow-band
---

# A tall sticky covers the sticky stacked below it

## Problem

Hotspots attached to one slice overlap each other on the board: five hotspot
stickies in the Hot Spots band, each covering roughly a third of the one below it,
so only the last is fully readable. Reported as "hotspot 有重叠" with a screenshot of
the Payment slice.

## Context / Trigger

Hotspots are where it shows first because they are the tallest sticky: their labels
are questions ("Pre-charge notice required in the target markets?"), so the label
wraps to two or three lines, and they alone carry a second chip row (kind +
priority). Nothing about hotspots is special otherwise — the same overlap hits any
band whose cell holds more than one node with a wrapped label.

## Root Cause (first principles)

1. **Observed**: nodes sharing a cell are drawn 70px apart while rendering 91–111px
   tall, so each covers the next by 21–41px. **Expected**: nodes stacked in a cell
   sit clear of each other.
2. **Mechanism**: `computeRows` / `positioned`
   ([`layout.ts`](../../web/lib/layout/layout.ts)) place a cell's *n*-th node at
   `bandTop + (lane + stack) * STACK_H` — a **fixed pitch** of `STACK_H = 70`.
   Card height, however, is content-driven: `ElementNode`
   ([`element-node.tsx`](../../web/components/nodes/element-node.tsx)) is
   `px-3 py-2` around a header row, an unbounded `break-words` label, and (for a
   Hotspot) a chip row. Measured in flow space on the reproduction fixture: a
   one-line sticky is 54.3px, a one-line Hotspot with chips 71.1px, two lines 91.1px,
   three lines 111.1px. Every one of those but the first exceeds the pitch.
   Why hotspots all land in one cell: step 2 of `computePlacement` propagates an
   event's column **and lane** to its whole slice, and step 3 gives each Hotspot the
   column+lane of what it annotates — so every Hotspot on a slice shares one cell and
   stacks. That part is intended.
3. **True root cause**: **`STACK_H` is an assumed sticky height that nothing
   enforces.** The layout has treated it as the sticky's box since issue-00002 (whose
   guard, `layout.test.ts:165`, asserts `lowestEvent + STACK_H <= highestPolicy`), but
   the card was free to grow past it. It is not a z-index problem, not a hotspot-data
   problem, and not the cell-sharing rule of `computePlacement`: with a one-line label
   the same five hotspots stack cleanly.

## Fix

Make the assumption a contract, enforced at both ends:

- `ElementNode` clamps the label to two lines (`line-clamp-2`), which bounds the
  tallest sticky — a Hotspot with chips — at the measured 92px. The full text stays
  available on hover (`title`) and in the property panel.
- `STACK_H` 70 → 96: the pitch is now the ceiling plus a 4px gap, and its comment
  says so, so the next person changing either side sees the coupling.
- `SnapshotNode` (Compare view) clamps its label the same way, for the same reason.

**Trade-off, stated**: a label longer than two lines is now elided on the board
(`Charge Policy reads Payment-context facts —…`). Event Storming stickies are meant
to be short phrases, the full text is one hover away, and the alternative — deriving
each node's height from its label text so the layout could stack variable heights —
puts a text-metric estimate inside a layout that is otherwise an exact function of
the model. Every extra lane in every band also costs 26px more vertical space.

**Not fixed here**: a Compare-view diff card that carries *both* a renamed-from row
and diff chips can still exceed 96px; that path was not reported and clamping it
further would cut information the diff exists to show.
[`editor.tsx`](../../web/components/editor.tsx)'s `STICKY_H = 64` drop indicator is
likewise left alone — it sizes a drag affordance, not a sticky.

## Reproduction (test-first)

e2e `editor.spec.ts` "hotspots stacked on one slice never overlap each other
[issue-00036]", with fixture `e2e/fixtures/stacked-hotspots.json`: three hotspots
with wrapping question labels and kind/priority chips, annotating the command, the
aggregate, and the event of one slice — so all three share the slice's cell. The test
sorts the three rendered boxes by `top` and asserts each one's `bottom` is above the
next one's `top` (screen space, so it holds at any zoom).

Red before the fix: `expect(589.37).toBeLessThanOrEqual(568.54)` — a 21px overlap.
Green after.

## Verification

- e2e **91 passed, 1 failed** (`bunx playwright test`) — the failure is the
  pre-existing `[issue-00028]` wheel-zoom timing budget, confirmed to fail the same
  way on a clean tree (`git stash`) before this change.
- unit **323 passed** (`bun run test`), including every issue-00002 / issue-00033
  band and lane test, which are written in terms of `STACK_H` and so follow the new
  pitch. `tsc --noEmit` and lint clean.
- Measured live on the fixture: all three hotspot cards render 91.1px in flow space
  (the three-line one clamped down from 111.1px) at pitch 96 — `flowY` 924 / 1020 /
  1116 — so each has ~5px of daylight below it instead of a 21px overlap.
