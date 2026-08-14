---
id: record-00021-walkthrough-reading-scope-acceptance
type: record
role: main
status: active
parent: plan-00021-walkthrough-reading-scope
---

# Acceptance record: the walkthrough's own reading scope

Acceptance evidence for
[plan-00021](../plan/plan-00021-walkthrough-reading-scope.md), implementing
[us-00029](../us/us-00029-walkthrough-reading-scope.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md), and the fix for
[issue-00031](../issue/issue-00031-a-walkthrough-step-walks-off-the-isolated-board.md).
Verified 2026-08-13.

Coverage was cross-checked assertion-by-assertion in-session rather than by an
independent subagent (CLAUDE.md §7), because this session was instructed not to
spawn agents. Read the mapping below as self-reported.

## Gate results

- Unit: **283 passed** (`bun run test`, Vitest). `lib/**` change is confined to the
  `walk` slice of `store.ts`; no pure-core module changed.
- E2E: **71 passed, 1 failed** (`bun run test:e2e`, Playwright/chromium). The
  failure is the pre-existing `[issue-00028]` wheel-zoom budget — a hard 3 ms/render
  assertion measuring ~7 ms on this machine, which fails with these changes stashed.
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00029-AC-1.1 (whole timeline kept, only the current slice shown) | e2e "a walkthrough keeps the whole timeline and shows only the current slice": both Domain Events rendered; the current step's Command present, the other event's Command absent | pass |
| us-00029-AC-1.2 (columns do not move on a step) | same test: each event's flow-space x (its own `transform`, so the camera cannot flatter it) is identical before and after a step | pass |
| us-00029-AC-3.1 (current slice vivid, the retained spine dimmed) | same test: the upcoming event is dimmed by the `stickyDimmed` probe, the current step's Command is not | pass |
| us-00029-AC-4.1 (the scope widens what is shown) | same test: an Actor two hops from the current step is absent at scope 1 and present at scope 2 | pass |
| us-00029-AC-5.1 (Isolate is left, and unavailable while walking) | unit store.test.ts "starting a walkthrough leaves Isolate"; e2e: the Exit-Isolate chip disappears when Walk starts and the panel's Isolate control is not rendered | pass |
| us-00029-FR-4 (scope state, clamped, reset) | unit store.test.ts "carries its own reading scope, clamped": default 1, clamps at 0 and above `WALK_SCOPE_MAX`, survives a step, reset by `clear` | pass |

us-00028 and us-00014 still hold unchanged: the Step Ring, the pulse, the three
states, the ←/→ keys and the read-only contract all pass as before, now painting on
the retained spine.

## Read live

`fixtures/model.json`, walked to `Payment Authorized`: both events on the board with
`Order Placed` on the Visited fill and the current step ringed; the previous step's
Command and Read Model gone; the current step's `Payment Gateway` vivid one hop out.
Widening to 3 pulls in `Charge Payment` two hops further.

## Not covered / known

- The Reading Scope walks **relations**, not the Timeline. Two ordered neighbours
  with no relation between them never enter each other's scope at any setting, so
  widening does nothing on a board of unconnected events. Asserted explicitly in
  the e2e.
- Both of the following were reopened and settled by
  [issue-00032](../issue/issue-00032-a-walkthrough-step-leaves-its-slice-scattered.md),
  which corrected this plan's "filter in place, never relayout" decision:
  the scattered slice, the camera framing, and — as a byproduct of the relayout —
  the drag that could still reorder the timeline mid-walk.
